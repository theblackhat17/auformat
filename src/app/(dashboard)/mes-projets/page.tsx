import type { Metadata } from 'next';
import { MesProjetsClient } from './MesProjetsClient';

export const metadata: Metadata = { title: 'Mes projets' };

export default function MesProjetsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
      <MesProjetsClient />
    </div>
  );
}
