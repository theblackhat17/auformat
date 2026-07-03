import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_CATEGORIES } from '@/lib/email-templates';

/**
 * Liste tous les modèles d'e-mails du site : registre du code fusionné avec
 * les personnalisations stockées en base (table email_templates).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  type OverrideRow = { key: string; subject: string | null; bodyHtml: string | null; updatedAt: string | null };
  let rows: OverrideRow[] = [];
  try {
    rows = await query<OverrideRow>('SELECT key, subject, body_html, updated_at FROM email_templates');
  } catch {
    // Table absente (migration migrate-email-templates non exécutée) :
    // on renvoie uniquement les défauts du code.
  }
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const templates = EMAIL_TEMPLATES.map((def) => {
    const override = byKey.get(def.key);
    return {
      ...def,
      overrideSubject: override?.subject ?? null,
      overrideBody: override?.bodyHtml ?? null,
      updatedAt: override?.updatedAt ?? null,
    };
  });

  return NextResponse.json({ categories: EMAIL_TEMPLATE_CATEGORIES, templates });
}
