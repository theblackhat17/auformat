import type { Metadata } from 'next';
import { RegisterForm } from './RegisterForm';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Inscription' };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-noir">Creer un compte</h1>
          <p className="text-sm text-noir/50 mt-2">Rejoignez Au Format pour gerer vos projets</p>
        </div>
        <RegisterForm />
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-vert-foret hover:underline">
            Deja un compte ? Connectez-vous
          </Link>
        </div>
      </div>
    </div>
  );
}
