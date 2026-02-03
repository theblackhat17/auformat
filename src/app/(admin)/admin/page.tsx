import type { Metadata } from 'next';
import { AdminDashboardClient } from './AdminDashboardClient';

export const metadata: Metadata = { title: 'Administration' };

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
