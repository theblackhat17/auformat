// =========================================
// SYSTÈME D'AUTHENTIFICATION
// =========================================

const AuthSystem = {
  // ========== INSCRIPTION ==========
  async register(email, password, fullName, companyName = '') {
    try {
      // 1. Créer le compte utilisateur
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth-callback.html`,
          data: {
            full_name: fullName,
            company_name: companyName
          }
        }
      });

      if (error) throw error;

      // 2. Vérifier si confirmation email nécessaire
      if (data.user && !data.session) {
        return {
          success: true,
          requiresConfirmation: true,
          message: '✅ Inscription réussie ! Vérifiez votre email pour confirmer votre compte.'
        };
      }

      return {
        success: true,
        requiresConfirmation: false,
        message: '✅ Inscription réussie ! Vous pouvez maintenant vous connecter.',
        user: data.user
      };

    } catch (error) {
      console.error('Erreur inscription:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  },

  // ========== CONNEXION ==========
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      return {
        success: true,
        message: '✅ Connexion réussie !',
        user: data.user
      };

    } catch (error) {
      console.error('Erreur connexion:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  },

  // ========== DÉCONNEXION ==========
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return {
        success: true,
        message: '✅ Déconnexion réussie'
      };

    } catch (error) {
      console.error('Erreur déconnexion:', error);
      return {
        success: false,
        message: 'Erreur lors de la déconnexion'
      };
    }
  },

  // ========== RÉINITIALISATION MOT DE PASSE ==========
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
      });

      if (error) throw error;

      return {
        success: true,
        message: '✅ Email de réinitialisation envoyé ! Vérifiez votre boîte mail.'
      };

    } catch (error) {
      console.error('Erreur reset password:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  },

  // ========== MISE À JOUR PROFIL ==========
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: '✅ Profil mis à jour avec succès',
        profile: data
      };

    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour du profil'
      };
    }
  },

  // ========== GESTION DES ERREURS ==========
  getErrorMessage(error) {
    const errorMessages = {
      'Invalid login credentials': '❌ Email ou mot de passe incorrect',
      'User already registered': '❌ Cet email est déjà utilisé',
      'Email not confirmed': '❌ Veuillez confirmer votre email avant de vous connecter',
      'Password should be at least 6 characters': '❌ Le mot de passe doit contenir au moins 6 caractères',
      'Unable to validate email address': '❌ Format d\'email invalide',
      'Email rate limit exceeded': '❌ Trop de tentatives. Réessayez dans quelques minutes.',
      'Invalid email or password': '❌ Email ou mot de passe incorrect'
    };

    return errorMessages[error.message] || `❌ Erreur: ${error.message}`;
  },

  // ========== ÉTAT DE CONNEXION ==========
  async getAuthState() {
    const user = await AUTH.getCurrentUser();
    
    if (!user) {
      return {
        isAuthenticated: false,
        user: null,
        profile: null
      };
    }

    const profile = await AUTH.getProfile(user.id);

    return {
      isAuthenticated: true,
      user: user,
      profile: profile
    };
  },

  // ========== ÉCOUTER LES CHANGEMENTS D'AUTH ==========
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};

// =========================================
// MISE À JOUR HEADER AUTOMATIQUE
// =========================================
async function updateHeaderAuthState() {
  const authState = await AuthSystem.getAuthState();
  
  const loggedOut = document.getElementById('logged-out');
  const loggedIn = document.getElementById('logged-in');
  const userName = document.getElementById('user-name');

  if (!loggedOut || !loggedIn) return; // Si les éléments n'existent pas

  if (authState.isAuthenticated) {
    // Utilisateur connecté
    loggedOut.style.display = 'none';
    loggedIn.style.display = 'flex';
    
    if (userName && authState.profile) {
      const displayName = authState.profile.full_name || 
                         authState.profile.company_name || 
                         authState.user.email.split('@')[0];
      userName.textContent = `👤 ${displayName}`;
    }

    // Ajouter le bouton admin si c'est un admin
    if (authState.profile?.role === 'admin') {
      const adminBtn = document.getElementById('admin-btn');
      if (!adminBtn) {
        const btn = document.createElement('a');
        btn.id = 'admin-btn';
        btn.href = '/admin.html';
        btn.className = 'btn-admin';
        btn.textContent = '⚙️ Admin';
        loggedIn.insertBefore(btn, loggedIn.firstChild);
      }
    }

  } else {
    // Utilisateur non connecté
    loggedOut.style.display = 'flex';
    loggedIn.style.display = 'none';
  }
}

// =========================================
// GESTION BOUTON DÉCONNEXION
// =========================================
async function setupLogoutButton() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        const result = await AuthSystem.logout();
        
        if (result.success) {
          window.location.href = '/index.html';
        } else {
          alert(result.message);
        }
      }
    });
  }
}

// =========================================
// INITIALISATION AUTO
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderAuthState();
  setupLogoutButton();
});

// Écouter les changements d'authentification
AuthSystem.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    updateHeaderAuthState();
  } else if (event === 'SIGNED_OUT') {
    updateHeaderAuthState();
  }
});

// Export global
window.AuthSystem = AuthSystem;

console.log('✅ Système d\'authentification chargé');