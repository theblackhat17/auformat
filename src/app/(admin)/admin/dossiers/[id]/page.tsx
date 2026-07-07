import type { Metadata } from 'next';
import { DossierDetailClient } from './DossierDetailClient';

export const metadata: Metadata = { title: 'Dossier' };

export default async function AdminDossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DossierDetailClient folderId={id} />;
}
