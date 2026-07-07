import { redirect } from 'next/navigation';
import { getSettings } from './content';

/**
 * Pages publiques désactivées par l'admin (site_settings.disabled_pages).
 * Une page désactivée est retirée de la navigation et son URL redirige vers
 * l'accueil (voir assertPageEnabled, utilisé en tête des pages concernées).
 */
export async function getDisabledPages(): Promise<string[]> {
  const settings = await getSettings();
  const disabled = (settings?.disabledPages as string[] | undefined) ?? [];
  return Array.isArray(disabled) ? disabled : [];
}

/** Filtre une liste de liens de nav en retirant les pages désactivées. */
export function filterNav<T extends { href: string }>(links: T[], disabled: string[]): T[] {
  const set = new Set(disabled);
  return links.filter((l) => !set.has(l.href));
}

/**
 * À appeler en tête d'une page publique désactivable : si l'admin a désactivé
 * cette page, redirige vers l'accueil (URL rendue inaccessible).
 */
export async function assertPageEnabled(href: string): Promise<void> {
  const disabled = await getDisabledPages();
  if (disabled.includes(href)) redirect('/');
}
