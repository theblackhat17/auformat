'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Total de messages non lus pour l'utilisateur courant (admin = tous les messages clients,
 * client = tous les messages de l'atelier). Sondage léger + rafraîchi au retour d'onglet.
 */
export function useChatUnread(enabled = true, intervalMs = 20000) {
  const [total, setTotal] = useState(0);

  const refresh = useCallback(() => {
    if (!enabled) return;
    fetch('/api/chat/unread')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const sum = (o: Record<string, number> | undefined) =>
          Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);
        setTotal(sum(d.projects) + sum(d.folders));
      })
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(refresh, intervalMs);
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [enabled, intervalMs, refresh]);

  return { total, refresh };
}
