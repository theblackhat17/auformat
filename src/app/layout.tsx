import type { Metadata } from 'next';
import Script from 'next/script';
import { Young_Serif, Hanken_Grotesk } from 'next/font/google';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { getSettings } from '@/lib/content';
import { DEFAULT_THEME_COLORS } from '@/lib/types';
import './globals.css';

const youngSerif = Young_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-young-serif',
  display: 'swap',
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

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

async function getThemeStyle(): Promise<Record<string, string>> {
  try {
    const s = await getSettings();
    return {
      '--color-bois-clair': safeColor(s?.colorBoisClair, DEFAULT_THEME_COLORS.colorBoisClair),
      '--color-bois-fonce': safeColor(s?.colorBoisFonce, DEFAULT_THEME_COLORS.colorBoisFonce),
      '--color-vert-foret': safeColor(s?.colorVertForet, DEFAULT_THEME_COLORS.colorVertForet),
      '--color-vert-foret-dark': safeColor(s?.colorVertForetDark, DEFAULT_THEME_COLORS.colorVertForetDark),
      '--color-beige': safeColor(s?.colorBeige, DEFAULT_THEME_COLORS.colorBeige),
      '--color-noir': safeColor(s?.colorNoir, DEFAULT_THEME_COLORS.colorNoir),
      '--color-blanc': safeColor(s?.colorBlanc, DEFAULT_THEME_COLORS.colorBlanc),
    };
  } catch {
    return {};
  }
}

async function getFontTheme(): Promise<'moderne' | 'classique'> {
  try {
    const s = await getSettings();
    return s?.fontTheme === 'classique' ? 'classique' : 'moderne';
  } catch {
    return 'moderne';
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [themeStyle, fontTheme] = await Promise.all([getThemeStyle(), getFontTheme()]);
  return (
    <html
      lang="fr"
      className={`${youngSerif.variable} ${hankenGrotesk.variable}`}
      data-font-theme={fontTheme}
      style={themeStyle as React.CSSProperties}
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
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
