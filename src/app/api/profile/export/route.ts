import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';

/** RGPD — droit à la portabilité : export JSON de toutes les données du compte */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [profile, projects, updates, quotes, logs] = await Promise.all([
      queryOne(
        `SELECT id, email, full_name, company_name, phone, address, role, discount_rate, created_at
         FROM profiles WHERE id = $1`, [auth.userId]
      ),
      query(`SELECT id, name, type, status, config, notes, created_at, updated_at FROM projects WHERE user_id = $1`, [auth.userId]),
      query(
        `SELECT pu.project_id, pu.status, pu.note, pu.photos, pu.created_at
         FROM project_updates pu JOIN projects p ON p.id = pu.project_id WHERE p.user_id = $1`, [auth.userId]
      ),
      query(
        `SELECT id, quote_number, title, description, items, subtotal_ht, tax_amount, total_ttc, status,
                valid_until, sent_at, accepted_at, refused_at, client_notes, created_at
         FROM quotes WHERE user_id = $1`, [auth.userId]
      ),
      query(`SELECT action_type, details, created_at FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`, [auth.userId]),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      source: 'auformat.com',
      profil: profile,
      projets: projects,
      suiviFabrication: updates,
      devis: quotes,
      historiqueActivite: logs,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="auformat-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error('Export data error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
