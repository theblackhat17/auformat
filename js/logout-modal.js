// =========================================
// SYSTÈME DE MODALE DE DÉCONNEXION
// =========================================

class LogoutModal {
  constructor() {
    this.overlay = null;
    this.init();
  }

  init() {
    // Créer la structure HTML de la modale
    this.createModal();
  }

  createModal() {
    // Créer l'overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'logout-modal-overlay';
    this.overlay.id = 'logout-modal-overlay';
    
    this.overlay.innerHTML = `
      <div class="logout-modal">
        <div class="logout-modal-icon">
          👋
        </div>
        <h2 class="logout-modal-title">Se déconnecter ?</h2>
        <p class="logout-modal-message">
          Vous êtes sur le point de vous déconnecter de votre compte. 
          Vous pourrez vous reconnecter à tout moment.
        </p>
        <div class="logout-modal-actions">
          <button class="logout-modal-btn logout-modal-btn-cancel" id="logout-cancel-btn">
            Annuler
          </button>
          <button class="logout-modal-btn logout-modal-btn-confirm" id="logout-confirm-btn">
            Se déconnecter
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Événements
    this.setupEvents();
  }

  setupEvents() {
    // Fermer au clic sur l'overlay
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Bouton annuler
    document.getElementById('logout-cancel-btn').addEventListener('click', () => {
      this.close();
    });

    // Bouton confirmer
    document.getElementById('logout-confirm-btn').addEventListener('click', () => {
      this.confirm();
    });

    // Échap pour fermer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
        this.close();
      }
    });
  }

  open() {
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  async confirm() {
    const confirmBtn = document.getElementById('logout-confirm-btn');
    
    // Animation de chargement
    confirmBtn.classList.add('loading');
    confirmBtn.textContent = 'Déconnexion...';

    try {
      // Appeler la fonction de déconnexion
      const result = await AuthSystem.logout();

      if (result.success) {
        // Fermer la modale
        this.close();
        
        // Afficher l'animation de succès
        this.showSuccess();

        // Rediriger après 1.5 secondes
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Erreur déconnexion:', error);
      
      // Retirer le chargement
      confirmBtn.classList.remove('loading');
      confirmBtn.textContent = 'Se déconnecter';
      
      // Afficher l'erreur
      alert('❌ ' + (error.message || 'Erreur lors de la déconnexion'));
    }
  }

  showSuccess() {
    const successDiv = document.createElement('div');
    successDiv.className = 'logout-success';
    successDiv.innerHTML = `
      <div class="logout-success-icon">✓</div>
      <h3 class="logout-success-title">À bientôt !</h3>
      <p class="logout-success-message">Vous avez été déconnecté avec succès</p>
    `;

    document.body.appendChild(successDiv);

    // Animer l'apparition
    setTimeout(() => {
      successDiv.classList.add('active');
    }, 100);

    // Retirer après la redirection
    setTimeout(() => {
      successDiv.remove();
    }, 2000);
  }
}

// Créer une instance globale
window.LogoutModal = new LogoutModal();

console.log('✅ Logout Modal chargé');