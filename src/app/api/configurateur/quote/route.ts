import { NextRequest, NextResponse } from 'next/server';
import { rawQuery, queryOne, query } from '@/lib/db';
import { notifyAdminsNewQuote, sendQuoteToClient } from '@/lib/mailer';
import { checkQuoteRateLimit } from '@/lib/rate-limit';
import { saveUploadedFile } from '@/lib/upload';
import { getClientIp } from '@/lib/middleware-auth';
import { nextQuoteNumber } from '@/lib/quote-number';
import { getMateriauxForConfigurateur } from '@/lib/content';
import { calculatePrice2D } from '@/components/configurateur-2d/pricing';
import { computeCompositionPrice } from '@/components/configurateur-compo/pricingCompo';
import type {
  CompositionConfig,
  Configurateur2DConfig,
  ConfigurateurMaterial,
  ConfigurateurModuleType,
  ConfigurateurOption,
  ConfigurateurOptionPrices,
  ConfigurateurProductType,
  ConfigurateurSettingsRow,
  ConfigurateurUnivers,
} from '@/lib/types';

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://auformat.com';

const round2 = (n: number) => Math.round(n * 100) / 100;

type ServerQuoteItem = { description: string; quantity: number; unitPrice: number; total: number };
type ServerPrice = { items: ServerQuoteItem[]; subtotalHt: number; tva: number; totalTtc: number };

function isCompositionConfig(config: unknown): config is CompositionConfig {
  return (
    !!config &&
    typeof config === 'object' &&
    (config as CompositionConfig).version === 2 &&
    Array.isArray((config as CompositionConfig).modules)
  );
}

function toConfigMaterials(materials: Awaited<ReturnType<typeof getMateriauxForConfigurateur>>): ConfigurateurMaterial[] {
  return materials.map((m) => ({
    name: m.name,
    colorHex: m.colorHex || '#CCCCCC',
    prixM2: m.prixM2 || 0,
    sortOrder: m.sortOrder || 0,
    image: m.image || null,
  }));
}

/**
 * Rechiffre le devis à partir de la configuration réelle et du catalogue en base
 * (mêmes fonctions que le configurateur et la route admin). Les montants envoyés
 * par le navigateur ne sont JAMAIS utilisés : un client ne peut pas se faire
 * confirmer un prix qu'il a fabriqué. Retourne null si la config est absente ou
 * non reconnue (le devis part alors sans montant, à chiffrer par le commercial).
 */
async function recomputePrice(configData: unknown, config2d: unknown): Promise<ServerPrice | null> {
  // Composition 3D (v2)
  if (isCompositionConfig(configData)) {
    const [rows, materials] = await Promise.all([
      query<ConfigurateurSettingsRow>(
        "SELECT key, value FROM configurateur_settings WHERE key IN ('module_types', 'univers')"
      ),
      getMateriauxForConfigurateur(),
    ]);
    const settings: Record<string, unknown> = {};
    for (const row of rows) settings[row.key] = row.value;
    const moduleTypes = (settings.module_types as ConfigurateurModuleType[] | undefined) || [];
    const universList = (settings.univers as ConfigurateurUnivers[] | undefined) || [];
    const univers = universList.find((u) => u.slug === configData.univers);

    const b = computeCompositionPrice(configData, moduleTypes, toConfigMaterials(materials), univers);
    const items: ServerQuoteItem[] = b.moduleLines.map((line) => ({
      description: line.label,
      quantity: 1,
      unitPrice: line.total,
      total: line.total,
    }));
    if (b.planTravailLine) {
      items.push({ description: b.planTravailLine.label, quantity: 1, unitPrice: b.planTravailLine.total, total: b.planTravailLine.total });
    }
    const itemsSum = items.reduce((s, it) => s + it.total, 0);
    const reste = round2(b.subtotalHt - itemsSum);
    if (reste > 0.5) {
      items.push({ description: "Façade coulissante / options d'ensemble", quantity: 1, unitPrice: reste, total: reste });
    }
    if (items.length === 0) return null;
    return { items, subtotalHt: b.subtotalHt, tva: b.tva, totalTtc: b.totalTtc };
  }

  // Meuble 2D
  const cfg = config2d as Configurateur2DConfig | undefined;
  if (cfg && typeof cfg === 'object' && typeof cfg.productSlug === 'string') {
    const [rows, materials] = await Promise.all([
      query<ConfigurateurSettingsRow>(
        "SELECT key, value FROM configurateur_settings WHERE key IN ('product_types', 'option_prices', 'options')"
      ),
      getMateriauxForConfigurateur(),
    ]);
    const settings: Record<string, unknown> = {};
    for (const row of rows) settings[row.key] = row.value;
    const productTypes = (settings.product_types as ConfigurateurProductType[] | undefined) || [];
    const optionPrices = (settings.option_prices as ConfigurateurOptionPrices | undefined) || ({} as ConfigurateurOptionPrices);
    const options = (settings.options as ConfigurateurOption[] | undefined) || [];

    const b = calculatePrice2D(cfg, toConfigMaterials(materials), optionPrices, productTypes, options);
    if (b.lineItems.length === 0 || b.subtotalHt <= 0) return null;
    const items: ServerQuoteItem[] = b.lineItems.map((line) => ({
      description: line.label,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      total: line.total,
    }));
    return { items, subtotalHt: b.subtotalHt, tva: b.tva, totalTtc: b.totalTtc };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (IP non usurpable — cf. getClientIp)
    const ip = getClientIp(request);
    const rateLimit = await checkQuoteRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de demandes. Reessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    // Multipart (avec photos/plans joints) ou JSON (compatibilité)
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, unknown>;
    const attachmentLinks: string[] = [];
    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      body = JSON.parse(String(fd.get('payload') || '{}'));
      const files = fd.getAll('fichiers').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
      for (const file of files) {
        try {
          const saved = await saveUploadedFile(file, { allowPdf: true, prefix: 'devis' });
          attachmentLinks.push(`${saved.originalName} : ${SITE}${saved.path}`);
        } catch (err) {
          return NextResponse.json({ error: `« ${file.name} » : ${err instanceof Error ? err.message : 'fichier refusé'}` }, { status: 400 });
        }
      }
    } else {
      body = await request.json();
    }
    const { nom, email, telephone, message, productType, dimensions, materiau, items, configData, config2d } = body as {
      nom?: string; email?: string; telephone?: string; message?: string;
      productType?: string; dimensions?: string; materiau?: string;
      items?: { label: string; quantity: number; unitPrice: number; total: number }[];
      configData?: unknown; config2d?: unknown;
    };

    if (!nom || !email || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Donnees incompletes' }, { status: 400 });
    }

    // Find or create a profile for this email
    let profile = await queryOne<{ id: string; role: string }>(
      'SELECT id, role FROM profiles WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (!profile) {
      // Create a lightweight client profile (no password - they can register later)
      const result = await rawQuery(
        `INSERT INTO profiles (email, full_name, phone, role, discount_rate)
         VALUES ($1, $2, $3, 'client', 0) RETURNING id, role`,
        [email.toLowerCase().trim(), nom, telephone || null]
      );
      profile = { id: result.rows[0].id, role: result.rows[0].role };
    }

    // Numéro de devis atomique et monotone (voir nextQuoteNumber)
    const quoteNumber = await nextQuoteNumber();

    // Build description from config
    const description = [
      `Produit : ${productType}`,
      `Dimensions : ${dimensions}`,
      `Materiau : ${materiau}`,
      message ? `Message : ${message}` : null,
      telephone ? `Tel : ${telephone}` : null,
      attachmentLinks.length ? `Fichiers joints par le client :\n${attachmentLinks.map((l) => `- ${l}`).join('\n')}` : null,
    ].filter(Boolean).join('\n');

    // Chiffrage serveur : recalcul depuis la config réelle, les montants du
    // navigateur sont ignorés. Si la config n'est pas rechiffrable, le devis part
    // sans prix (lignes conservées à 0) — le commercial le chiffrera.
    const serverPrice = await recomputePrice(configData, config2d);
    const quoteItems: ServerQuoteItem[] = serverPrice
      ? serverPrice.items
      : items.map((item) => ({ description: item.label, quantity: item.quantity, unitPrice: 0, total: 0 }));
    const calcSubtotalHt = serverPrice ? serverPrice.subtotalHt : 0;
    const calcTva = serverPrice ? serverPrice.tva : 0;
    const calcTotalTtc = serverPrice ? serverPrice.totalTtc : 0;

    const result = await rawQuery(
      `INSERT INTO quotes (user_id, quote_number, title, description, client_name, client_email, client_phone, items, subtotal_ht, tax_rate, tax_amount, total_ttc, status, client_notes, config_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, 'draft', $13, $14::jsonb) RETURNING *`,
      [
        profile.id,
        quoteNumber,
        `Configurateur - ${productType}`,
        description,
        nom,
        email.toLowerCase().trim(),
        telephone || null,
        JSON.stringify(quoteItems),
        calcSubtotalHt,
        20,
        calcTva,
        calcTotalTtc,
        message || null,
        configData ? JSON.stringify(configData) : null,
      ]
    );

    const formatEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

    // Confirmation client SANS prix : soumission publique du configurateur.
    // Le devis stocké garde les montants (pour l'admin), mais le client ne
    // reçoit qu'un accusé de réception — jamais de prix.
    await sendQuoteToClient(
      email,
      nom,
      quoteNumber,
      quoteItems,
      calcSubtotalHt,
      calcTva,
      calcTotalTtc,
      undefined,
      true,
    );

    // Notify admins
    await notifyAdminsNewQuote(quoteNumber, nom, email, formatEur(calcTotalTtc));

    return NextResponse.json({ success: true, quoteNumber }, { status: 201 });
  } catch (err) {
    console.error('Configurateur quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
