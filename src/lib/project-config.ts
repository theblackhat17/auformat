import { PROJECT_MILESTONES } from '@/lib/constants';
import type { Project, ProjectMilestone, ProjectStatus } from '@/lib/types';

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
  // Par défaut, une étape est montrée au client si on prévient déjà le client dessus.
  clientVisible: CLIENT_NOTIFY_KEYS.has(m.key),
}));

/**
 * Une étape est-elle montrée au client ? Rétrocompatible : les anciens catalogues
 * sans le champ `clientVisible` retombent sur `clientNotify`.
 */
export function isClientVisible(m: ProjectMilestone): boolean {
  return m.clientVisible ?? m.clientNotify;
}

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

/** Dernière étape franchie ET visible par le client (les internes ne fuient jamais) */
export function currentClientMilestone(
  project: ProjectWithMilestones,
  milestones: ProjectMilestone[]
): ProjectMilestone | null {
  let current: ProjectMilestone | null = null;
  for (const m of milestones) {
    if (isClientVisible(m) && project.milestones?.[m.key]?.done === true) current = m;
  }
  return current;
}

type MilestoneState = Record<string, { done?: boolean } | undefined> | null | undefined;

/**
 * Détecte l'étape la plus avancée qui vient d'être FRANCHIE (passée de non-faite
 * à faite) ET marquée « Prévenir le client » (clientNotify). Sert à déclencher
 * l'e-mail automatique au client, sans spam : un seul e-mail (la plus haute étape
 * franchie), jamais sur un retour en arrière. Retourne null si rien à notifier.
 */
export function newlyNotifiedMilestone(
  prev: MilestoneState,
  next: MilestoneState,
  milestones: ProjectMilestone[]
): ProjectMilestone | null {
  let result: ProjectMilestone | null = null;
  for (const m of milestones) {
    if (!m.clientNotify) continue;
    const was = prev?.[m.key]?.done === true;
    const now = next?.[m.key]?.done === true;
    if (now && !was) result = m; // on garde la plus haute (ordre du catalogue)
  }
  return result;
}

/**
 * Statut interne (legacy `projects.status`) dérivé de l'avancement des étapes,
 * pour garder cohérents les signaux qui s'en servent encore (brouillon, terminé,
 * relances). Aucune étape cochée → brouillon ; dernière étape cochée → terminé ;
 * sinon → en cours.
 */
export function deriveProjectStatus(
  project: ProjectWithMilestones,
  milestones: ProjectMilestone[]
): ProjectStatus {
  if (milestones.length === 0) return 'draft';
  const anyDone = milestones.some((m) => project.milestones?.[m.key]?.done === true);
  if (!anyDone) return 'draft';
  const last = milestones[milestones.length - 1];
  if (project.milestones?.[last.key]?.done === true) return 'completed';
  return 'in_production';
}

/** Avancement du projet : nombre de jalons cochés / total du catalogue */
export function milestoneProgress(
  project: ProjectWithMilestones,
  milestones: ProjectMilestone[]
): { done: number; total: number } {
  const done = milestones.filter((m) => project.milestones?.[m.key]?.done === true).length;
  return { done, total: milestones.length };
}
