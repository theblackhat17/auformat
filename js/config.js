// /js/config.js
const SUPABASE_CONFIG = {
  url: 'https://qlcvkdfypvkhobizqtmm.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsY3ZrZGZ5cHZraG9iaXpxdG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDU3NTQsImV4cCI6MjA3NTUyMTc1NH0.6-EnRdRxryQCS3wsJsT2Fah_M6rmBpjo32FYxX4VTME'
};

// ---------- Supabase client ----------
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// ---------- Helpers ----------
async function ensureProfile(user) {
  if (!user) return null;

  // Try to read the profile
  const { data: existing, error: readErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing;

  // If not found, create it with sensible defaults
  const payload = {
    id: user.id,
    email: user.email ?? '',
    full_name: user.user_metadata?.full_name || '',
    company_name: '',
    phone: '',
    address: '',
    discount_rate: 0,
    role: 'client'
  };

  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .insert(payload)
    .select()
    .single();

  if (insertErr) {
    console.error('Profile insert failed:', insertErr);
    return null;
  }
  return created;
}

const AUTH = {
  // Current session user
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    return data?.user ?? null;
  },

  // Full profile (auto-creates if missing)
  async getProfile(userId) {
    // first try to read
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) return data;

    // not found -> ensure/create it
    const { data: userWrap } = await supabase.auth.getUser();
    const user = userWrap?.user;
    if (!user || user.id !== userId) return null;

    return await ensureProfile(user);
  },

  // Is admin?
  async isAdmin() {
    const user = await this.getCurrentUser();
    if (!user) return false;
    const profile = await this.getProfile(user.id);
    return profile?.role === 'admin';
  },

  // Require auth on page
  async requireAuth(redirectTo = '/login.html') {
    const user = await this.getCurrentUser();
    if (!user) {
      window.location.href = redirectTo;
      return false;
    }
    // make sure the profile exists (first visit)
    await ensureProfile(user);
    return true;
  },

  // Require admin
  async requireAdmin(redirectTo = '/index.html') {
    const ok = await this.isAdmin();
    if (!ok) {
      alert('⛔ Accès réservé aux administrateurs');
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
};

// Auto-create profile right after a login/refresh
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    await ensureProfile(session.user);
  }
});

// Expose globally
window.supabaseClient = supabase;
window.AUTH = AUTH;

console.log('✅ Supabase ready (profiles auto-create enabled)');
