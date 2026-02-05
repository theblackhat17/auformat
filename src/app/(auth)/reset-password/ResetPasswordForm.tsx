'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const token = searchParams.get('token');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!token) {
      setError('Lien de réinitialisation invalide ou expiré.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password, token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.message || 'Erreur lors de la réinitialisation.';
        setError(msg === 'INVALID_TOKEN' ? 'Lien expiré ou invalide. Veuillez refaire une demande.' : msg);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    }

    setIsLoading(false);
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600 mb-4">
          Lien de réinitialisation invalide ou expiré.
        </p>
        <Link href="/forgot-password" className="text-sm text-vert-foret hover:underline">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-noir/70 mb-4">
          Votre mot de passe a été réinitialisé avec succès.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret/90 transition-colors"
        >
          Se connecter
        </Link>
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
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-noir/70">Nouveau mot de passe</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-noir placeholder-noir/30 transition-colors focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10 focus:bg-white pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-noir/30 hover:text-noir/50 text-sm"
          >
            {showPassword ? '\u{1F648}' : '\u{1F441}'}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-noir/70">Confirmer le mot de passe</label>
        <input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          placeholder="••••••••"
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-noir placeholder-noir/30 transition-colors focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10 focus:bg-white"
        />
      </div>
      <p className="text-xs text-noir/40">Minimum 6 caractères</p>
      <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
        Réinitialiser le mot de passe
      </Button>
    </form>
  );
}
