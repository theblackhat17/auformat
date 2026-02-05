'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      nom: formData.get('nom') as string,
      prenom: formData.get('prenom') as string,
      email: formData.get('email') as string,
      telephone: formData.get('telephone') as string,
      ville: formData.get('ville') as string,
      codePostal: formData.get('codePostal') as string,
      typeProjet: formData.get('typeProjet') as string,
      message: formData.get('message') as string,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || 'Une erreur est survenue');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-16 bg-vert-foret/5 rounded-2xl">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-noir mb-2">Message envoyé !</h3>
        <p className="text-sm text-noir/50">Un email de confirmation vous a été envoyé.<br />Nous vous répondrons dans les 24 heures.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <Input id="nom" label="Nom *" name="nom" required placeholder="Votre nom" />
        <Input id="prenom" label="Prénom *" name="prenom" required placeholder="Votre prénom" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input id="email" label="Email *" name="email" type="email" required placeholder="votre@email.fr" />
        <Input id="telephone" label="Téléphone *" name="telephone" type="tel" required placeholder="06 12 34 56 78" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input id="ville" label="Ville *" name="ville" required placeholder="Votre ville" />
        <Input id="codePostal" label="Code postal *" name="codePostal" required placeholder="59000" maxLength={5} />
      </div>
      <div>
        <label htmlFor="typeProjet" className="block text-sm font-medium text-noir/70 mb-1.5">Type de projet</label>
        <select id="typeProjet" name="typeProjet" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-noir focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10">
          <option value="">Sélectionnez...</option>
          <option value="Dressing">Dressing</option>
          <option value="Cuisine">Cuisine</option>
          <option value="Bibliothèque">Bibliothèque</option>
          <option value="Placard / Rangement">Placard / Rangement</option>
          <option value="Agencement commerce">Agencement commerce</option>
          <option value="Menuiserie extérieure">Menuiserie extérieure</option>
          <option value="Autre">Autre</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-noir/70 mb-1.5">Message *</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Décrivez votre projet..."
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-noir placeholder-noir/30 focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10 resize-none"
        />
      </div>
      <label className="flex items-start gap-2 text-xs text-noir/50">
        <input type="checkbox" required className="mt-0.5 accent-vert-foret" />
        J&apos;accepte que mes données soient traitées dans le cadre de ma demande de contact, conformément à la politique de confidentialité.
      </label>
      <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full sm:w-auto">
        Envoyer ma demande
      </Button>
    </form>
  );
}
