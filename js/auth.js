// =========================================
// SYSTÈME D'AUTHENTIFICATION
// =========================================

const AuthSystem = {
  // ========== INSCRIPTION ==========
  async register(email, password, fullName, companyName = '', phone = '') {
    try {
      // 1. Créer le compte utilisateur
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth-callback.html`,
          data: {
            full_name: fullName,
            company_name: companyName,
            phone: phone
          }
        }
      });

      if (error) throw error;

      // ✅ LOGGER L'INSCRIPTION
      if (window.ActivityLogger && data.user) {
        await window.ActivityLogger.log('register', 'auth', data.user.id, {
          description: `Nouvelle inscription: ${email}`
        });
      }

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
      
      // ✅ LOGGER L'ERREUR
      if (window.ActivityLogger) {
        await window.ActivityLogger.logError('register', error.message);
      }
      
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

      // Vérifier que la session est bien créée
      if (!data.session) {
        throw new Error('Aucune session créée après connexion');
      }

      console.log('✅ Connexion réussie, session créée:', data.session.user.id);

      // ✅ LOGGER LA CONNEXION
      if (window.ActivityLogger) {
        await window.ActivityLogger.logLogin();
      }

      return {
        success: true,
        message: '✅ Connexion réussie !',
        user: data.user,
        session: data.session
      };

    } catch (error) {
      console.error('Erreur connexion:', error);
      
      // ✅ LOGGER L'ERREUR
      if (window.ActivityLogger) {
        await window.ActivityLogger.logError('login', error.message);
      }
      
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  },

  // ========== DÉCONNEXION ==========
  async logout() {
    try {
      // ✅ LOGGER LA DÉCONNEXION (avant de se déconnecter)
      if (window.ActivityLogger) {
        await window.ActivityLogger.logLogout();
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log('✅ Déconnexion réussie');

      return {
        success: true,
        message: '✅ Déconnexion réussie'
      };

    } catch (error) {
      console.error('Erreur déconnexion:', error);
      
      // ✅ LOGGER L'ERREUR
      if (window.ActivityLogger) {
        await window.ActivityLogger.logError('logout', error.message);
      }
      
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

      // ✅ LOGGER LA DEMANDE DE RESET
      if (window.ActivityLogger) {
        await window.ActivityLogger.log('reset_password_request', 'auth', null, {
          description: `Demande de réinitialisation pour: ${email}`
        });
      }

      return {
        success: true,
        message: '✅ Email de réinitialisation envoyé ! Vérifiez votre boîte mail.'
      };

    } catch (error) {
      console.error('Erreur reset password:', error);
      
      // ✅ LOGGER L'ERREUR
      if (window.ActivityLogger) {
        await window.ActivityLogger.logError('reset_password', error.message);
      }
      
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

      // ✅ LOGGER LA MISE À JOUR DU PROFIL
      if (window.ActivityLogger) {
        await window.ActivityLogger.log('update_profile', 'user', userId, {
          description: 'Modification du profil utilisateur'
        });
      }

      return {
        success: true,
        message: '✅ Profil mis à jour avec succès',
        profile: data
      };

    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      
      // ✅ LOGGER L'ERREUR
      if (window.ActivityLogger) {
        await window.ActivityLogger.logError('update_profile', error.message);
      }
      
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
    try {
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
    } catch (error) {
      console.error('Erreur getAuthState:', error);
      return {
        isAuthenticated: false,
        user: null,
        profile: null
      };
    }
  },

  // ========== ÉCOUTER LES CHANGEMENTS D'AUTH ==========
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.id);
      callback(event, session);
    });
  }
};

// =========================================
// MISE À JOUR HEADER AUTOMATIQUE
// =========================================
async function updateHeaderAuthState() {
  try {
    const authState = await AuthSystem.getAuthState();
    
    const loggedOut = document.getElementById('logged-out');
    const loggedIn = document.getElementById('logged-in');
    const userName = document.getElementById('user-name-display');

    if (!loggedOut || !loggedIn) {
      console.warn('Éléments header auth non trouvés');
      return;
    }

    if (authState.isAuthenticated && authState.profile) {
      // Utilisateur connecté
      loggedOut.style.display = 'none';
      loggedIn.style.display = 'flex';
      
      if (userName) {
        const displayName = authState.profile.full_name || 
                           authState.profile.company_name || 
                           authState.user.email.split('@')[0];
        userName.textContent = displayName;
      }

      // Ajouter le bouton admin si c'est un admin
      if (authState.profile?.role === 'admin') {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
          adminLink.style.display = 'flex';
        }
      }

      console.log('✅ Header mis à jour - Utilisateur connecté');

    } else {
      // Utilisateur non connecté
      loggedOut.style.display = 'flex';
      loggedIn.style.display = 'none';
      
      console.log('ℹ️ Header mis à jour - Utilisateur non connecté');
    }
  } catch (error) {
    console.error('Erreur updateHeaderAuthState:', error);
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
  console.log('🚀 Initialisation AuthSystem...');
  
  // Attendre un peu que le header soit chargé
  setTimeout(() => {
    updateHeaderAuthState();
    setupLogoutButton();
  }, 500);
});

// Écouter les changements d'authentification
AuthSystem.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('✅ Utilisateur connecté');
    setTimeout(updateHeaderAuthState, 300);
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 Utilisateur déconnecté');
    setTimeout(updateHeaderAuthState, 300);
  }
});

// Export global
window.AuthSystem = AuthSystem;

console.log('✅ Système d\'authentification chargé');