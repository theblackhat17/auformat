// /js/devis.js
// =========================================
// GESTION DES DEVIS CLIENT
// =========================================

// Attendre que AUTH soit disponible
(async function initQuotes() {
  console.log('🎯 Initialisation mes_devis...');
  
  // Attendre AUTH
  let attempts = 0;
  while (!window.AUTH && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  if (!window.AUTH) {
    console.error('❌ AUTH non disponible après 5 secondes');
    document.getElementById('quotes-container').innerHTML = `
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

  await loadQuotes();
})();

async function loadQuotes() {
  try {
    const user = await AUTH.getCurrentUser();
    
    const { data: quotes, error } = await supabaseClient
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    displayQuotes(quotes || []);

  } catch (error) {
    console.error('Erreur chargement devis:', error);
    document.getElementById('quotes-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <div class="empty-title">Erreur de chargement</div>
        <div class="empty-desc">${error.message}</div>
      </div>
    `;
  }
}

// ... reste du fichier inchangé (displayQuotes, acceptQuote, etc.)
    function displayQuotes(quotes) {
      const container = document.getElementById('quotes-container');

      if (quotes.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📄</div>
            <div class="empty-title">Aucun devis</div>
            <div class="empty-desc">Vous n'avez pas encore de devis. Créez un projet et demandez un devis !</div>
            <a href="/mes_projets.html" class="btn btn-primary">Mes projets</a>
          </div>
        `;
        return;
      }

      container.innerHTML = quotes.map(quote => {
        const statusLabels = {
          draft: 'Brouillon',
          sent: 'Envoyé',
          viewed: 'Consulté',
          accepted: 'Accepté',
          refused: 'Refusé',
          expired: 'Expiré'
        };

        const createdDate = new Date(quote.created_at).toLocaleDateString('fr-FR');
        const validUntil = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('fr-FR') : 'Non spécifié';

        return `
          <div class="quote-card">
            <div class="quote-header">
              <div class="quote-number">${quote.quote_number}</div>
              <span class="quote-status status-${quote.status}">${statusLabels[quote.status] || quote.status}</span>
            </div>

            <div class="quote-title">${quote.title}</div>
            ${quote.description ? `<div class="quote-description">${quote.description}</div>` : ''}

            <div class="quote-details">
              <div class="quote-detail">
                <span class="detail-label">Date de création</span>
                <span class="detail-value">${createdDate}</span>
              </div>
              <div class="quote-detail">
                <span class="detail-label">Valide jusqu'au</span>
                <span class="detail-value">${validUntil}</span>
              </div>
              <div class="quote-detail">
                <span class="detail-label">Montant TTC</span>
                <span class="detail-value">${formatPrice(quote.total_ttc)}</span>
              </div>
            </div>

            <div class="quote-actions">
              ${quote.pdf_url ? `
                <a href="${quote.pdf_url}" target="_blank" class="btn btn-primary">
                  📥 Télécharger PDF
                </a>
              ` : ''}
              
              ${quote.status === 'sent' || quote.status === 'viewed' ? `
                <button class="btn btn-success" onclick="acceptQuote('${quote.id}')">
                  ✅ Accepter le devis
                </button>
                <button class="btn btn-danger" onclick="refuseQuote('${quote.id}')">
                  ❌ Refuser
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    function formatPrice(price) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(price);
    }

    async function acceptQuote(quoteId) {
      if (!confirm('Voulez-vous accepter ce devis ?')) return;

      try {
        const { error } = await supabaseClient
          .from('quotes')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', quoteId);

        if (error) throw error;

        alert('✅ Devis accepté ! Nous vous contacterons bientôt.');
        await loadQuotes();

      } catch (error) {
        console.error('Erreur acceptation:', error);
        alert('❌ Erreur lors de l\'acceptation du devis');
      }
    }

    async function refuseQuote(quoteId) {
      const reason = prompt('Pourquoi refusez-vous ce devis ? (optionnel)');
      if (reason === null) return;

      try {
        const { error } = await supabaseClient
          .from('quotes')
          .update({
            status: 'refused',
            refused_at: new Date().toISOString(),
            client_notes: reason || 'Refusé sans raison'
          })
          .eq('id', quoteId);

        if (error) throw error;

        alert('✅ Devis refusé');
        await loadQuotes();

      } catch (error) {
        console.error('Erreur refus:', error);
        alert('❌ Erreur lors du refus du devis');
      }
    }