import type { Metadata } from 'next';
import { AdminRealisationsClient } from './AdminRealisationsClient';

export const metadata: Metadata = { title: 'Realisations' };

export default function AdminRealisationsPage() {
  return <AdminRealisationsClient />;
}
