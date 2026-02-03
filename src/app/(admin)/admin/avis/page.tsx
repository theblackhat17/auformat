import type { Metadata } from 'next';
import { AdminAvisClient } from './AdminAvisClient';

export const metadata: Metadata = { title: 'Avis clients' };

export default function AdminAvisPage() {
  return <AdminAvisClient />;
}
