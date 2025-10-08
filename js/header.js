  // Toggle dropdown menu
  document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('user-menu-button');
    const dropdown = document.getElementById('user-dropdown');
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuButton && dropdown) {
      menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuButton.classList.toggle('active');
        dropdown.classList.toggle('active');
      });

      // Fermer le dropdown en cliquant ailleurs
      document.addEventListener('click', () => {
        menuButton.classList.remove('active');
        dropdown.classList.remove('active');
      });

      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Menu mobile
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
      });
    }
  });