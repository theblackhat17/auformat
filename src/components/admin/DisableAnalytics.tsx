'use client';

import { useEffect } from 'react';

/**
 * Exclut ce navigateur des statistiques Umami (mécanisme officiel :
 * `localStorage['umami.disabled']`). Monté dans le layout admin : dès qu'un
 * administrateur ouvre le back-office, son navigateur ne compte plus dans les
 * analytics — y compris lorsqu'il navigue ensuite sur les pages publiques.
 */
export function DisableAnalytics() {
  useEffect(() => {
    try {
      localStorage.setItem('umami.disabled', '1');
    } catch {
      // stockage indisponible (navigation privée stricte) : tant pis, best effort
    }
  }, []);
  return null;
}
