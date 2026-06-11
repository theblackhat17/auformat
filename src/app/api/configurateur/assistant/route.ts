import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { query } from '@/lib/db';
import { getMateriauxForConfigurateur } from '@/lib/content';
import type {
  CompositionConfig,
  CompositionModule,
  ConfigurateurModuleType,
  ConfigurateurSettingsRow,
  ConfigurateurUnivers,
} from '@/lib/types';

/**
 * Assistant IA du configurateur : transforme une description en français
 * (« une cuisine de 3,2 m avec frigo intégré et façades chêne ») en une
 * CompositionConfig valide, contrainte au catalogue réel (univers, modules,
 * options, matériaux) chargé depuis la base. Tout ce que le modèle renvoie
 * est revalidé et borné côté serveur avant de partir au client.
 */

const MODEL = process.env.CONFIGURATEUR_AI_MODEL || 'claude-opus-4-8';
/** 'medium' réduit nettement la latence sur cette tâche bien cadrée ; surchargeable via env */
const EFFORT = (process.env.CONFIGURATEUR_AI_EFFORT || 'medium') as 'low' | 'medium' | 'high';

/* Rate limit dédié : 10 requêtes / 10 min par IP (l'inférence a un coût) */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQ = 10;
const hits = new Map<string, number[]>();
function checkAssistantRateLimit(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_REQ) return false;
  list.push(now);
  hits.set(ip, list);
  return true;
}

function buildSchema(universSlugs: string[], moduleSlugs: string[]) {
  return {
    type: 'object',
    properties: {
      univers: { type: 'string', enum: universSlugs },
      materialIndex: { type: 'integer', description: 'Index du matériau principal dans le catalogue' },
      planTravail: { type: 'boolean' },
      facadeCoulissante: { type: 'boolean' },
      facadeVantaux: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'Nombre de vantaux coulissants (2 à 4) si le client le précise, sinon null' },
      lineaireMax: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'Largeur de mur en mm si le client la mentionne, sinon null' },
      explication: { type: 'string', description: 'Deux ou trois phrases en français expliquant la composition proposée au client' },
      modules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            typeSlug: { type: 'string', enum: moduleSlugs },
            largeur: { type: 'integer' },
            hauteur: { type: 'integer' },
            profondeur: { type: 'integer' },
            materialIndex: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'null = matériau principal' },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  slug: { type: 'string' },
                  quantite: { type: 'integer' },
                },
                required: ['slug', 'quantite'],
                additionalProperties: false,
              },
            },
          },
          required: ['typeSlug', 'largeur', 'hauteur', 'profondeur', 'materialIndex', 'options'],
          additionalProperties: false,
        },
      },
    },
    required: ['univers', 'materialIndex', 'planTravail', 'facadeCoulissante', 'facadeVantaux', 'lineaireMax', 'explication', 'modules'],
    additionalProperties: false,
  } as const;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "L'assistant n'est pas configuré." }, { status: 503 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkAssistantRateLimit(ip)) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 2000) : '';
    const currentConfig = body.currentConfig as CompositionConfig | undefined;
    if (prompt.length < 10) {
      return NextResponse.json({ error: 'Décrivez votre projet en quelques mots (au moins une phrase).' }, { status: 400 });
    }

    // Catalogue réel depuis la base
    const [rows, materials] = await Promise.all([
      query<ConfigurateurSettingsRow>('SELECT key, value FROM configurateur_settings'),
      getMateriauxForConfigurateur(),
    ]);
    const settings: Record<string, unknown> = {};
    for (const row of rows) settings[row.key] = row.value;
    const universList = ((settings.univers as ConfigurateurUnivers[]) || []).filter((u) => u.actif);
    const moduleTypes = ((settings.module_types as ConfigurateurModuleType[]) || []).filter((m) => m.actif);

    if (universList.length === 0 || moduleTypes.length === 0 || materials.length === 0) {
      return NextResponse.json({ error: 'Catalogue indisponible.' }, { status: 503 });
    }

    const catalogue = universList.map((u) => {
      const mods = moduleTypes.filter((m) => m.univers.includes(u.slug));
      return [
        `## Univers « ${u.nom} » (slug: ${u.slug})`,
        u.planTravail?.disponible ? `Plan de travail disponible (${u.planTravail.prixMl} €/ml).` : 'Pas de plan de travail.',
        u.facadeCoulissante?.disponible ? `Façade coulissante d'ensemble disponible (${u.facadeCoulissante.prixMl} €/ml).` : '',
        ...mods.map((m) =>
          [
            `- ${m.nom} (slug: ${m.slug}, ${m.zone === 'haut' ? 'suspendu' : m.zone === 'bas' ? 'posé au sol' : 'toute hauteur'})`,
            `  dimensions mm (min/défaut/max) : largeur ${m.dimensionsMin.largeur}/${m.dimensionsDefault.largeur}/${m.dimensionsMax.largeur}, hauteur ${m.dimensionsMin.hauteur}/${m.dimensionsDefault.hauteur}/${m.dimensionsMax.hauteur}, profondeur ${m.dimensionsMin.profondeur}/${m.dimensionsDefault.profondeur}/${m.dimensionsMax.profondeur}`,
            `  options : ${m.options.map((o) => `${o.slug} (${o.nom}, ${o.type === 'choix' ? `choix exclusif groupe ${o.groupe}` : o.type === 'toggle' ? '0 ou 1' : `0 à ${o.max ?? 10}`}, défaut ${o.defaut})`).join(' ; ') || 'aucune'}`,
          ].join('\n')
        ),
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const materiaux = materials.map((m, i) => `${i}: ${m.name} (${m.prixM2} €/m²)`).join('\n');

    const system = [
      "Tu es l'assistant de conception d'Au Format, atelier français de menuiserie et d'agencement sur mesure.",
      "Le client décrit son projet en langage naturel ; tu composes pour lui un agencement à partir du catalogue ci-dessous, et uniquement de ce catalogue.",
      '',
      'Règles :',
      "- N'utilise que les slugs d'univers, de modules et d'options listés. Les dimensions restent dans les bornes min/max de chaque module.",
      "- Les modules sont posés côte à côte de gauche à droite dans l'ordre du tableau. Choisis des largeurs cohérentes avec le linéaire demandé.",
      "- Si le client donne une largeur de pièce ou de mur, renseigne lineaireMax (en mm) et fais tenir la composition dedans.",
      "- Pour les options non mentionnées par le client, utilise les valeurs par défaut du module.",
      "- materialIndex désigne le matériau principal ; sur un module, null = matériau principal. Choisis le matériau le plus proche de la demande du client.",
      "- Si le client demande des portes coulissantes sur un dressing, active facadeCoulissante (façade devant toute la composition) et renseigne facadeVantaux avec le nombre de portes demandé (2 à 4). Ne mets pas en plus des portes battantes sur les modules dans ce cas.",
      "- Si le client veut un îlot central, utilise le module ilot_central : il est dessiné sur sa propre rangée et ne compte pas dans le linéaire du mur.",
      "- Les options de type 'choix' d'un même groupe sont exclusives : mets 1 sur l'option choisie et 0 sur les autres du groupe (ex. groupe poignee : poignee_barre / poignee_bouton / poignee_invisible). Quincaillerie de confort (fermeture_amortie, coulisses_douces) : laisse les valeurs par défaut sauf demande contraire du client.",
      "- L'explication s'adresse au client : courte, chaleureuse, sans jargon technique, en français.",
      '',
      '# Catalogue des modules',
      catalogue,
      '',
      '# Matériaux (index: nom)',
      materiaux,
    ].join('\n');

    const userContent = currentConfig
      ? `Composition actuelle du client (à modifier selon sa demande) :\n${JSON.stringify(currentConfig)}\n\nDemande du client : ${prompt}`
      : `Demande du client : ${prompt}`;

    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: userContent }],
      output_config: {
        effort: EFFORT,
        format: {
          type: 'json_schema',
          schema: buildSchema(universList.map((u) => u.slug), moduleTypes.map((m) => m.slug)),
        },
      },
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: "L'assistant n'a pas pu traiter cette demande. Reformulez votre projet." }, { status: 422 });
    }
    if (response.stop_reason === 'max_tokens') {
      // Sortie tronquée : projet très détaillé — le client peut le découper
      return NextResponse.json({ error: 'Projet très détaillé ! Décrivez-le en deux fois (ex. le mur d\'abord, l\'îlot ensuite via « Assistant » dans la composition).' }, { status: 422 });
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: "Réponse inattendue de l'assistant." }, { status: 503 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      console.error('Assistant configurateur — JSON tronqué ou invalide, stop_reason:', response.stop_reason);
      return NextResponse.json({ error: "L'assistant a produit une réponse incomplète. Réessayez ou simplifiez la description." }, { status: 422 });
    }
    const raw = parsed as {
      univers: string;
      materialIndex: number;
      planTravail: boolean;
      facadeCoulissante: boolean;
      facadeVantaux: number | null;
      lineaireMax: number | null;
      explication: string;
      modules: { typeSlug: string; largeur: number; hauteur: number; profondeur: number; materialIndex: number | null; options: { slug: string; quantite: number }[] }[];
    };

    // ── Revalidation serveur : on ne fait jamais confiance à la sortie du modèle ──
    const univers = universList.find((u) => u.slug === raw.univers) || universList[0];
    const modules: CompositionModule[] = [];
    for (const [i, mod] of raw.modules.entries()) {
      const type = moduleTypes.find((m) => m.slug === mod.typeSlug && m.univers.includes(univers.slug));
      if (!type) continue;
      const options: Record<string, number> = {};
      for (const opt of type.options) {
        const provided = mod.options.find((o) => o.slug === opt.slug);
        const qty = provided ? provided.quantite : opt.defaut;
        options[opt.slug] = clamp(qty, 0, opt.type === 'compteur' ? opt.max ?? 10 : 1);
      }
      // Groupes de choix : exactement une option active par groupe
      const groupes = new Set(type.options.filter((o) => o.type === 'choix').map((o) => o.groupe || 'choix'));
      for (const g of groupes) {
        const members = type.options.filter((o) => o.type === 'choix' && (o.groupe || 'choix') === g);
        const actives = members.filter((m) => options[m.slug] > 0);
        if (actives.length !== 1) {
          for (const m of members) options[m.slug] = 0;
          const fallback = actives[0] || members.find((m) => m.defaut > 0) || members[0];
          options[fallback.slug] = 1;
        }
      }
      modules.push({
        id: `ai-${Date.now()}-${i}`,
        typeSlug: type.slug,
        largeur: clamp(mod.largeur, type.dimensionsMin.largeur, type.dimensionsMax.largeur),
        hauteur: clamp(mod.hauteur, type.dimensionsMin.hauteur, type.dimensionsMax.hauteur),
        profondeur: clamp(mod.profondeur, type.dimensionsMin.profondeur, type.dimensionsMax.profondeur),
        materialIndex:
          mod.materialIndex !== null && mod.materialIndex >= 0 && mod.materialIndex < materials.length
            ? mod.materialIndex
            : null,
        options,
      });
    }

    if (modules.length === 0) {
      return NextResponse.json({ error: "L'assistant n'a pas réussi à composer ce projet. Précisez votre demande." }, { status: 422 });
    }

    const config: CompositionConfig = {
      version: 2,
      univers: univers.slug,
      materialIndex: clamp(raw.materialIndex, 0, materials.length - 1),
      planTravail: !!raw.planTravail && !!univers.planTravail?.disponible,
      facadeCoulissante: !!raw.facadeCoulissante && !!univers.facadeCoulissante?.disponible,
      facadeVantaux: raw.facadeVantaux ? clamp(raw.facadeVantaux, 2, 4) : undefined,
      lineaireMax: raw.lineaireMax && raw.lineaireMax > 300 ? Math.round(raw.lineaireMax) : null,
      modules,
    };

    return NextResponse.json({ config, explication: raw.explication || '' });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('Assistant configurateur — API error:', err.status, err.message);
      // 503 plutôt que 502 : certains proxys remplacent les 502 par leur propre page HTML
      return NextResponse.json({ error: "L'assistant est momentanément indisponible. Réessayez dans quelques instants." }, { status: 503 });
    }
    console.error('Assistant configurateur error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
