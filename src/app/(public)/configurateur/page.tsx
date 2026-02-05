import type { Metadata } from 'next';
import ConfigurateurPageClient from './ConfigurateurPageClient';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/configurateur', {
    title: 'Configurateur de meubles sur mesure en ligne',
    description: 'Configurez votre meuble sur mesure en ligne : bibliotheque, dressing, meuble TV, bureau, plan de travail. Devis instantane.',
    keywords: ['configurateur meuble sur mesure', 'meuble sur mesure en ligne', 'configurateur dressing', 'devis meuble en ligne'],
  });
}

export default function ConfigurateurPage() {
  return <ConfigurateurPageClient />;
}
