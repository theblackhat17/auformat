import type { Metadata } from 'next';
import { AdminConfigurateurClient } from './AdminConfigurateurClient';

export const metadata: Metadata = { title: 'Configurateur - Admin' };

export default function AdminConfigurateurPage() {
  return <AdminConfigurateurClient />;
}
