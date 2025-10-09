// /js/mes_projets.js
// =========================================
// GESTION DES PROJETS CLIENT
// =========================================

let currentProjectId = null;

// Attendre que AUTH soit disponible
(async function initProjects() {
  console.log('🎯 Initialisation mes_projets...');
  
  // Attendre AUTH
  let attempts = 0;
  while (!window.AUTH && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  if (!window.AUTH) {
    console.error('❌ AUTH non disponible après 5 secondes');
    document.getElementById('projects-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <div class="empty-title">Erreur de chargement</div>
        <div class="empty-desc">Impossible de charger le système d'authentification. Rechargez la page.</div>
      </div>
    `;
    return;
  }

  console.log('✅ AUTH disponible');

  // Vérifier que l'utilisateur est connecté
  const isAuth = await AUTH.requireAuth();
  if (!isAuth) return;

  await loadProjects();
})();

async function loadProjects() {
  try {
    const user = await AUTH.getCurrentUser();
    
    const { data: projects, error } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    displayProjects(projects || []);

  } catch (error) {
    console.error('Erreur chargement projets:', error);
    document.getElementById('projects-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <div class="empty-title">Erreur de chargement</div>
        <div class="empty-desc">${error.message}</div>
      </div>
    `;
  }
}

    function displayProjects(projects) {
      const container = document.getElementById('projects-container');

      if (projects.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📐</div>
            <div class="empty-title">Aucun projet</div>
            <div class="empty-desc">Commencez par créer votre premier meuble personnalisé avec notre configurateur 3D</div>
            <a href="/configurateur.html" class="btn btn-primary">
              🚀 Créer mon premier projet
            </a>
          </div>
        `;
        return;
      }

      container.innerHTML = projects.map(project => {
        const typeIcons = {
          meuble: '🪑',
          planche: '📏',
          custom: '🎨'
        };

        const typeLabels = {
          meuble: 'Meuble',
          planche: 'Planche',
          custom: 'Personnalisé'
        };

        const statusLabels = {
          draft: 'Brouillon',
          quote_requested: 'Devis demandé',
          quoted: 'Devis reçu',
          in_production: 'En production',
          completed: 'Terminé'
        };

        const updatedDate = new Date(project.updated_at).toLocaleDateString('fr-FR');
        const createdDate = new Date(project.created_at).toLocaleDateString('fr-FR');

        // Calculer les dimensions si disponibles
        let dimensions = '';
        if (project.config?.width && project.config?.height) {
          dimensions = `${project.config.width} × ${project.config.height} mm`;
        }

        return `
          <div class="project-card">
            <div class="project-thumbnail">
              ${project.thumbnail_url ? 
                `<img src="${project.thumbnail_url}" alt="${project.name}">` : 
                typeIcons[project.type] || '📦'
              }
              <span class="project-type-badge">${typeLabels[project.type] || project.type}</span>
            </div>

            <div class="project-content">
              <div class="project-header">
                <div class="project-name">${project.name}</div>
                <span class="project-status status-${project.status}">${statusLabels[project.status] || project.status}</span>
              </div>

              <div class="project-meta">
                <div class="project-meta-item">
                  📅 Créé le ${createdDate}
                </div>
                ${dimensions ? `
                  <div class="project-meta-item">
                    📐 ${dimensions}
                  </div>
                ` : ''}
              </div>

              ${project.notes ? `
                <div class="project-notes">${project.notes}</div>
              ` : ''}

              <div class="project-actions">
                <button class="btn btn-primary btn-small" onclick="openConfigurator('${project.id}')">
                  ✏️ Modifier
                </button>
                
                ${project.status === 'draft' ? `
                  <button class="btn btn-secondary btn-small" onclick="requestQuote('${project.id}', '${project.name}')">
                    💰 Demander un devis
                  </button>
                ` : ''}

                <button class="btn btn-danger btn-small" onclick="deleteProject('${project.id}', '${project.name}')">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function openConfigurator(projectId) {
      // Rediriger vers le configurateur avec l'ID du projet
      window.location.href = `/configurateur.html?project=${projectId}`;
    }

    function requestQuote(projectId, projectName) {
      currentProjectId = projectId;
      document.getElementById('quote-project-name').value = projectName;
      openModal('quote-modal');
    }

    document.getElementById('quote-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const message = document.getElementById('quote-message').value;

      try {
        const { error } = await supabaseClient
          .from('projects')
          .update({
            status: 'quote_requested',
            notes: message,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentProjectId);

        if (error) throw error;

        alert('✅ Demande de devis envoyée ! Nous vous répondrons dans les plus brefs délais.');
        closeModal('quote-modal');
        await loadProjects();

      } catch (error) {
        console.error('Erreur demande devis:', error);
        alert('❌ Erreur lors de l\'envoi de la demande');
      }
    });

    async function deleteProject(projectId, projectName) {
      if (!confirm(`Voulez-vous vraiment supprimer le projet "${projectName}" ?\n\nCette action est irréversible.`)) {
        return;
      }

      try {
        const { error } = await supabaseClient
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) throw error;

        alert('✅ Projet supprimé');
        await loadProjects();

      } catch (error) {
        console.error('Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression du projet');
      }
    }

    function openModal(modalId) {
      document.getElementById(modalId).classList.add('active');
    }

    function closeModal(modalId) {
      document.getElementById(modalId).classList.remove('active');
      currentProjectId = null;
    }

    // Fermer modal en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal.id);
        }
      });
    });