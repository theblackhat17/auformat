import type { Metadata } from 'next';
import { AdminPageContentClient } from './AdminPageContentClient';

export const metadata: Metadata = { title: 'Contenu des pages' };

export default function AdminPageContentPage() {
  return <AdminPageContentClient />;
}
