import type { Metadata } from 'next';
import { AdminProjetsClient } from './AdminProjetsClient';

export const metadata: Metadata = { title: 'Suivi des projets' };

export default function AdminProjetsPage() {
  return <AdminProjetsClient />;
}
