    let clientId = null;
    let clientData = null;

    (async function() {
      // Vérifier admin
      let attempts = 0;
      while (!window.AUTH && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.AUTH) {
        alert('❌ Erreur système');
        return;
      }

      const isAdmin = await AUTH.requireAdmin();
      if (!isAdmin) return;

      // Récupérer l'ID du client depuis l'URL
      const urlParams = new URLSearchParams(window.location.search);
      clientId = urlParams.get('id');

      if (!clientId) {
        alert('❌ ID client manquant');
        window.location.href = '/admin-clients.html';
        return;
      }

      await loadClientData();
    })();

    async function loadClientData() {
      try {
        // Récupérer les données du client
        const { data: client, error } = await supabaseClient
          .from('admin_client_stats')
          .select('*')
          .eq('id', clientId)
          .single();

        if (error) throw error;

        clientData = client;
        displayClientHeader(client);
        displayClientInfo(client);
        await loadProjects();
        await loadQuotes();
        await loadHistory();

      } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur de chargement : ' + error.message);
        window.location.href = '/admin-clients.html';
      }
    }

    function displayClientHeader(client) {
      const initials = getInitials(client.full_name || client.email);
      const lastLogin = client.last_login ? timeAgo(client.last_login) : 'Jamais connecté';
      const memberSince = new Date(client.created_at).toLocaleDateString('fr-FR');

      document.getElementById('client-header').innerHTML = `
        <div class="client-header-content">
          <div class="client-profile">
            <div class="client-avatar-large">${initials}</div>
            <div class="client-info-main">
              <div class="client-name-large">${client.full_name || 'Sans nom'}</div>
              ${client.company_name ? `<div style="font-size: 16px; color: #64748b;">🏢 ${client.company_name}</div>` : ''}
              <div class="client-meta">
                <div class="client-meta-item">📧 ${client.email}</div>
                ${client.phone ? `<div class="client-meta-item">📱 ${client.phone}</div>` : ''}
                <div class="client-meta-item">📅 Client depuis ${memberSince}</div>
                <div class="client-meta-item">🕐 Dernière connexion: ${lastLogin}</div>
              </div>
            </div>
          </div>
          <div class="client-actions-header">
            <button class="btn btn-secondary" onclick="openEditModal()">
              ✏️ Modifier
            </button>
            <button class="btn btn-primary" onclick="createQuoteForClient()">
              💰 Nouveau devis
            </button>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-item-inline">
            <div class="stat-value-inline">${client.total_projects}</div>
            <div class="stat-label-inline">Projets</div>
          </div>
          <div class="stat-item-inline">
            <div class="stat-value-inline">${client.total_quotes}</div>
            <div class="stat-label-inline">Devis</div>
          </div>
          <div class="stat-item-inline">
            <div class="stat-value-inline">${client.accepted_quotes}</div>
            <div class="stat-label-inline">Commandes</div>
          </div>
          <div class="stat-item-inline">
            <div class="stat-value-inline">${formatPrice(client.total_revenue)}</div>
            <div class="stat-label-inline">CA Total</div>
          </div>
          <div class="stat-item-inline">
            <div class="stat-value-inline">${client.total_logins}</div>
            <div class="stat-label-inline">Connexions</div>
          </div>
          <div class="stat-item-inline">
            <div class="stat-value-inline">${client.discount_rate || 0}%</div>
            <div class="stat-label-inline">Remise</div>
          </div>
        </div>
      `;
    }

    function displayClientInfo(client) {
      document.getElementById('client-info').innerHTML = `
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${client.email}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Téléphone</div>
          <div class="info-value">${client.phone || 'Non renseigné'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Entreprise</div>
          <div class="info-value">${client.company_name || 'Non renseigné'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Adresse</div>
          <div class="info-value">${client.address || 'Non renseigné'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Remise accordée</div>
          <div class="info-value">${client.discount_rate || 0}%</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date d'inscription</div>
          <div class="info-value">${new Date(client.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
      `;

      document.getElementById('client-stats-detail').innerHTML = `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Projets en brouillon</div>
            <div class="info-value">${client.draft_projects}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Devis demandés</div>
            <div class="info-value">${client.quote_requested_projects || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Devis acceptés</div>
            <div class="info-value">${client.accepted_quotes}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Taux de conversion</div>
            <div class="info-value">${client.total_quotes > 0 ? Math.round((client.accepted_quotes / client.total_quotes) * 100) : 0}%</div>
          </div>
        </div>
      `;
    }

    async function loadProjects() {
      try {
        const { data: projects, error } = await supabaseClient
          .from('projects')
          .select('*')
          .eq('user_id', clientId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('projects-list');

        if (!projects || projects.length === 0) {
          container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Aucun projet</p>';
          return;
        }

        container.innerHTML = projects.map(project => {
          const statusLabels = {
            draft: 'Brouillon',
            quote_requested: 'Devis demandé',
            quoted: 'Devis reçu',
            in_production: 'En production',
            completed: 'Terminé'
          };

          const typeLabels = {
            meuble: 'Meuble',
            planche: 'Planche',
            custom: 'Personnalisé'
          };

          return `
            <div class="project-card">
              <div class="project-header">
                <div class="project-title">${project.name}</div>
                <span class="badge badge-info">${statusLabels[project.status]}</span>
              </div>
              <div class="project-meta-grid">
                <div class="project-meta-item">
                  <div>Type</div>
                  <div class="project-meta-value">${typeLabels[project.type] || project.type}</div>
                </div>
                <div class="project-meta-item">
                  <div>Créé le</div>
                  <div class="project-meta-value">${new Date(project.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                ${project.config?.width ? `
                  <div class="project-meta-item">
                    <div>Dimensions</div>
                    <div class="project-meta-value">${project.config.width} × ${project.config.height} mm</div>
                  </div>
                ` : ''}
              </div>
              ${project.notes ? `<div style="margin-top: 12px; color: #64748b; font-size: 13px;">${project.notes}</div>` : ''}
            </div>
          `;
        }).join('');

      } catch (error) {
        console.error('Erreur projets:', error);
      }
    }

    async function loadQuotes() {
      try {
        const { data: quotes, error } = await supabaseClient
          .from('quotes')
          .select('*')
          .eq('user_id', clientId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('quotes-list');

        if (!quotes || quotes.length === 0) {
          container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Aucun devis</p>';
          return;
        }

        container.innerHTML = quotes.map(quote => {
          const statusLabels = {
            draft: 'Brouillon',
            sent: 'Envoyé',
            viewed: 'Consulté',
            accepted: 'Accepté',
            refused: 'Refusé'
          };

          const statusColors = {
            draft: 'badge-info',
            sent: 'badge-warning',
            viewed: 'badge-warning',
            accepted: 'badge-success',
            refused: 'badge-danger'
          };

          return `
            <div class="quote-card-detail">
              <div class="project-header">
                <div>
                  <div class="project-title">${quote.quote_number}</div>
                  <div style="color: #64748b; font-size: 14px; margin-top: 4px;">${quote.title}</div>
                </div>
                <span class="badge ${statusColors[quote.status]}">${statusLabels[quote.status]}</span>
              </div>
              <div class="project-meta-grid">
                <div class="project-meta-item">
                  <div>Date</div>
                  <div class="project-meta-value">${new Date(quote.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <div class="project-meta-item">
                  <div>Montant TTC</div>
                  <div class="project-meta-value" style="color: #059669;">${formatPrice(quote.total_ttc)}</div>
                </div>
                ${quote.sent_at ? `
                  <div class="project-meta-item">
                    <div>Envoyé le</div>
                    <div class="project-meta-value">${new Date(quote.sent_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');

      } catch (error) {
        console.error('Erreur devis:', error);
      }
    }

    async function loadHistory() {
      try {
        const { data: sessions, error } = await supabaseClient
          .from('user_sessions')
          .select('*')
          .eq('user_id', clientId)
          .order('login_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const container = document.getElementById('history-timeline');

        if (!sessions || sessions.length === 0) {
          container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Aucun historique</p>';
          return;
        }

        container.innerHTML = sessions.map(session => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-title">🔐 Connexion</div>
              <div class="timeline-desc">
                ${session.ip_address ? `IP: ${session.ip_address}` : 'Adresse IP inconnue'}
              </div>
              <div class="timeline-date">${new Date(session.login_at).toLocaleString('fr-FR')}</div>
            </div>
          </div>
        `).join('');

      } catch (error) {
        console.error('Erreur historique:', error);
      }
    }

    function switchContentTab(tab) {
      document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      event.target.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
    }

    function openEditModal() {
      document.getElementById('edit-fullname').value = clientData.full_name || '';
      document.getElementById('edit-company').value = clientData.company_name || '';
      document.getElementById('edit-phone').value = clientData.phone || '';
      document.getElementById('edit-address').value = clientData.address || '';
      document.getElementById('edit-discount').value = clientData.discount_rate || 0;

      document.getElementById('edit-modal').classList.add('active');
    }

    function closeEditModal() {
      document.getElementById('edit-modal').classList.remove('active');
    }

    document.getElementById('edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        const { error } = await supabaseClient
          .from('profiles')
          .update({
            full_name: document.getElementById('edit-fullname').value,
            company_name: document.getElementById('edit-company').value,
            phone: document.getElementById('edit-phone').value,
            address: document.getElementById('edit-address').value,
            discount_rate: parseFloat(document.getElementById('edit-discount').value) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);

        if (error) throw error;

        alert('✅ Client mis à jour !');
        closeEditModal();
        await loadClientData();

      } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur : ' + error.message);
      }
    });

    function createQuoteForClient() {
      window.location.href = `/admin-quotes.html?action=new&client=${clientId}`;
    }

    function getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    function formatPrice(price) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(price);
    }

    function timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        if (seconds < 60) return 'À l\'instant';
        if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)}j`;
        
        return new Date(date).toLocaleDateString('fr-FR');
        }

        // Fermer modal en cliquant à l'extérieur
        document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') {
            closeEditModal();
        }
        });