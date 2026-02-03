import type { Metadata } from 'next';
import { AdminSettingsClient } from './AdminSettingsClient';

export const metadata: Metadata = { title: 'Parametres du site' };

export default function AdminSettingsPage() {
  return <AdminSettingsClient />;
}
