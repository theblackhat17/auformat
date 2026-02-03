import type { Metadata } from 'next';
import { AdminClientsClient } from './AdminClientsClient';

export const metadata: Metadata = { title: 'Clients' };

export default function AdminClientsPage() {
  return <AdminClientsClient />;
}
