'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hp, setHp] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Honeypot: if filled, silently show success
    if (hp) {
      setSuccess(true);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: '/reset-password' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Une erreur est survenue. Veuillez réessayer.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    }

    setIsLoading(false);
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-noir/70">
          Si un compte existe avec l&apos;adresse <strong>{email}</strong>, vous recevrez un email avec un lien de réinitialisation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg animate-slide-down">
          {error}
        </div>
      )}
      <Input
        id="email"
        label="Adresse email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="votre@email.fr"
      />
      {/* Honeypot */}
      <div className="absolute opacity-0 -z-10 overflow-hidden" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
        Envoyer le lien
      </Button>
    </form>
  );
}
