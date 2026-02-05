import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Réinitialiser le mot de passe' };

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-noir">Nouveau mot de passe</h1>
          <p className="text-sm text-noir/50 mt-2">Choisissez votre nouveau mot de passe</p>
        </div>
        <Suspense fallback={<div className="text-center py-8 text-noir/30">Chargement...</div>}>
          <ResetPasswordForm />
        </Suspense>
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-vert-foret hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
