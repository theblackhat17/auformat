
    let revenueChart, quotesChart;

  // ✅ ATTENDRE QUE AUTH SOIT DISPONIBLE
  (async function checkAdminAccess() {
    console.log('🎯 Initialisation admin dashboard...');
    
    // Attendre que AUTH soit chargé
    let attempts = 0;
    while (!window.AUTH && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.AUTH) {
      console.error('❌ AUTH non disponible après 5 secondes');
      alert('❌ Erreur de chargement du système');
      window.location.href = '/';
      return;
    }

    console.log('✅ AUTH disponible, vérification admin...');

    // Vérifier que c'est un admin
    const isAdmin = await AUTH.requireAdmin();
    if (!isAdmin) return;

    console.log('✅ Admin vérifié, chargement dashboard...');

    await loadDashboardData();
    initCharts();
  })();

    // Charger les données du dashboard
    async function loadDashboardData() {
      try {
        // Récupérer les stats globales
        const { data: stats, error } = await supabaseClient
          .from('admin_dashboard_stats')
          .select('*')
          .single();

        if (error) throw error;

        // Mettre à jour les cartes de stats
        document.getElementById('stat-clients').textContent = stats.total_clients || 0;
        document.getElementById('stat-pending-quotes').textContent = stats.pending_quotes || 0;
        document.getElementById('stat-monthly-revenue').textContent = 
          new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.monthly_revenue || 0);
        document.getElementById('stat-active-projects').textContent = stats.active_projects || 0;
        document.getElementById('stat-total-orders').textContent = stats.total_orders || 0;

        // Mettre à jour le badge de devis en attente
        document.getElementById('pending-quotes-count').textContent = stats.pending_quotes || 0;

        // Charger l'activité récente
        await loadRecentActivity();

      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      }
    }

    // Charger l'activité récente
    async function loadRecentActivity() {
      try {
        const { data: logs, error } = await supabaseClient
          .from('activity_logs')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        const activityList = document.getElementById('activity-list');
        
        if (!logs || logs.length === 0) {
          activityList.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">Aucune activité récente</p>';
          return;
        }

        activityList.innerHTML = logs.map(log => {
          const iconClass = getActivityIconClass(log.action_type);
          const icon = getActivityIcon(log.action_type);
          const timeAgo = getTimeAgo(new Date(log.created_at));

          return `
            <div class="activity-item">
              <div class="activity-icon ${iconClass}">${icon}</div>
              <div class="activity-content">
                <div class="activity-title">${getActivityTitle(log)}</div>
                <div class="activity-desc">${getActivityDescription(log)}</div>
              </div>
              <div class="activity-time">${timeAgo}</div>
            </div>
          `;
        }).join('');

      } catch (error) {
        console.error('Erreur chargement activité:', error);
      }
    }

    // Helpers pour l'activité
    function getActivityIconClass(actionType) {
      if (actionType.includes('client')) return 'new-client';
      if (actionType.includes('quote')) return 'new-quote';
      if (actionType.includes('order')) return 'order';
      return 'new-client';
    }

    function getActivityIcon(actionType) {
      const icons = {
        'create_client': '👤',
        'update_client': '✏️',
        'create_quote': '📄',
        'update_quote': '📝',
        'accept_order': '✅',
        'export': '📊'
      };
      return icons[actionType] || '📋';
    }

    function getActivityTitle(log) {
      const actions = {
        'create_client': 'Nouveau client',
        'update_client': 'Client modifié',
        'create_quote': 'Devis créé',
        'update_quote': 'Devis mis à jour',
        'accept_order': 'Commande acceptée',
        'export': 'Export de données'
      };
      return actions[log.action_type] || 'Action';
    }

    function getActivityDescription(log) {
      if (log.details) {
        return log.details.description || 'Aucune description';
      }
      return `${log.target_type} - ${log.action_type}`;
    }

    function getTimeAgo(date) {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      return `Il y a ${diffDays}j`;
    }

    // Initialiser les graphiques
    function initCharts() {
      initRevenueChart();
      initQuotesChart();
    }

    // Graphique du chiffre d'affaires
    function initRevenueChart() {
      const ctx = document.getElementById('revenueChart').getContext('2d');
      
      revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
          datasets: [{
            label: 'Chiffre d\'affaires (€)',
            data: [12500, 15800, 14200, 18900],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => value.toLocaleString() + ' €'
              }
            }
          }
        }
      });
    }

    // Graphique des statuts de devis
    function initQuotesChart() {
      const ctx = document.getElementById('quotesChart').getContext('2d');
      
      quotesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['En attente', 'Acceptés', 'Refusés', 'En production'],
          datasets: [{
            data: [15, 42, 8, 35],
            backgroundColor: [
              '#f59e0b',
              '#10b981',
              '#ef4444',
              '#3b82f6'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }

    // Actualiser le dashboard
    async function refreshDashboard() {
      await loadDashboardData();
      alert('✅ Dashboard actualisé');
    }

    // Export de données
    function exportData() {
      alert('🚧 Fonctionnalité d\'export en cours de développement');
    }

    // Mettre à jour le graphique de revenus
    function updateRevenueChart() {
      const period = document.getElementById('revenue-period').value;
      // TODO: Charger les vraies données selon la période
      alert(`Chargement des données pour ${period} jours`);
    }