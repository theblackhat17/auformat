import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = { title: 'Mon profil' };

export default function ProfilPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-noir mb-8">Mon profil</h1>
      <ProfileClient />
    </div>
  );
}
