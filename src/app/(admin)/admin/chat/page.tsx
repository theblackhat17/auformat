import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminChatClient } from './AdminChatClient';

export const metadata: Metadata = { title: 'Messagerie' };

export default function AdminChatPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-noir/40">Chargement…</div>}>
      <AdminChatClient />
    </Suspense>
  );
}
