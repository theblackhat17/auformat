'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Script de tracking Umami. Jamais chargé dans le back-office (/admin) : le
 * trafic des administrateurs ne doit pas polluer les statistiques. En
 * complément, tout navigateur ayant ouvert l'admin est exclu définitivement
 * via localStorage['umami.disabled'] (voir DisableAnalytics).
 */
export function UmamiScript() {
  const pathname = usePathname();
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  if (!websiteId || pathname.startsWith('/admin')) return null;

  return (
    <Script
      defer
      src={`${process.env.NEXT_PUBLIC_UMAMI_URL || '/umami'}/stats.js`}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
