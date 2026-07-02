import type { Metadata } from 'next';
import { AgendaClient } from './AgendaClient';

export const metadata: Metadata = { title: 'Agenda' };

export default function AdminAgendaPage() {
  return <AgendaClient />;
}
