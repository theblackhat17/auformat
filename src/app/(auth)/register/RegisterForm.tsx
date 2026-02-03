'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterForm() {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', fullName: '', companyName: '', phone: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
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
      router.push('/profil');
    } else {
      setError(result.error || "Erreur lors de l'inscription");
    }
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg animate-slide-down">{error}</div>}
      <Input id="email" label="Email *" type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} required placeholder="votre@email.fr" />
      <div className="space-y-1.5">
        <label htmlFor="reg-password" className="block text-sm font-medium text-noir/70">Mot de passe *</label>
        <input id="reg-password" type="password" value={formData.password} onChange={(e) => updateField('password', e.target.value)} required minLength={6} placeholder="Minimum 6 caracteres" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-noir placeholder-noir/30 focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10 focus:bg-white" />
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
      <Input id="companyName" label="Societe (optionnel)" value={formData.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Nom de votre societe" />
      <Input id="phone" label="Telephone (optionnel)" type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="06 12 34 56 78" />
      <label className="flex items-start gap-2 text-xs text-noir/50">
        <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-vert-foret" />
        J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialite.
      </label>
      <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
        Creer mon compte
      </Button>
    </form>
  );
}
