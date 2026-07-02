import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { rawQuery } from '@/lib/db';
import { getProjectMilestones } from '@/lib/project-config-server';
import { logAdminAction } from '@/lib/activity-logger';
import type { ProjectMilestone } from '@/lib/types';

/**
 * Configuration des projets (admin) : catalogue de jalons stocké dans
 * project_settings (clé/valeur JSONB, même modèle que configurateur_settings).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const milestones = await getProjectMilestones();
    return NextResponse.json({ milestones });
  } catch (err) {
    console.error('Error fetching project settings:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Valide un catalogue de jalons : tableau non vide, items complets, clés uniques */
function validateMilestones(value: unknown): value is ProjectMilestone[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const keys = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') return false;
    const m = item as Record<string, unknown>;
    if (typeof m.key !== 'string' || !m.key.trim()) return false;
    if (typeof m.label !== 'string' || !m.label.trim()) return false;
    if (typeof m.financial !== 'boolean' || typeof m.clientNotify !== 'boolean') return false;
    if (keys.has(m.key)) return false;
    keys.add(m.key);
  }
  return true;
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const milestones = body?.milestones;

    if (!validateMilestones(milestones)) {
      return NextResponse.json({ error: 'Catalogue de jalons invalide' }, { status: 400 });
    }

    // On ne conserve que les champs attendus (pas de propriétés parasites en base)
    const clean: ProjectMilestone[] = milestones.map((m) => ({
      key: m.key.trim(),
      label: m.label.trim(),
      financial: m.financial,
      clientNotify: m.clientNotify,
    }));

    await rawQuery(
      `INSERT INTO project_settings (key, value, updated_at)
       VALUES ('milestones', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify(clean)]
    );

    logAdminAction(request, auth, 'update_project_settings', 'project_settings', null,
      `Catalogue des étapes de projet modifié (${clean.length} étape(s))`);

    return NextResponse.json({ milestones: clean });
  } catch (err) {
    console.error('Error updating project settings:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
