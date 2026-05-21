import type { Metadata } from 'next';
import { AdminServicesClient } from './AdminServicesClient';

export const metadata: Metadata = { title: 'Services' };

export default function AdminServicesPage() {
  return <AdminServicesClient />;
}
