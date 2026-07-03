import type { Metadata } from 'next';
import { AdminMailsClient } from './AdminMailsClient';

export const metadata: Metadata = { title: 'Mails' };

export default function AdminMailsPage() {
  return <AdminMailsClient />;
}
