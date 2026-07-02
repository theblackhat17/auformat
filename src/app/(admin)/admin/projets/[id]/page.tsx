import type { Metadata } from 'next';
import { ProjectDetailClient } from './ProjectDetailClient';

export const metadata: Metadata = { title: 'Projet' };

export default async function AdminProjetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailClient projectId={id} />;
}
