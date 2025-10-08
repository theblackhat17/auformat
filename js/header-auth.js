// =========================================
// GESTION DE L'AUTHENTIFICATION DANS LE HEADER
// =========================================
// À charger APRÈS auth.js

(async function initHeaderAuth() {
  
  // Attendre que AUTH soit disponible
  const waitForAuth = () => {
    return new Promise((resolve) => {
      const checkAuth = setInterval(() => {
        if (window.AUTH && window.AuthSystem) {
          clearInterval(checkAuth);
          resolve();
        }
      }, 100);
    });
  };

  await waitForAuth();

  // Fonction principale de mise à jour du header
  async function updateHeaderAuth() {
    try {
      const authState = await AuthSystem.getAuthState();
      
      const loggedOut = document.getElementById('logged-out');
      const loggedIn = document.getElementById('logged-in');

      if (!loggedOut || !loggedIn) {
        console.warn('Éléments auth non trouvés dans le header');
        return;
      }

      if (authState.isAuthenticated && authState.profile) {
        // UTILISATEUR CONNECTÉ
        showLoggedInState(authState);
      } else {
        // UTILISATEUR NON CONNECTÉ
        showLoggedOutState();
      }

    } catch (error) {
      console.error('Erreur mise à jour header auth:', error);
      showLoggedOutState();
    }
  }

  // Afficher l'état connecté
  function showLoggedInState(authState) {
    const { user, profile } = authState;

    // Masquer boutons login/register
    document.getElementById('logged-out').style.display = 'none';
    document.getElementById('logged-in').style.display = 'block';

    // Initiales pour l'avatar
    const initials = getInitials(profile);

    // Avatar dans le bouton
    const userAvatar = document.getElementById('user-avatar');
    const userInitials = document.getElementById('user-initials');
    
    if (profile.avatar_url) {
      userAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
    } else {
      userInitials.textContent = initials;
    }

    // Nom d'affichage
    const displayName = profile.full_name || 
                       profile.company_name || 
                       user.email.split('@')[0];
    
    document.getElementById('user-name-display').textContent = displayName;

    // Avatar dans le dropdown
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    const dropdownInitials = document.getElementById('dropdown-initials');
    
    if (profile.avatar_url) {
      dropdownAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
    } else {
      dropdownInitials.textContent = initials;
    }

    // Infos dans le dropdown
    document.getElementById('dropdown-user-name').textContent = 
      profile.full_name || 'Utilisateur';
    document.getElementById('dropdown-user-email').textContent = user.email;

    // Afficher le lien admin si nécessaire
    if (profile.role === 'admin') {
      const adminLink = document.getElementById('admin-link');
      if (adminLink) {
        adminLink.style.display = 'flex';
      }
    }
  }

  // Afficher l'état déconnecté
  function showLoggedOutState() {
    document.getElementById('logged-out').style.display = 'flex';
    document.getElementById('logged-in').style.display = 'none';
  }

  // Obtenir les initiales
  function getInitials(profile) {
    if (!profile) return '?';
    
    const name = profile.full_name || profile.email;
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Gérer la déconnexion
  function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
          const result = await AuthSystem.logout();
          
          if (result.success) {
            // Rediriger vers l'accueil
            window.location.href = '/';
          } else {
            alert('❌ Erreur lors de la déconnexion');
          }
        }
      });
    }
  }

  // Écouter les changements d'authentification
  if (window.AuthSystem) {
    AuthSystem.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        updateHeaderAuth();
      }
    });
  }

  // Initialisation
  await updateHeaderAuth();
  setupLogout();

  console.log('✅ Header auth initialisé');

})();