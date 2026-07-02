import { queryOne } from '@/lib/db';
import { DEFAULT_MILESTONES } from '@/lib/project-config';
import type { ProjectMilestone } from '@/lib/types';

/**
 * Lecture serveur du catalogue de jalons configuré.
 * Séparé de project-config.ts pour que les helpers purs (currentMilestone,
 * milestoneProgress) restent importables depuis les composants client
 * sans embarquer le driver PostgreSQL.
 */

/**
 * Catalogue de jalons configuré (côté serveur) : lit project_settings,
 * retombe sur DEFAULT_MILESTONES si la table/clé est absente ou vide.
 */
export async function getProjectMilestones(): Promise<ProjectMilestone[]> {
  try {
    const row = await queryOne<{ value: unknown }>(
      `SELECT value FROM project_settings WHERE key = 'milestones'`
    );
    if (row && Array.isArray(row.value) && row.value.length > 0) {
      return row.value as ProjectMilestone[];
    }
  } catch (err) {
    // Table absente (migration non exécutée) : on retombe sur le défaut
    console.error('getProjectMilestones fallback:', err);
  }
  return DEFAULT_MILESTONES;
}
