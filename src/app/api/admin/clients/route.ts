import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, rawQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { auth as betterAuth } from '@/lib/better-auth';
import { logAdminAction } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const clients = await query(`
      SELECT
        p.id, p.email, p.full_name, p.company_name, p.phone, p.address,
        p.role, p.avatar_url, p.discount_rate, p.created_at, p.updated_at,
        COALESCE(proj.total_projects, 0)::int as total_projects,
        COALESCE(q.total_quotes, 0)::int as total_quotes,
        COALESCE(q.accepted_quotes, 0)::int as accepted_quotes,
        COALESCE(q.total_revenue, 0)::float as total_revenue,
        COALESCE(s.total_logins, 0)::int as total_logins,
        s.last_login
      FROM profiles p
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as total_projects
        FROM projects GROUP BY user_id
      ) proj ON proj.user_id = p.id
      LEFT JOIN (
        SELECT user_id,
          COUNT(*)::int as total_quotes,
          COUNT(*) FILTER (WHERE status = 'accepted')::int as accepted_quotes,
          COALESCE(SUM(total_ttc) FILTER (WHERE status = 'accepted'), 0) as total_revenue
        FROM quotes GROUP BY user_id
      ) q ON q.user_id = p.id
      LEFT JOIN (
        SELECT "userId" as user_id,
          COUNT(*)::int as total_logins,
          MAX("createdAt") as last_login
        FROM session GROUP BY "userId"
      ) s ON s.user_id = p.id
      ORDER BY p.role ASC, p.created_at DESC
    `);

    return NextResponse.json(clients);
  } catch (err) {
    console.error('Admin clients error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * Création d'un compte client par un admin (aucune inscription libre côté site).
 * Crée le profil s'il n'existe pas et envoie l'e-mail « définir votre mot de passe »
 * (flux better-auth de réinitialisation), que le client utilisera pour activer son compte.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    const fullName = String(body.fullName || body.name || '').trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const companyName = body.companyName ? String(body.companyName).trim() : null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const existing = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE lower(email) = $1', [email]);
    let id: string;
    let created = false;
    if (existing) {
      id = existing.id;
      // Complète les infos manquantes sans écraser l'existant
      await rawQuery(
        `UPDATE profiles SET
           full_name = COALESCE(NULLIF($2,''), full_name),
           company_name = COALESCE($3, company_name),
           phone = COALESCE($4, phone),
           updated_at = NOW()
         WHERE id = $1`,
        [id, fullName, companyName, phone]
      );
    } else {
      const row = await rawQuery(
        `INSERT INTO profiles (email, full_name, company_name, phone, role, discount_rate)
         VALUES ($1, $2, $3, $4, 'client', 0) RETURNING id`,
        [email, fullName || email.split('@')[0], companyName, phone]
      );
      id = row.rows[0].id;
      created = true;
    }

    // E-mail d'activation (définition du mot de passe) sauf si désactivé explicitement
    let emailed = false;
    if (body.sendInvite !== false) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://auformat.com';
        await betterAuth.api.requestPasswordReset({ body: { email, redirectTo: `${appUrl}/reset-password` } });
        emailed = true;
      } catch (e) {
        console.error('requestPasswordReset (create client) failed:', e);
      }
    }

    logAdminAction(request, admin, 'create_client', 'client', id, `Compte client créé : ${email}`);
    return NextResponse.json({ id, email, created, emailed }, { status: 201 });
  } catch (err) {
    console.error('Admin create client error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
