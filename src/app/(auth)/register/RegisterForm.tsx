'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function RegisterForm() {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', fullName: '', companyName: '', phone: '', _hp: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function getPasswordStrength(): number {
    const p = formData.password;
    let strength = 0;
    if (p.length >= 6) strength++;
    if (p.length >= 8) strength++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) strength++;
    if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) strength++;
    return strength;
  }

  const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];
  const strength = getPasswordStrength();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Honeypot check
    if (formData._hp) {
      setEmailSent(true);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!acceptTerms) {
      setError('Veuillez accepter les conditions');
      return;
    }

    setIsLoading(true);
    const result = await register({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName || undefined,
      companyName: formData.companyName || undefined,
      phone: formData.phone || undefined,
    });

    if (result.success) {
      setEmailSent(true);
    } else {
      setError(result.error || "Erreur lors de l'inscription");
    }
    setIsLoading(false);
  }

  async function handleGoogleSignUp() {
    try {
      await authClient.signIn.social({ provider: 'google' });
    } catch {
      setError('Erreur lors de la connexion avec Google');
    }
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-vert-foret/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-vert-foret" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-noir">Vérifiez votre email</h3>
        <p className="text-sm text-noir/60 max-w-xs mx-auto">
          Un email de vérification a été envoyé à <strong>{formData.email}</strong>. Cliquez sur le lien pour activer votre compte.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="text-sm text-vert-foret hover:underline font-medium"
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg animate-slide-down">{error}</div>}

      {/* Google Sign Up */}
      <button
        onClick={handleGoogleSignUp}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-noir/70 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <GoogleIcon />
        S&apos;inscrire avec Google
      </button>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-noir/40">Ou avec votre email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="email" label="Email *" type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} required placeholder="votre@email.fr" />
        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="block text-sm font-medium text-noir/70">Mot de passe *</label>
          <input id="reg-password" type="password" value={formData.password} onChange={(e) => updateField('password', e.target.value)} required minLength={6} placeholder="Minimum 6 caractères" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-noir placeholder-noir/30 focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10 focus:bg-white" />
          {formData.password && (
            <div className="flex gap-1 mt-1.5">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i < strength ? strengthColors[strength - 1] : 'bg-gray-200'}`} />
              ))}
            </div>
          )}
        </div>
        <Input id="confirmPassword" label="Confirmer le mot de passe *" type="password" value={formData.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} required minLength={6} placeholder="Retapez votre mot de passe" />
        <Input id="fullName" label="Nom complet" value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Jean Dupont" />
        <Input id="companyName" label="Société (optionnel)" value={formData.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Nom de votre société" />
        <Input id="phone" label="Téléphone (optionnel)" type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="06 12 34 56 78" />
        {/* Honeypot */}
        <div className="absolute opacity-0 -z-10 overflow-hidden" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
          <input type="text" value={formData._hp} onChange={(e) => updateField('_hp', e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>
        <label className="flex items-start gap-2 text-xs text-noir/50">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-vert-foret" />
          J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité.
        </label>
        <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
          Créer mon compte
        </Button>
      </form>
    </div>
  );
}
