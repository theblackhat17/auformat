import type { Metadata } from 'next';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Mot de passe oublié' };

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-noir">Mot de passe oublié</h1>
          <p className="text-sm text-noir/50 mt-2">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>
        <ForgotPasswordForm />
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-vert-foret hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
