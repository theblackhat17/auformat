import { NextRequest, NextResponse } from 'next/server';
import { rawQuery, queryOne } from '@/lib/db';
import { requireAuth, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import * as crypto from 'crypto';

/**
 * RGPD — droit à l'oubli : suppression du compte.
 * - Le profil est anonymisé (les devis sont conservés anonymisés : obligation comptable,
 *   cf. politique de confidentialité — conservation 5 ans) ;
 * - les brouillons de projets sont supprimés, les projets facturés sont conservés anonymes ;
 * - toutes les sessions et les comptes de connexion (mot de passe, Google) sont détruits.
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

    // Brouillons : aucune valeur légale, suppression pure (les project_updates suivent en cascade)
    await rawQuery(`DELETE FROM projects WHERE user_id = $1 AND status = 'draft'`, [auth.userId]);

    // Anonymisation du profil — l'email devient inutilisable, le nom disparaît
    const anonyme = `supprime-${crypto.randomBytes(6).toString('hex')}@anonyme.local`;
    await rawQuery(
      `UPDATE profiles SET email = $1, full_name = 'Compte supprimé', company_name = NULL,
        phone = NULL, address = NULL, avatar_url = NULL, email_verified = FALSE, updated_at = NOW()
       WHERE id = $2`,
      [anonyme, auth.userId]
    );

    // Destruction des accès : sessions actives + comptes de connexion (mot de passe, Google)
    await rawQuery(`DELETE FROM session WHERE "userId" = $1`, [auth.userId]);
    await rawQuery(`DELETE FROM account WHERE "userId" = $1`, [auth.userId]);

    const res = NextResponse.json({ success: true });
    // Invalide le cookie de session côté navigateur
    res.cookies.set('better-auth.session_token', '', { maxAge: 0, path: '/' });
    return res;
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
