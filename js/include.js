// =========================================
// GESTION DU DROPDOWN ET MENU MOBILE
// =========================================

function initHeaderInteractions() {
  console.log('🎯 Initialisation interactions header...');
  
  const menuButton = document.getElementById('user-menu-button');
  const dropdown = document.getElementById('user-dropdown');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');

  // Dropdown menu utilisateur
  if (menuButton && dropdown) {
    console.log('✅ Dropdown menu trouvé');
    
    menuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🖱️ Click sur user-menu-button');
      menuButton.classList.toggle('active');
      dropdown.classList.toggle('active');
    });

    // Fermer le dropdown en cliquant ailleurs
    document.addEventListener('click', () => {
      menuButton.classList.remove('active');
      dropdown.classList.remove('active');
    });

    // Empêcher la fermeture quand on clique dans le dropdown
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  } else {
    console.warn('⚠️ Dropdown menu non trouvé');
    console.log('menuButton:', menuButton);
    console.log('dropdown:', dropdown);
  }

  // Menu burger mobile
  if (mobileToggle && navLinks) {
    console.log('✅ Menu mobile trouvé');
    
    mobileToggle.addEventListener('click', () => {
      console.log('🖱️ Click sur mobile toggle');
      mobileToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
  } else {
    console.warn('⚠️ Menu mobile non trouvé');
  }
}

// Attendre que les partials soient chargés
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Attendre l'événement partials-loaded
    document.addEventListener('partials-loaded', initHeaderInteractions);
  });
} else {
  // Si le DOM est déjà chargé, attendre partials-loaded
  document.addEventListener('partials-loaded', initHeaderInteractions);
}

console.log('✅ Script header.js chargé');