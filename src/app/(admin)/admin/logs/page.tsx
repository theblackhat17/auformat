import type { Metadata } from 'next';
import { AdminLogsClient } from './AdminLogsClient';

export const metadata: Metadata = { title: 'Logs d\'activite' };

export default function AdminLogsPage() {
  return <AdminLogsClient />;
}
