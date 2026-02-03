import type { Metadata } from 'next';
import { MesDevisClient } from './MesDevisClient';

export const metadata: Metadata = { title: 'Mes devis' };

export default function MesDevisPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
      <MesDevisClient />
    </div>
  );
}
