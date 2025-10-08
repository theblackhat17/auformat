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
// CHARGEMENT DE TOUTES LES RÉALISATIONS (pour realisations.html)
// ============================================
async function loadAllRealisations() {
    try {
        const response = await fetch('/api/realisations.json');
        const realisations = await response.json();

        const container = document.getElementById('realisations-grid');
        if (!container) return;

        // Trier par date (plus récent en premier)
        realisations.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filtrer uniquement les réalisations publiées
        const published = realisations.filter(r => r.published !== false);

        // Générer le HTML pour toutes les réalisations
        container.innerHTML = published.map(realisation => `
            <div class="realisation-card" data-category="${realisation.category}">
                <img src="${realisation.image}" 
                     alt="${realisation.title}" 
                     class="realisation-img"
                     loading="lazy">
                <div class="realisation-info">
                    <span class="category-tag">${getCategoryLabel(realisation.category)}</span>
                    <h3>${realisation.title}</h3>
                    <p>${realisation.description}</p>
                    ${realisation.duration ? `<p class="meta">⏱️ ${realisation.duration}</p>` : ''}
                    ${realisation.material ? `<p class="meta">🌳 ${realisation.material}</p>` : ''}
                </div>
            </div>
        `).join('');

        // Créer les filtres par catégorie
        createCategoryFilters(published);

    } catch (error) {
        console.error('Erreur lors du chargement des réalisations:', error);
        const container = document.getElementById('realisations-grid');
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
                ${avisItem.projectType ? `<p class="project-type">${avisItem.projectType}</p>` : ''}
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
// CHARGEMENT DE TOUS LES AVIS (pour avis.html)
// ============================================
async function loadAllAvis() {
    try {
        const response = await fetch('/api/avis.json');
        const avis = await response.json();

        const container = document.getElementById('avis-grid');
        if (!container) return;

        // Trier par date (plus récent en premier)
        avis.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filtrer uniquement les avis publiés
        const published = avis.filter(a => a.published !== false);

        container.innerHTML = published.map(avisItem => `
            <div class="avis-card">
                <div class="avis-header">
                    <div class="stars">${'★'.repeat(avisItem.rating || 5)}</div>
                    ${avisItem.verified ? '<span class="verified">✓ Vérifié</span>' : ''}
                </div>
                <p class="avis-text">"${avisItem.testimonial}"</p>
                <div class="avis-footer">
                    <p class="avis-auteur"><strong>${avisItem.name}</strong></p>
                    <p class="avis-details">${avisItem.location} • ${avisItem.projectType}</p>
                    <p class="avis-type">${avisItem.clientType || 'Particulier'}</p>
                </div>
            </div>
        `).join('');

        // Afficher les statistiques
        displayAvisStats(published);

    } catch (error) {
        console.error('Erreur lors du chargement des avis:', error);
        const container = document.getElementById('avis-grid');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Les avis clients ne sont pas encore disponibles.</p>
                </div>
            `;
        }
    }
}

// ============================================
// CHARGEMENT DES MATÉRIAUX (pour materiaux.html)
// ============================================
async function loadAllMateriaux() {
    try {
        const response = await fetch('/api/materiaux.json');
        const materiaux = await response.json();

        const container = document.getElementById('materiaux-grid');
        if (!container) return;

        // Filtrer uniquement les matériaux publiés
        const published = materiaux.filter(m => m.published !== false);

        // Grouper par catégorie
        const grouped = groupByCategory(published);

        // Générer le HTML par catégorie
        container.innerHTML = Object.entries(grouped).map(([category, items]) => `
            <div class="category-section">
                <h3 class="category-title">${getCategoryTitle(category)}</h3>
                <div class="materiaux-list">
                    ${items.map(materiau => `
                        <div class="materiau-card">
                            <img src="${materiau.image}" 
                                 alt="${materiau.name}" 
                                 class="materiau-img"
                                 loading="lazy">
                            <div class="materiau-info">
                                <h4>${materiau.name}</h4>
                                ${materiau.latinName ? `<p class="latin-name"><em>${materiau.latinName}</em></p>` : ''}
                                <span class="materiau-tag">${materiau.tag}</span>
                                <p class="materiau-description">${materiau.description}</p>
                                <div class="materiau-specs">
                                    <div class="spec">
                                        <span class="spec-label">Dureté:</span>
                                        <span class="spec-bar">${'█'.repeat(materiau.hardness || 3)}${'░'.repeat(5 - (materiau.hardness || 3))}</span>
                                    </div>
                                    <div class="spec">
                                        <span class="spec-label">Stabilité:</span>
                                        <span class="spec-bar">${'█'.repeat(materiau.stability || 3)}${'░'.repeat(5 - (materiau.stability || 3))}</span>
                                    </div>
                                </div>
                                <p class="materiau-origin">📍 ${materiau.origin}</p>
                                <p class="materiau-color">🎨 ${materiau.color}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erreur lors du chargement des matériaux:', error);
        const container = document.getElementById('materiaux-grid');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Les matériaux ne sont pas encore disponibles.</p>
                </div>
            `;
        }
    }
}

// ============================================
// CHARGEMENT DE L'ÉQUIPE (pour about.html)
// ============================================
async function loadEquipe() {
    try {
        const response = await fetch('/api/equipe.json');
        const equipe = await response.json();

        const container = document.getElementById('equipe-grid');
        if (!container) return;

        // Filtrer uniquement les membres publiés et trier par ordre
        const published = equipe
            .filter(m => m.published !== false)
            .sort((a, b) => (a.order || 99) - (b.order || 99));

        container.innerHTML = published.map(membre => `
            <div class="membre-card">
                <img src="${membre.photo}" 
                     alt="${membre.name}" 
                     class="membre-photo"
                     loading="lazy">
                <div class="membre-info">
                    <h3>${membre.name}</h3>
                    <p class="membre-role">${membre.role}</p>
                    <p class="membre-description">${membre.description}</p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erreur lors du chargement de l\'équipe:', error);
        const container = document.getElementById('equipe-grid');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Les informations de l'équipe ne sont pas encore disponibles.</p>
                </div>
            `;
        }
    }
}

// ============================================
// CHARGEMENT DES PARAMÈTRES GÉNÉRAUX (pour contact.html, footer, etc.)
// ============================================
async function loadGeneralSettings() {
    try {
        const response = await fetch('/api/settings/general.json');
        const settings = await response.json();

        // Mettre à jour les infos de contact
        updateContactInfo(settings);

        return settings;

    } catch (error) {
        console.log('Paramètres généraux non trouvés, utilisation des valeurs par défaut');
        return null;
    }
}

// ============================================
// CHARGEMENT DES PARAMÈTRES DE LA PAGE D'ACCUEIL
// ============================================
async function loadHomepageSettings() {
    try {
        const response = await fetch('/api/settings/homepage.json');
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

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

// Obtenir le label de catégorie en français
function getCategoryLabel(category) {
    const labels = {
        'cuisines': '🍳 Cuisines',
        'dressings': '👔 Dressings',
        'bibliotheques': '📚 Bibliothèques',
        'commerces': '🏢 Commerces',
        'escaliers': '🪜 Escaliers',
        'exterieurs': '🚪 Extérieurs'
    };
    return labels[category] || category;
}

// Créer les filtres de catégories
function createCategoryFilters(realisations) {
    const filterContainer = document.getElementById('category-filters');
    if (!filterContainer) return;

    // Obtenir les catégories uniques
    const categories = [...new Set(realisations.map(r => r.category))];

    filterContainer.innerHTML = `
        <button class="filter-btn active" data-category="all">Tous</button>
        ${categories.map(cat => `
            <button class="filter-btn" data-category="${cat}">
                ${getCategoryLabel(cat)}
            </button>
        `).join('')}
    `;

    // Ajouter les événements de filtrage
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Retirer la classe active de tous les boutons
            filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filtrer les réalisations
            const category = btn.dataset.category;
            const cards = document.querySelectorAll('.realisation-card');
            
            cards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Grouper les matériaux par catégorie
function groupByCategory(materiaux) {
    return materiaux.reduce((acc, materiau) => {
        const cat = materiau.category || 'autres';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(materiau);
        return acc;
    }, {});
}

// Obtenir le titre de catégorie de matériaux
function getCategoryTitle(category) {
    const titles = {
        'nobles': '💎 Bois Nobles',
        'locaux': '🇫🇷 Bois Locaux',
        'exotiques': '🌴 Bois Exotiques',
        'exterieurs': '🚪 Bois pour Extérieurs'
    };
    return titles[category] || category;
}

// Afficher les statistiques des avis
function displayAvisStats(avis) {
    const statsContainer = document.getElementById('avis-stats');
    if (!statsContainer) return;

    const totalAvis = avis.length;
    const avgRating = (avis.reduce((sum, a) => sum + (a.rating || 5), 0) / totalAvis).toFixed(1);
    const verified = avis.filter(a => a.verified).length;

    statsContainer.innerHTML = `
        <div class="stat">
            <span class="stat-number">${totalAvis}</span>
            <span class="stat-label">Avis clients</span>
        </div>
        <div class="stat">
            <span class="stat-number">${avgRating}/5</span>
            <span class="stat-label">Note moyenne</span>
        </div>
        <div class="stat">
            <span class="stat-number">${verified}</span>
            <span class="stat-label">Avis vérifiés</span>
        </div>
    `;
}

// Mettre à jour les infos de contact
function updateContactInfo(settings) {
    // Téléphone
    const phoneElements = document.querySelectorAll('[data-contact="phone"]');
    phoneElements.forEach(el => {
        if (settings.phone) el.textContent = settings.phone;
    });

    // Email
    const emailElements = document.querySelectorAll('[data-contact="email"]');
    emailElements.forEach(el => {
        if (settings.email) el.textContent = settings.email;
    });

    // Adresse
    const addressElements = document.querySelectorAll('[data-contact="address"]');
    addressElements.forEach(el => {
        if (settings.address) {
            el.textContent = `${settings.address}, ${settings.zipcode} ${settings.city}`;
        }
    });

    // Horaires
    const hoursElements = document.querySelectorAll('[data-contact="hours"]');
    hoursElements.forEach(el => {
        if (settings.hours) {
            el.innerHTML = `
                <p>Lundi - Vendredi: ${settings.hours.weekdays || '8h - 18h'}</p>
                <p>Samedi: ${settings.hours.saturday || '9h - 12h'}</p>
                <p>Dimanche: ${settings.hours.sunday || 'Fermé'}</p>
            `;
        }
    });

    // Réseaux sociaux
    if (settings.instagram) {
        const instaLinks = document.querySelectorAll('[data-social="instagram"]');
        instaLinks.forEach(link => link.href = settings.instagram);
    }

    if (settings.facebook) {
        const fbLinks = document.querySelectorAll('[data-social="facebook"]');
        fbLinks.forEach(link => link.href = settings.facebook);
    }
}