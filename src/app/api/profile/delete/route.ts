import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query, withTransaction } from '@/lib/db';
import { requireAuth, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { extractUploadFilenames, deleteUploadedFiles } from '@/lib/upload';
import * as crypto from 'crypto';

/**
 * RGPD — droit à l'oubli : suppression du compte.
 * - Le profil est anonymisé ;
 * - les devis sont conservés (obligation comptable — 5 ans) mais ANONYMISÉS :
 *   nom/email/téléphone remplacés, description et config purgées de toute PII ;
 * - les brouillons de projets sont supprimés ;
 * - les fichiers joints (photos/plans) sont supprimés du disque ;
 * - toutes les sessions et comptes de connexion (mot de passe, Google) sont détruits.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    if (auth.role === 'admin') {
      return NextResponse.json({ error: 'Un compte administrateur ne peut pas être supprimé depuis cette page.' }, { status: 400 });
    }

    const { confirmation } = await request.json();
    if (confirmation !== 'SUPPRIMER') {
      return NextResponse.json({ error: 'Confirmation invalide : tapez SUPPRIMER' }, { status: 400 });
    }

    const profile = await queryOne<{ email: string }>('SELECT email FROM profiles WHERE id = $1', [auth.userId]);
    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

    await logActivity(auth.userId, 'delete_client', 'profile', auth.userId, {
      description: 'Suppression de compte à la demande du client (RGPD)',
    }, getClientIp(request), getUserAgent(request));

    // Fichiers à supprimer : documents des projets draft (supprimés ci-dessous) et
    // pièces jointes référencées dans les devis. Collectés avant les DELETE/UPDATE.
    const [docRows, quoteRows] = await Promise.all([
      query<{ url: string }>(
        `SELECT pd.url FROM project_documents pd JOIN projects p ON pd.project_id = p.id
          WHERE p.user_id = $1 AND p.status = 'draft'`,
        [auth.userId]
      ),
      query<{ description: string | null }>('SELECT description FROM quotes WHERE user_id = $1', [auth.userId]),
    ]);
    const fileRefs = [
      ...docRows.map((d) => d.url),
      ...quoteRows.flatMap((q) => extractUploadFilenames(q.description)),
    ];

    const anonyme = `supprime-${crypto.randomBytes(6).toString('hex')}@anonyme.local`;

    await withTransaction(async (client) => {
      // Brouillons : aucune valeur légale, suppression pure (project_updates/documents en cascade)
      await client.query(`DELETE FROM projects WHERE user_id = $1 AND status = 'draft'`, [auth.userId]);

      // Anonymisation du profil — l'email devient inutilisable, le nom disparaît
      await client.query(
        `UPDATE profiles SET email = $1, full_name = 'Compte supprimé', company_name = NULL,
          phone = NULL, address = NULL, avatar_url = NULL, email_verified = FALSE, updated_at = NOW()
         WHERE id = $2`,
        [anonyme, auth.userId]
      );

      // Anonymisation des devis conservés : plus aucune donnée personnelle en clair
      // (les montants et lignes restent pour l'obligation comptable).
      await client.query(
        `UPDATE quotes SET client_name = 'Compte supprimé', client_email = $1, client_phone = NULL,
          client_notes = NULL, description = NULL, config_data = NULL, updated_at = NOW()
         WHERE user_id = $2`,
        [anonyme, auth.userId]
      );

      // Destruction des accès : sessions actives + comptes de connexion (mot de passe, Google)
      await client.query(`DELETE FROM session WHERE "userId" = $1`, [auth.userId]);
      await client.query(`DELETE FROM account WHERE "userId" = $1`, [auth.userId]);
    });

    // Fichiers physiques supprimés après COMMIT (best-effort)
    await deleteUploadedFiles(fileRefs);

    const res = NextResponse.json({ success: true });
    // Invalide le cookie de session côté navigateur
    res.cookies.set('better-auth.session_token', '', { maxAge: 0, path: '/' });
    return res;
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
