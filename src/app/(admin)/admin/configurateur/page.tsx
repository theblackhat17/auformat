import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminConfigurateurClient } from './AdminConfigurateurClient';

export const metadata: Metadata = { title: 'Configurateur - Admin' };

export default function AdminConfigurateurPage() {
  return (
    <Suspense fallback={null}>
      <AdminConfigurateurClient />
    </Suspense>
  );
}
