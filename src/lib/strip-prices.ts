/**
 * Retire récursivement toute donnée de prix d'un objet `settings` du configurateur.
 *
 * Règle métier absolue : un client (ou tout visiteur non-admin) ne doit JAMAIS
 * pouvoir lire un prix — pas seulement à l'écran, mais aussi dans la réponse
 * réseau brute ou les props React. Ce nettoyage se fait donc côté serveur avant
 * sérialisation.
 *
 * - tout champ numérique dont la clé commence par « prix » (prixM2, prixBase,
 *   prixMl, prix…) → 0
 * - prix textuel (prixEstimatif…) → chaîne vide
 * - table `option_prices` (clés métier : tiroir, porte…) → tout à 0
 */
export function stripPrices(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPrices);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'option_prices' && v && typeof v === 'object') {
        const zeroed: Record<string, unknown> = {};
        for (const ok of Object.keys(v as Record<string, unknown>)) zeroed[ok] = 0;
        out[k] = zeroed;
      } else if (/^prix/i.test(k)) {
        out[k] = typeof v === 'number' ? 0 : typeof v === 'string' ? '' : stripPrices(v);
      } else {
        out[k] = stripPrices(v);
      }
    }
    return out;
  }
  return value;
}
