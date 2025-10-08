const SUPABASE_CONFIG = {
  url: 'https://qlcvkdfypvkhobizqtmm.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsY3ZrZGZ5cHZraG9iaXpxdG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDU3NTQsImV4cCI6MjA3NTUyMTc1NH0.6-EnRdRxryQCS3wsJsT2Fah_M6rmBpjo32FYxX4VTME'
};

// =========================================
// INITIALISATION SUPABASE CLIENT
// =========================================
const supabase = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

// =========================================
// UTILITAIRES
// =========================================
const AUTH = {
  // Vérifier si l'utilisateur est connecté
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Récupérer le profil complet de l'utilisateur
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      return null;
    }
    return data;
  },

  // Vérifier si l'utilisateur est admin
  async isAdmin() {
    const user = await this.getCurrentUser();
    if (!user) return false;
    
    const profile = await this.getProfile(user.id);
    return profile?.role === 'admin';
  },

  // Rediriger vers login si non connecté
  async requireAuth(redirectTo = '/login.html') {
    const user = await this.getCurrentUser();
    if (!user) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  },

  // Rediriger vers login si non admin
  async requireAdmin(redirectTo = '/index.html') {
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      alert('⛔ Accès réservé aux administrateurs');
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
};

// Export pour utilisation dans d'autres fichiers
window.supabaseClient = supabase;
window.AUTH = AUTH;

console.log('✅ Configuration Supabase chargée');