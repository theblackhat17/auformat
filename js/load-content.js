
/**
 * Script pour charger dynamiquement le contenu depuis les fichiers générés par Netlify CMS
 * Fichier : js/load-content.js
 */

// ============================================
// CHARGEMENT DES RÉALISATIONS (Preview - 3 premières)
// ============================================
async function loadRealisationsPreview() {
    try {
        const response = await fetch('/api/realisations.json');
        const realisations = await response.json();

        const container = document.getElementById('realisations-preview');
        if (!container) return;

        // Trier par date (plus récent en premier)
        realisations.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filtrer uniquement les réalisations publiées
        const published = realisations.filter(r => r.published !== false);

        // Prendre seulement les 3 premières pour la page d'accueil
        const preview = published.slice(0, 3);

        // Générer le HTML
        container.innerHTML = preview.map(realisation => `
            <div class="realisation-card" data-category="${realisation.category}">
                <img src="${realisation.image}" 
                     alt="${realisation.title}" 
                     class="realisation-img"
                     loading="lazy">
                <div class="realisation-info">
                    <h3>${realisation.title}</h3>
                    <p>${realisation.description}</p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erreur lors du chargement des réalisations:', error);
        const container = document.getElementById('realisations-preview');
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <p>Les réalisations ne sont pas encore disponibles.</p>
                </div>
            `;
        }
    }
}

// ============================================
// CHARGEMENT DES AVIS (Preview - 3 premiers)
// ============================================
async function loadAvisPreview() {
    try {
        const response = await fetch('/api/avis.json');
        const avis = await response.json();

        const container = document.getElementById('avis-container');
        if (!container) return;

        // Trier par date (plus récent en premier)
        avis.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filtrer uniquement les avis publiés
        const published = avis.filter(a => a.published !== false);

        // Prendre seulement les 3 premiers pour la page d'accueil
        const preview = published.slice(0, 3);

        container.innerHTML = preview.map(avisItem => `
            <div class="avis-card">
                <div class="stars">${'★'.repeat(avisItem.rating || 5)}</div>
                <p class="avis-text">"${avisItem.testimonial}"</p>
                <p class="avis-auteur">— ${avisItem.name}, ${avisItem.location}</p>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erreur lors du chargement des avis:', error);
        const container = document.getElementById('avis-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <p>Les avis clients ne sont pas encore disponibles.</p>
                </div>
            `;
        }
    }
}

// ============================================
// CHARGEMENT DES PARAMÈTRES DE LA PAGE D'ACCUEIL
// ============================================
async function loadHomepageSettings() {
    try {
        const response = await fetch('/content/settings/homepage.json');
        const settings = await response.json();

        // Mettre à jour le titre hero si disponible
        const heroTitle = document.getElementById('hero-title');
        if (heroTitle && settings.heroTitle) {
            heroTitle.textContent = settings.heroTitle;
        }

        const heroSubtitle = document.getElementById('hero-subtitle');
        if (heroSubtitle && settings.heroSubtitle) {
            heroSubtitle.textContent = settings.heroSubtitle;
        }

        const ctaPrimary = document.getElementById('cta-primary');
        if (ctaPrimary && settings.ctaButton) {
            ctaPrimary.textContent = settings.ctaButton;
        }

        const ctaSecondary = document.getElementById('cta-secondary');
        if (ctaSecondary && settings.secondaryButton) {
            ctaSecondary.textContent = settings.secondaryButton;
        }

    } catch (error) {
        console.log('Paramètres homepage non trouvés, utilisation des valeurs par défaut');
    }
}