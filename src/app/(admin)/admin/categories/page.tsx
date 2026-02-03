import type { Metadata } from 'next';
import { AdminCategoriesClient } from './AdminCategoriesClient';

export const metadata: Metadata = { title: 'Categories' };

export default function AdminCategoriesPage() {
  return <AdminCategoriesClient />;
}
