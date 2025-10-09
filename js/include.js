// =========================================
// SYSTÈME D'INCLUSION DE PARTIALS
// =========================================

async function includePartials() {
  // Attendre que le DOM soit complètement chargé
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  const includes = document.querySelectorAll('[data-include]');
  
  if (includes.length === 0) {
    console.warn('⚠️ Aucun élément [data-include] trouvé');
    return;
  }

  console.log(`📦 Chargement de ${includes.length} partial(s)...`);

  try {
    await Promise.all(
      Array.from(includes).map(async (element) => {
        const file = element.getAttribute('data-include');
        
        try {
          // ✅ CORRECTION : Utiliser le chemin tel quel (relatif à la page courante)
          const response = await fetch(file);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const content = await response.text();
          
          // Vérifier que l'élément a toujours un parent
          if (!element.parentNode) {
            console.warn(`⚠️ L'élément pour ${file} n'a plus de parent`);
            return;
          }
          
          // Remplacer l'élément par son contenu
          element.outerHTML = content;
          
          console.log(`✅ Partial chargé: ${file}`);
          
        } catch (error) {
          console.error(`❌ Erreur de chargement: ${file}`, error);
          // Garder l'élément vide plutôt que de le supprimer
          if (element.parentNode) {
            element.innerHTML = `<!-- Erreur: ${file} -->`;
          }
        }
      })
    );

    console.log('✅ Tous les partials chargés');
    
    // Déclencher un événement personnalisé quand les partials sont chargés
    document.dispatchEvent(new Event('partials-loaded'));
    
  } catch (error) {
    console.error('❌ Erreur globale includePartials:', error);
  }
}

// Lancer l'inclusion dès que possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', includePartials);
} else {
  includePartials();
}

console.log('✅ Système d\'inclusion chargé');