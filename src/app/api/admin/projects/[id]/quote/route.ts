import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { getMateriauxForConfigurateur } from '@/lib/content';
import { nextQuoteNumber } from '@/lib/quote-number';
import { computeCompositionPrice } from '@/components/configurateur-compo/pricingCompo';
import { TAX_RATE } from '@/lib/constants';
import type {
  CompositionConfig,
  ConfigurateurMaterial,
  ConfigurateurModuleType,
  ConfigurateurSettingsRow,
  ConfigurateurUnivers,
  Quote,
  QuoteItem,
} from '@/lib/types';

type ProjectRow = {
  id: string;
  name: string;
  userId: string;
  config: unknown;
  clientName: string | null;
  clientEmail: string | null;
};

function isCompositionConfig(config: unknown): config is CompositionConfig {
  return (
    !!config &&
    typeof config === 'object' &&
    (config as CompositionConfig).version === 2 &&
    Array.isArray((config as CompositionConfig).modules)
  );
}

/**
 * Génère un devis brouillon depuis la configuration 3D (composition v2) d'un
 * projet : chiffrage serveur via computeCompositionPrice + catalogue en base,
 * puis ouverture dans l'éditeur de devis existant. Admin uniquement.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const project = await queryOne<ProjectRow>(
      `SELECT pj.id, pj.name, pj.user_id, pj.config,
              pr.full_name AS client_name, pr.email AS client_email
       FROM projects pj
       LEFT JOIN profiles pr ON pj.user_id = pr.id
       WHERE pj.id = $1`,
      [id]
    );
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const config = project.config;
    if (!isCompositionConfig(config)) {
      return NextResponse.json({ error: 'Aucune configuration à chiffrer' }, { status: 400 });
    }

    // Catalogue côté serveur : mêmes sources que /api/content/configurateur
    const [rows, materials] = await Promise.all([
      query<ConfigurateurSettingsRow>(
        "SELECT key, value, updated_at FROM configurateur_settings WHERE key IN ('module_types', 'univers')"
      ),
      getMateriauxForConfigurateur(),
    ]);
    const settings: Record<string, unknown> = {};
    for (const row of rows) settings[row.key] = row.value;

    const moduleTypes = (settings.module_types as ConfigurateurModuleType[] | undefined) || [];
    const universList = (settings.univers as ConfigurateurUnivers[] | undefined) || [];
    const univers = universList.find((u) => u.slug === config.univers);

    // Même mapping matériaux que l'API publique du configurateur
    const configMaterials: ConfigurateurMaterial[] = materials.map((m) => ({
      name: m.name,
      colorHex: m.colorHex || '#CCCCCC',
      prixM2: m.prixM2 || 0,
      sortOrder: m.sortOrder || 0,
      image: m.image || null,
    }));

    const b = computeCompositionPrice(config, moduleTypes, configMaterials, univers);

    const items: QuoteItem[] = b.moduleLines.map((line) => ({
      description: line.label,
      quantity: 1,
      unitPrice: line.total,
      total: line.total,
    }));
    if (b.planTravailLine) {
      items.push({
        description: b.planTravailLine.label,
        quantity: 1,
        unitPrice: b.planTravailLine.total,
        total: b.planTravailLine.total,
      });
    }
    // Réconciliation : certaines options d'ensemble (ex. façade coulissante de dressing)
    // comptent dans le sous-total mais pas dans les lignes par module. On ajoute le reliquat
    // pour que la somme des lignes = subtotalHt.
    const itemsSum = items.reduce((s, it) => s + it.total, 0);
    const reste = Math.round((b.subtotalHt - itemsSum) * 100) / 100;
    if (reste > 0.5) {
      items.push({ description: "Façade coulissante / options d'ensemble", quantity: 1, unitPrice: reste, total: reste });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Aucune configuration à chiffrer' }, { status: 400 });
    }

    // Numéro de devis atomique et monotone (voir nextQuoteNumber)
    const quoteNumber = await nextQuoteNumber();

    const result = await rawQuery(
      `INSERT INTO quotes (user_id, project_id, quote_number, title, client_name, client_email, items, subtotal_ht, tax_rate, tax_amount, total_ttc, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, 'draft') RETURNING *`,
      [
        project.userId,
        project.id,
        quoteNumber,
        `Devis — ${project.name}`,
        project.clientName || 'Client',
        project.clientEmail || 'inconnu@auformat.com',
        JSON.stringify(items),
        b.subtotalHt,
        TAX_RATE * 100,
        b.tva,
        b.totalTtc,
      ]
    );

    const quote = toCamelCase<Quote>(result.rows[0]);

    logAdminAction(request, auth, 'create_quote', 'quote', quote.id,
      `Devis ${quoteNumber} généré depuis la config du projet « ${project.name} » — ${b.totalTtc} EUR TTC`);

    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    console.error('Generate project quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
