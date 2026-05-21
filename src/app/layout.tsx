import type { Metadata } from 'next';
import Script from 'next/script';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { getSettings } from '@/lib/content';
import { DEFAULT_THEME_COLORS } from '@/lib/types';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://auformat.com'),
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  title: {
    default: 'Au Format | Menuiserie sur mesure a Cysoing (Lille) et Montreuil-sur-Mer (Le Touquet)',
    template: '%s | Au Format - Menuiserie sur mesure',
  },
  description:
    'Au Format, menuiserie et agencement sur mesure dans le Nord et le Pas-de-Calais. Meubles, dressings, cuisines, bibliothèques en bois massif. Ateliers à Cysoing près de Lille et à La Calotterie près du Touquet-Paris-Plage. Devis gratuit.',
  authors: [{ name: 'Au Format' }],
  creator: 'Au Format',
  publisher: 'Au Format',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://auformat.com',
    siteName: 'Au Format',
    title: 'Au Format | Menuiserie sur mesure Nord & Pas-de-Calais',
    description:
      'Conception et fabrication de meubles sur mesure, dressings, cuisines et agencements en bois massif. Ateliers a Cysoing et La Calotterie.',
    images: [
      {
        url: 'https://auformat.com/api/og?title=Au+Format+%7C+Menuiserie+sur+mesure&path=%2F',
        width: 1200,
        height: 630,
        alt: 'Au Format - Menuiserie sur mesure Nord & Pas-de-Calais',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Au Format | Menuiserie sur mesure',
    description:
      'Meubles sur mesure, dressings, cuisines en bois massif. Cysoing (Lille) & La Calotterie (Le Touquet).',
    images: ['https://auformat.com/api/og?title=Au+Format+%7C+Menuiserie+sur+mesure&path=%2F'],
  },
  alternates: {
    canonical: 'https://auformat.com',
  },
  category: 'Menuiserie',
};

const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

function safeColor(value: string | null | undefined, fallback: string): string {
  return value && HEX.test(value) ? value : fallback;
}

async function getThemeCss(): Promise<string> {
  try {
    const s = await getSettings();
    const colors = {
      boisClair: safeColor(s?.colorBoisClair, DEFAULT_THEME_COLORS.colorBoisClair),
      boisFonce: safeColor(s?.colorBoisFonce, DEFAULT_THEME_COLORS.colorBoisFonce),
      vertForet: safeColor(s?.colorVertForet, DEFAULT_THEME_COLORS.colorVertForet),
      vertForetDark: safeColor(s?.colorVertForetDark, DEFAULT_THEME_COLORS.colorVertForetDark),
      beige: safeColor(s?.colorBeige, DEFAULT_THEME_COLORS.colorBeige),
      noir: safeColor(s?.colorNoir, DEFAULT_THEME_COLORS.colorNoir),
      blanc: safeColor(s?.colorBlanc, DEFAULT_THEME_COLORS.colorBlanc),
    };
    return `:root{--color-bois-clair:${colors.boisClair};--color-bois-fonce:${colors.boisFonce};--color-vert-foret:${colors.vertForet};--color-vert-foret-dark:${colors.vertForetDark};--color-beige:${colors.beige};--color-noir:${colors.noir};--color-blanc:${colors.blanc};}`;
  } catch {
    return '';
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const themeCss = await getThemeCss();
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      </head>
      <body className="min-h-screen bg-blanc text-noir antialiased">
        {children}
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            defer
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL || '/umami'}/stats.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
