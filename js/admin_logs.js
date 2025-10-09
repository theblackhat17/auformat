let currentPage = 1;
const logsPerPage = 50;
let allLogs = [];
let filteredLogs = [];

// ✅ ATTENDRE QUE AUTH SOIT DISPONIBLE
(async function checkAdminAccess() {
  console.log('🎯 Initialisation admin logs...');
  
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

  console.log('✅ Admin vérifié, chargement logs...');

  await init();
})();

// Initialisation
async function init() {
  await loadStats();
  await loadUsers();
  await loadLogs();
  
  // Recherche en temps réel
  document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 300));
}

// Charger les statistiques
async function loadStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Logs aujourd'hui
    const { count: todayCount } = await supabaseClient
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    document.getElementById('logs-today').textContent = todayCount || 0;

    // Utilisateurs actifs
    const { data: activeUsers } = await supabaseClient
      .from('activity_logs')
      .select('user_id')
      .gte('created_at', today.toISOString());

    const uniqueUsers = new Set(activeUsers?.map(log => log.user_id) || []);
    document.getElementById('active-users').textContent = uniqueUsers.size;

    // Taux de succès
    const { data: allActions } = await supabaseClient
      .from('activity_logs')
      .select('success')
      .gte('created_at', today.toISOString());

    const successCount = allActions?.filter(log => log.success !== false).length || 0;
    const total = allActions?.length || 1;
    const successRate = Math.round((successCount / total) * 100);
    document.getElementById('success-rate').textContent = successRate + '%';

    // Erreurs
    const errorCount = total - successCount;
    document.getElementById('error-count').textContent = errorCount;

  } catch (error) {
    console.error('Erreur chargement stats:', error);
  }
}

// Charger la liste des utilisateurs pour le filtre
async function loadUsers() {
  try {
    const { data: users } = await supabaseClient
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');

    const userFilter = document.getElementById('user-filter');
    
    users?.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.full_name || user.email;
      userFilter.appendChild(option);
    });

  } catch (error) {
    console.error('Erreur chargement utilisateurs:', error);
  }
}

// Charger les logs
// Charger les logs
async function loadLogs() {
  try {
    const { data: logs, error } = await supabaseClient
      .from('activity_logs')
      .select(`
        *,
        profiles!activity_logs_user_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Erreur Supabase:', error);
      throw error;
    }

    allLogs = logs || [];
    
    console.log(`✅ ${allLogs.length} logs chargés`);
    
    applyFilters();

  } catch (error) {
    console.error('Erreur chargement logs:', error);
    document.getElementById('logs-tbody').innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">
          ❌ Erreur de chargement des logs
          <br><small>${error.message || 'Erreur inconnue'}</small>
        </td>
      </tr>
    `;
  }
}

// Appliquer les filtres
function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const periodFilter = document.getElementById('period-filter').value;
  const actionFilter = document.getElementById('action-filter').value;
  const userFilter = document.getElementById('user-filter').value;

  filteredLogs = allLogs.filter(log => {
    // Filtre recherche
    if (searchTerm) {
      const searchableText = [
        log.action_type,
        log.target_type,
        log.profiles?.full_name,
        log.profiles?.email,
        log.details?.description,
        log.ip_address
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchTerm)) return false;
    }

    // Filtre période
    if (periodFilter !== 'all') {
      const logDate = new Date(log.created_at);
      const now = new Date();
      
      if (periodFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (logDate < today) return false;
      } else if (periodFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (logDate < weekAgo) return false;
      } else if (periodFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (logDate < monthAgo) return false;
      }
    }

    // Filtre type d'action
    if (actionFilter !== 'all') {
      if (actionFilter === 'auth' && !log.action_type.includes('login') && !log.action_type.includes('logout')) return false;
      if (actionFilter === 'client' && !log.action_type.includes('client')) return false;
      if (actionFilter === 'quote' && !log.action_type.includes('quote')) return false;
      if (actionFilter === 'project' && !log.action_type.includes('project')) return false;
      if (actionFilter === 'export' && !log.action_type.includes('export')) return false;
      if (actionFilter === 'error' && log.success !== false) return false;
    }

    // Filtre utilisateur
    if (userFilter !== 'all' && log.user_id !== userFilter) return false;

    return true;
  });

  currentPage = 1;
  displayLogs();
}

// Afficher les logs
function displayLogs() {
  const tbody = document.getElementById('logs-tbody');
  
  if (filteredLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
          Aucun log trouvé avec ces filtres
        </td>
      </tr>
    `;
    updatePagination();
    return;
  }

  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const logsToDisplay = filteredLogs.slice(startIndex, endIndex);

  tbody.innerHTML = logsToDisplay.map(log => {
    const user = log.profiles || {};
    const initials = getInitials(user);
    const actionType = getActionTypeCategory(log.action_type);
    const statusClass = log.success === false ? 'error' : 'success';
    const statusText = log.success === false ? '❌ Erreur' : '✅ Succès';

    return `
      <tr>
        <td>
          <div class="log-timestamp">${formatDateTime(log.created_at)}</div>
        </td>
        <td>
          <div class="log-user">
            <div class="log-user-avatar">${initials}</div>
            <div class="log-user-info">
              <div class="log-user-name">${user.full_name || 'Utilisateur'}</div>
              <div class="log-user-email">${user.email || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="log-action">${formatActionType(log.action_type)}</div>
        </td>
        <td>
          <span class="log-type-badge log-type-${actionType}">
            ${getActionIcon(actionType)} ${formatTargetType(log.target_type)}
          </span>
        </td>
        <td>
          <div class="log-details" title="${log.details?.description || log.target_type || 'N/A'}">
            ${log.details?.description || log.target_type || 'N/A'}
          </div>
        </td>
        <td>
          <div class="log-ip">${log.ip_address || 'N/A'}</div>
        </td>
        <td>
          <span class="log-status log-status-${statusClass}">
            ${statusText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  updatePagination();
}

// Mettre à jour la pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  
  document.getElementById('pagination-info').textContent = 
    `Page ${currentPage} sur ${totalPages || 1} (${filteredLogs.length} logs)`;

  document.getElementById('prev-btn').disabled = currentPage === 1;
  document.getElementById('next-btn').disabled = currentPage >= totalPages;
}

// Navigation pagination
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    displayLogs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayLogs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Réinitialiser les filtres
function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('period-filter').value = 'month';
  document.getElementById('action-filter').value = 'all';
  document.getElementById('user-filter').value = 'all';
  applyFilters();
}

// Actualiser les logs
async function refreshLogs() {
  document.getElementById('logs-tbody').innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
        🔄 Actualisation en cours...
      </td>
    </tr>
  `;
  
  await loadStats();
  await loadLogs();
  
  // Toast de confirmation
  showToast('✅ Logs actualisés');
}

// Exporter les logs en CSV
function exportLogs() {
  if (filteredLogs.length === 0) {
    alert('❌ Aucun log à exporter');
    return;
  }

  // Préparer les données CSV
  const headers = ['Date', 'Heure', 'Utilisateur', 'Email', 'Action', 'Type', 'Détails', 'IP', 'Statut'];
  
  const rows = filteredLogs.map(log => {
    const date = new Date(log.created_at);
    const user = log.profiles || {};
    
    return [
      date.toLocaleDateString('fr-FR'),
      date.toLocaleTimeString('fr-FR'),
      user.full_name || 'N/A',
      user.email || 'N/A',
      formatActionType(log.action_type),
      formatTargetType(log.target_type),
      (log.details?.description || log.target_type || '').replace(/,/g, ';'), // Échapper les virgules
      log.ip_address || 'N/A',
      log.success === false ? 'Erreur' : 'Succès'
    ].map(cell => `"${cell}"`); // Entourer chaque cellule de guillemets
  });

  // Créer le CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Ajouter le BOM UTF-8 pour Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Télécharger
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().slice(0, 10);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `logs_activity_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('✅ Export CSV réussi');
}

// === HELPERS ===

function getInitials(user) {
  if (!user) return '?';
  const name = user.full_name || user.email || '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr = date.toLocaleDateString('fr-FR');
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === today.toDateString()) {
    return `Aujourd'hui ${timeStr}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Hier ${timeStr}`;
  } else {
    return `${dateStr} ${timeStr}`;
  }
}

function formatActionType(actionType) {
  const actions = {
    'login': 'Connexion',
    'logout': 'Déconnexion',
    'create_client': 'Création client',
    'update_client': 'Modification client',
    'delete_client': 'Suppression client',
    'create_quote': 'Création devis',
    'update_quote': 'Modification devis',
    'send_quote': 'Envoi devis',
    'accept_quote': 'Acceptation devis',
    'refuse_quote': 'Refus devis',
    'create_project': 'Création projet',
    'update_project': 'Modification projet',
    'export_data': 'Export de données',
    'view_page': 'Consultation page',
    'error': 'Erreur système'
  };
  
  return actions[actionType] || actionType.replace(/_/g, ' ');
}

function formatTargetType(targetType) {
  const types = {
    'client': 'Client',
    'quote': 'Devis',
    'project': 'Projet',
    'user': 'Utilisateur',
    'auth': 'Authentification',
    'export': 'Export',
    'system': 'Système'
  };
  
  return types[targetType] || targetType || 'N/A';
}

function getActionTypeCategory(actionType) {
  if (actionType.includes('login') || actionType.includes('logout')) return 'auth';
  if (actionType.includes('client')) return 'client';
  if (actionType.includes('quote')) return 'quote';
  if (actionType.includes('project')) return 'project';
  if (actionType.includes('export')) return 'export';
  if (actionType.includes('error')) return 'error';
  return 'client';
}

function getActionIcon(category) {
  const icons = {
    'auth': '🔐',
    'client': '👤',
    'quote': '📄',
    'project': '📁',
    'export': '📊',
    'error': '⚠️'
  };
  
  return icons[category] || '📋';
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showToast(message) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #1e293b;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Ajouter les animations CSS pour le toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);