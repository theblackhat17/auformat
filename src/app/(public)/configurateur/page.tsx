import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ConfigurateurPageClient from './ConfigurateurPageClient';
import { buildPageMetadata } from '@/lib/seo';
import { getSettings } from '@/lib/content';

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

  return <ConfigurateurPageClient />;
}
