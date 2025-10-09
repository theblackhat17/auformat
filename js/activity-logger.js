// =========================================
// SYSTÈME DE LOGGING D'ACTIVITÉ
// =========================================

class ActivityLogger {
  constructor() {
    this.supabase = window.supabaseClient;
  }

  /**
   * Logger une action utilisateur
   * @param {string} actionType - Type d'action (login, create_client, etc.)
   * @param {string} targetType - Type de cible (client, quote, project, etc.)
   * @param {string} targetId - ID de la cible (optionnel)
   * @param {object} details - Détails supplémentaires (optionnel)
   * @param {boolean} success - Succès ou échec de l'action
   */
  async log(actionType, targetType, targetId = null, details = null, success = true) {
    try {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        console.warn('⚠️ Tentative de log sans utilisateur connecté');
        return;
      }

      // Récupérer l'IP (si disponible)
      let ipAddress = null;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.warn('⚠️ Impossible de récupérer l\'IP');
      }

      // Créer l'entrée de log
      const logEntry = {
        user_id: user.id,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details: details,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        success: success
      };

      // Insérer dans la base de données
      const { error } = await this.supabase
        .from('activity_logs')
        .insert([logEntry]);

      if (error) throw error;

      console.log('✅ Action loggée:', actionType);

    } catch (error) {
      console.error('❌ Erreur lors du logging:', error);
    }
  }

  // Méthodes de raccourci pour les actions courantes
  async logLogin() {
    await this.log('login', 'auth', null, { description: 'Connexion réussie' });
  }

  async logLogout() {
    await this.log('logout', 'auth', null, { description: 'Déconnexion' });
  }

  async logCreateClient(clientId, clientName) {
    await this.log('create_client', 'client', clientId, {
      description: `Nouveau client créé: ${clientName}`
    });
  }

  async logUpdateClient(clientId, clientName) {
    await this.log('update_client', 'client', clientId, {
      description: `Client modifié: ${clientName}`
    });
  }

  async logCreateQuote(quoteId, clientName, amount) {
    await this.log('create_quote', 'quote', quoteId, {
      description: `Devis créé pour ${clientName} - ${amount}€`
    });
  }

  async logSendQuote(quoteId, clientName) {
    await this.log('send_quote', 'quote', quoteId, {
      description: `Devis envoyé à ${clientName}`
    });
  }

  async logAcceptQuote(quoteId) {
    await this.log('accept_quote', 'quote', quoteId, {
      description: 'Devis accepté par le client'
    });
  }

  async logCreateProject(projectId, projectName) {
    await this.log('create_project', 'project', projectId, {
      description: `Nouveau projet: ${projectName}`
    });
  }

  async logExport(exportType) {
    await this.log('export_data', 'export', null, {
      description: `Export de données: ${exportType}`
    });
  }

  async logError(errorType, errorMessage) {
    await this.log('error', 'system', null, {
      description: `Erreur ${errorType}: ${errorMessage}`
    }, false);
  }

  async logPageView(pageName) {
    await this.log('view_page', 'system', null, {
      description: `Consultation de la page: ${pageName}`
    });
  }
}

// Créer une instance globale
window.ActivityLogger = new ActivityLogger();

console.log('✅ Activity Logger chargé');