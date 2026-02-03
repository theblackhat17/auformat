import type { Metadata } from 'next';
import { AdminDevisClient } from './AdminDevisClient';

export const metadata: Metadata = { title: 'Gestion des devis' };

export default function AdminDevisPage() {
  return <AdminDevisClient />;
}
