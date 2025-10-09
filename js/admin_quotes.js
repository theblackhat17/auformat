    let allQuotes = [];
    let currentTab = 'all';

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
      await loadQuotes();

      // Calculer les prix en temps réel
      document.getElementById('items-list').addEventListener('input', calculateTotals);
    })();

    async function loadClients() {
      try {
        const { data: clients, error } = await supabaseClient
          .from('profiles')
          .select('id, email, full_name, company_name')
          .eq('role', 'client')
          .order('full_name');

        if (error) throw error;

        const select = document.getElementById('quote-client');
        select.innerHTML = '<option value="">Sélectionner un client...</option>' +
          clients.map(c => `
            <option value="${c.id}" 
              data-email="${c.email}" 
              data-name="${c.full_name || ''}"
              data-company="${c.company_name || ''}">
              ${c.full_name || c.email} ${c.company_name ? `(${c.company_name})` : ''}
            </option>
          `).join('');

      } catch (error) {
        console.error('Erreur chargement clients:', error);
      }
    }

    async function loadQuotes() {
      try {
        const { data: quotes, error } = await supabaseClient
          .from('quotes')
          .select(`
            *,
            profiles!quotes_user_id_fkey(full_name, email, company_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        allQuotes = quotes || [];
        displayQuotes(filterQuotesByTab(allQuotes, currentTab));

      } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('quotes-container').innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <div class="empty-title">Erreur</div>
            <p>${error.message}</p>
          </div>
        `;
      }
    }

    function filterQuotesByTab(quotes, tab) {
      if (tab === 'all') return quotes;
      return quotes.filter(q => q.status === tab);
    }

    function displayQuotes(quotes) {
      const container = document.getElementById('quotes-container');

      if (quotes.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📄</div>
            <div class="empty-title">Aucun devis</div>
            <p>Créez votre premier devis</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="clients-table">
          <table>
            <thead>
              <tr>
                <th>N° Devis</th>
                <th>Client</th>
                <th>Titre</th>
                <th>Montant TTC</th>
                <th>Statut</th>
                <th>Date création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${quotes.map(quote => {
                const statusLabels = {
                  draft: 'Brouillon',
                  sent: 'Envoyé',
                  viewed: 'Consulté',
                  accepted: 'Accepté',
                  refused: 'Refusé',
                  expired: 'Expiré'
                };

                const statusColors = {
                  draft: 'badge-info',
                  sent: 'badge-warning',
                  viewed: 'badge-warning',
                  accepted: 'badge-success',
                  refused: 'badge-danger',
                  expired: 'badge-secondary'
                };

                const client = quote.profiles || {};
                const createdDate = new Date(quote.created_at).toLocaleDateString('fr-FR');

                return `
                  <tr>
                    <td><strong>${quote.quote_number}</strong></td>
                    <td>
                      <div style="font-size: 14px;">
                        <div style="font-weight: 600;">${client.full_name || 'Sans nom'}</div>
                        <div style="color: #64748b; font-size: 12px;">${client.email}</div>
                      </div>
                    </td>
                    <td>${quote.title}</td>
                    <td><strong>${formatPrice(quote.total_ttc)}</strong></td>
                    <td><span class="badge ${statusColors[quote.status]}">${statusLabels[quote.status]}</span></td>
                    <td>${createdDate}</td>
                    <td>
                      <div class="action-buttons">
                        ${quote.status === 'draft' ? `
                          <button class="btn btn-primary btn-small" onclick="sendQuote('${quote.id}')">
                            📨 Envoyer
                          </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-small" onclick="viewQuote('${quote.id}')">
                          👁️ Voir
                        </button>
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

    function switchTab(tab) {
      currentTab = tab;
      
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');

      displayQuotes(filterQuotesByTab(allQuotes, tab));
    }

        // Remplacez la fonction openCreateQuoteModal() par celle-ci :
    function openCreateQuoteModal() {
    document.getElementById('quote-modal').classList.add('active');
    
    // Date par défaut : +30 jours
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    document.getElementById('quote-valid-until').value = validUntil.toISOString().split('T')[0];

    // Vérifier si on doit pré-sélectionner un client
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedClientId = urlParams.get('client');
    
    if (preselectedClientId) {
        document.getElementById('quote-client').value = preselectedClientId;
    }
    }

    function closeModal() {
      document.getElementById('quote-modal').classList.remove('active');
      document.getElementById('quote-form').reset();
    }

    function addItem() {
      const itemsList = document.getElementById('items-list');
      const newRow = document.createElement('div');
      newRow.className = 'item-row';
      newRow.innerHTML = `
        <input type="text" class="form-input" placeholder="Désignation" data-field="description" required>
        <input type="number" class="form-input" placeholder="Qté" data-field="quantity" value="1" min="1" required>
        <input type="number" class="form-input" placeholder="Prix HT" data-field="price" step="0.01" min="0" required>
        <input type="text" class="form-input" value="0.00 €" readonly>
        <button type="button" class="btn-remove-item" onclick="removeItem(this)">🗑️</button>
      `;
      itemsList.appendChild(newRow);
    }

    function removeItem(btn) {
      btn.closest('.item-row').remove();
      calculateTotals();
    }

    function calculateTotals() {
      const items = document.querySelectorAll('#items-list .item-row');
      let subtotal = 0;

      items.forEach(row => {
        const qty = parseFloat(row.querySelector('[data-field="quantity"]').value) || 0;
        const price = parseFloat(row.querySelector('[data-field="price"]').value) || 0;
        const total = qty * price;
        
        row.querySelector('input[readonly]').value = formatPrice(total);
        subtotal += total;
      });

      const tax = subtotal * 0.2;
      const total = subtotal + tax;

      document.getElementById('subtotal-ht').textContent = formatPrice(subtotal);
      document.getElementById('tax-amount').textContent = formatPrice(tax);
      document.getElementById('total-ttc').textContent = formatPrice(total);
    }

    document.getElementById('quote-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const clientId = document.getElementById('quote-client').value;
      const clientOption = document.querySelector(`#quote-client option[value="${clientId}"]`);
      
      const title = document.getElementById('quote-title').value;
      const description = document.getElementById('quote-description').value;
      const validUntil = document.getElementById('quote-valid-until').value;
      const adminNotes = document.getElementById('admin-notes').value;

      // Collecter les articles
      const itemRows = document.querySelectorAll('#items-list .item-row');
      const items = Array.from(itemRows).map(row => ({
        description: row.querySelector('[data-field="description"]').value,
        quantity: parseFloat(row.querySelector('[data-field="quantity"]').value),
        unit_price: parseFloat(row.querySelector('[data-field="price"]').value),
        total: parseFloat(row.querySelector('[data-field="quantity"]').value) * 
               parseFloat(row.querySelector('[data-field="price"]').value)
      }));

      const subtotalHt = items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = subtotalHt * 0.2;
      const totalTtc = subtotalHt + taxAmount;

      try {
        const { data, error } = await supabaseClient
          .from('quotes')
          .insert([{
            user_id: clientId,
            client_name: clientOption.dataset.name || clientOption.dataset.email,
            client_email: clientOption.dataset.email,
            client_company: clientOption.dataset.company,
            title: title,
            description: description,
            items: items,
            subtotal_ht: subtotalHt,
            tax_rate: 20,
            tax_amount: taxAmount,
            total_ttc: totalTtc,
            status: 'draft',
            valid_until: validUntil,
            admin_notes: adminNotes
          }])
          .select();

        if (error) throw error;

        alert('✅ Devis créé avec succès !');
        closeModal();
        await loadQuotes();

      } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur : ' + error.message);
      }
    });

    async function sendQuote(quoteId) {
      if (!confirm('Envoyer ce devis au client ?')) return;

      try {
        const { error } = await supabaseClient
          .from('quotes')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', quoteId);

        if (error) throw error;

        alert('✅ Devis envoyé !');
        await loadQuotes();

      } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur : ' + error.message);
      }
    }

    function viewQuote(quoteId) {
      // TODO: Créer page de détail du devis
      alert('🚧 Page de détail en cours de développement');
    }

    function formatPrice(price) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(price);
    }

    // Fermer modal en cliquant à l'extérieur
    document.getElementById('quote-modal').addEventListener('click', (e) => {
      if (e.target.id === 'quote-modal') {
        closeModal();
      }
    });