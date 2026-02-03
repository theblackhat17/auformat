import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Au Format - Menuiserie sur mesure',
    template: '%s | Au Format',
  },
  description: 'Franchissons ensemble le pas vers le bois. Menuiserie et agencement sur mesure dans la region lilloise.',
  keywords: ['menuiserie', 'sur mesure', 'bois', 'agencement', 'Lille', 'dressing', 'cuisine'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-blanc text-noir antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
