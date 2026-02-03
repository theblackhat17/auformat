import type { Metadata } from 'next';
import { AdminMateriauxClient } from './AdminMateriauxClient';

export const metadata: Metadata = { title: 'Materiaux' };

export default function AdminMateriauxPage() {
  return <AdminMateriauxClient />;
}
