import { query } from './db';

/**
 * Destinataires e-mail d'un client : son adresse principale + celles de ses
 * contacts supplémentaires (client_contacts). Dédoublonné, comptes anonymisés exclus.
 * Ne jette jamais : à défaut (table absente, DB indisponible), on retombe sur
 * l'adresse principale seule pour ne pas bloquer l'envoi.
 */
export async function clientRecipients(userId: string | null | undefined, primaryEmail: string): Promise<string[]> {
  const emails = new Set<string>();
  if (primaryEmail && !primaryEmail.endsWith('@anonyme.local')) emails.add(primaryEmail.toLowerCase());
  if (userId) {
    try {
      const contacts = await query<{ email: string }>(
        'SELECT email FROM client_contacts WHERE user_id = $1 ORDER BY created_at',
        [userId]
      );
      for (const c of contacts) {
        if (c.email && !c.email.endsWith('@anonyme.local')) emails.add(c.email.toLowerCase());
      }
    } catch {
      // Table absente (migration non exécutée) : on garde l'adresse principale.
    }
  }
  return [...emails];
}
