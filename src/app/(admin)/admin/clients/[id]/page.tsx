import type { Metadata } from 'next';
import { ClientDetailClient } from './ClientDetailClient';

export const metadata: Metadata = { title: 'Detail client' };

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDetailClient clientId={id} />;
}
