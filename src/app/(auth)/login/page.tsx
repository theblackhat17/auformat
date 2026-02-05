import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './LoginForm';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Connexion' };

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-noir">Connexion</h1>
          <p className="text-sm text-noir/50 mt-2">Accédez à votre espace client Au Format</p>
        </div>
        <Suspense fallback={<div className="text-center py-8 text-noir/30">Chargement...</div>}>
          <LoginForm />
        </Suspense>
        <div className="mt-6 text-center space-y-2">
          <Link href="/forgot-password" className="text-sm text-noir/50 hover:text-noir/70 hover:underline block">
            Mot de passe oublié ?
          </Link>
          <Link href="/register" className="text-sm text-vert-foret hover:underline block">
            Pas encore de compte ? Inscrivez-vous
          </Link>
        </div>
      </div>
    </div>
  );
}
