import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ConfigurateurPageClient from './ConfigurateurPageClient';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { getSettings } from '@/lib/content';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/configurateur', {
    title: 'Configurateur de meubles sur mesure en ligne',
    description: 'Configurez votre meuble sur mesure en ligne : bibliothèque, dressing, meuble TV, bureau, plan de travail. Devis instantané.',
    keywords: ['configurateur meuble sur mesure', 'meuble sur mesure en ligne', 'configurateur dressing', 'devis meuble en ligne'],
  });
}

export default async function ConfigurateurPage() {
  const settings = await getSettings();
  if (!settings?.configurateurEnabled) redirect('/');

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', url: SITE_URL }, { name: 'Configurateur', url: `${SITE_URL}/configurateur` }])} />
      <ConfigurateurPageClient />
    </>
  );
}
