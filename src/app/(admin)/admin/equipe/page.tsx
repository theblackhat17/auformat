import type { Metadata } from 'next';
import { AdminEquipeClient } from './AdminEquipeClient';

export const metadata: Metadata = { title: 'Equipe' };

export default function AdminEquipePage() {
  return <AdminEquipeClient />;
}
