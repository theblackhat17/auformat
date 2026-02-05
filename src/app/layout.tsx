import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { SEO_KEYWORDS } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.auformat.com'),
  title: {
    default: 'Au Format | Menuiserie sur mesure a Cysoing (Lille) et Montreuil-sur-Mer (Le Touquet)',
    template: '%s | Au Format - Menuiserie sur mesure',
  },
  description:
    'Au Format, menuiserie et agencement sur mesure dans le Nord et le Pas-de-Calais. Meubles, dressings, cuisines, bibliotheques en bois massif. Ateliers a Cysoing pres de Lille et a La Calotterie pres du Touquet-Paris-Plage. Devis gratuit.',
  keywords: SEO_KEYWORDS,
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
    url: 'https://www.auformat.com',
    siteName: 'Au Format',
    title: 'Au Format | Menuiserie sur mesure Nord & Pas-de-Calais',
    description:
      'Conception et fabrication de meubles sur mesure, dressings, cuisines et agencements en bois massif. Ateliers a Cysoing et La Calotterie.',
    images: [
      {
        url: '/img/logo_tmp.png',
        width: 800,
        height: 600,
        alt: 'Au Format - Menuiserie sur mesure',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Au Format | Menuiserie sur mesure',
    description:
      'Meubles sur mesure, dressings, cuisines en bois massif. Cysoing (Lille) & La Calotterie (Le Touquet).',
    images: ['/img/logo_tmp.png'],
  },
  alternates: {
    canonical: 'https://www.auformat.com',
  },
  category: 'Menuiserie',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-blanc text-noir antialiased">
        <AuthProvider>{children}</AuthProvider>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
      </body>
    </html>
  );
}
