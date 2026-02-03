'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(email, password);

    if (result.success) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } else {
      setError(result.error || 'Erreur de connexion');
    }

    setIsLoading(false);
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
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="votre@email.fr"
      />
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-noir/70">Mot de passe</label>
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
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
      </div>
      <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
        Se connecter
      </Button>
    </form>
  );
}
