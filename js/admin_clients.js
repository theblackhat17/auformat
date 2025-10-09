    let allClients = [];

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

      await loadClients();
    })();

    async function loadClients() {
      try {
        const { data: clients, error } = await supabaseClient
          .from('admin_client_stats')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        allClients = clients || [];
        displayClients(allClients);
        updateStats(allClients);

      } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('clients-container').innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <div class="empty-title">Erreur</div>
            <p>${error.message}</p>
          </div>
        `;
      }
    }

    function displayClients(clients) {
      const container = document.getElementById('clients-container');

      if (clients.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <div class="empty-title">Aucun client</div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="clients-table">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Projets</th>
                <th>Devis</th>
                <th>CA</th>
                <th>Dernière connexion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(client => {
                const initials = getInitials(client.full_name || client.email);
                const lastLogin = client.last_login ? timeAgo(client.last_login) : 'Jamais';
                const revenue = formatPrice(client.total_revenue);

                return `
                  <tr>
                    <td>
                      <div class="client-info">
                        <div class="client-avatar">${initials}</div>
                        <div class="client-details">
                          <div class="client-name">${client.full_name || 'Sans nom'}</div>
                          ${client.company_name ? `<div class="client-email">🏢 ${client.company_name}</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style="font-size: 13px;">
                        <div>📧 ${client.email}</div>
                        ${client.phone ? `<div>📱 ${client.phone}</div>` : ''}
                      </div>
                    </td>
                    <td>
                      <div class="stat-mini">
                        <span class="badge badge-info">${client.total_projects}</span>
                      </div>
                    </td>
                    <td>
                      <div class="stat-mini">
                        <span class="badge badge-warning">${client.total_quotes}</span>
                      </div>
                    </td>
                    <td>
                      <div class="revenue">${revenue}</div>
                    </td>
                    <td>
                      <div class="time-ago">${lastLogin}</div>
                      <div style="font-size: 11px; color: #94a3b8;">${client.total_logins} connexions</div>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <a href="/admin_client-detail.html?id=${client.id}" class="btn btn-primary btn-small">
                          👁️ Voir
                        </a>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    function updateStats(clients) {
      document.getElementById('total-clients').textContent = clients.length;
      
      const totalRevenue = clients.reduce((sum, c) => sum + parseFloat(c.total_revenue || 0), 0);
      document.getElementById('total-revenue').textContent = formatPrice(totalRevenue);
      
      const activeProjects = clients.reduce((sum, c) => sum + parseInt(c.total_projects || 0), 0);
      document.getElementById('active-projects').textContent = activeProjects;
      
      const pendingQuotes = clients.reduce((sum, c) => sum + parseInt(c.total_quotes || 0), 0);
      document.getElementById('pending-quotes').textContent = pendingQuotes;
    }

    // Recherche
    document.getElementById('search-input').addEventListener('input', (e) => {
      const search = e.target.value.toLowerCase();
      const filtered = allClients.filter(c => 
        c.full_name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.company_name?.toLowerCase().includes(search)
      );
      displayClients(filtered);
    });

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
      if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)}min`;
      if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
      if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)}j`;
      
      return new Date(date).toLocaleDateString('fr-FR');
    }