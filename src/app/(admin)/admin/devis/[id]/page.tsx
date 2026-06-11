import { AdminDevisEditClient } from './AdminDevisEditClient';

export const metadata = { title: 'Édition du devis — Administration' };

export default async function AdminDevisEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminDevisEditClient quoteId={id} />;
}
