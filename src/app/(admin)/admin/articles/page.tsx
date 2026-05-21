import type { Metadata } from 'next';
import { AdminArticlesClient } from './AdminArticlesClient';

export const metadata: Metadata = { title: 'Blog' };

export default function AdminArticlesPage() {
  return <AdminArticlesClient />;
}
