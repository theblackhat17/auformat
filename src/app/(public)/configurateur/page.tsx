import type { Metadata } from 'next';
import ConfigurateurPageClient from './ConfigurateurPageClient';

export const metadata: Metadata = {
  title: 'Configurateur de meubles sur mesure en ligne',
  description:
    'Configurez votre meuble sur mesure en ligne : bibliotheque, dressing, meuble TV, bureau, plan de travail. Choisissez vos dimensions, materiaux et options. Devis instantane. Au Format, menuiserie a Cysoing et La Calotterie.',
  keywords: ['configurateur meuble sur mesure', 'meuble sur mesure en ligne', 'configurateur dressing', 'configurateur bibliotheque', 'devis meuble en ligne'],
  alternates: { canonical: 'https://www.auformat.com/configurateur' },
  openGraph: {
    title: 'Configurateur de meubles - Au Format',
    description: 'Configurez votre meuble sur mesure en ligne et obtenez un devis instantane.',
    url: 'https://www.auformat.com/configurateur',
  },
};

export default function ConfigurateurPage() {
  return <ConfigurateurPageClient />;
}
