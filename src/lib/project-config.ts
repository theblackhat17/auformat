import { PROJECT_MILESTONES } from '@/lib/constants';
import type { Project, ProjectMilestone } from '@/lib/types';

/**
 * Configuration des projets (jalons configurables) — helpers PURS, sans accès DB,
 * importables depuis les composants client comme serveur.
 * Le catalogue de jalons est stocké dans project_settings (clé « milestones »)
 * et éditable depuis /admin/projets/config ; PROJECT_MILESTONES reste le fallback.
 * La lecture serveur du catalogue vit dans project-config-server.ts.
 */

/** Grandes étapes visibles côté client : notification activée par défaut */
const CLIENT_NOTIFY_KEYS = new Set(['envoye_3d', 'production', 'pose']);

/** Catalogue par défaut, dérivé des constantes historiques */
export const DEFAULT_MILESTONES: ProjectMilestone[] = PROJECT_MILESTONES.map((m) => ({
  key: m.key,
  label: m.label,
  financial: m.financial,
  clientNotify: CLIENT_NOTIFY_KEYS.has(m.key),
}));

/** Projet minimal porteur de jalons (Project ou sous-ensemble) */
type ProjectWithMilestones = Pick<Project, 'milestones'>;

/** Dernier jalon franchi (dans l'ordre du catalogue), ou null si aucun */
export function currentMilestone(
  project: ProjectWithMilestones,
  milestones: ProjectMilestone[]
): ProjectMilestone | null {
  let current: ProjectMilestone | null = null;
  for (const m of milestones) {
    if (project.milestones?.[m.key]?.done === true) current = m;
  }
  return current;
}

/** Avancement du projet : nombre de jalons cochés / total du catalogue */
export function milestoneProgress(
  project: ProjectWithMilestones,
  milestones: ProjectMilestone[]
): { done: number; total: number } {
  const done = milestones.filter((m) => project.milestones?.[m.key]?.done === true).length;
  return { done, total: milestones.length };
}
