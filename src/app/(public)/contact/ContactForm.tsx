'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="text-center py-16 bg-vert-foret/5 rounded-2xl">
        <span className="text-5xl mb-4 block">✅</span>
        <h3 className="text-xl font-semibold text-noir mb-2">Message envoyé !</h3>
        <p className="text-sm text-noir/50">Nous vous répondrons dans les 24 heures.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          <option value="dressing">Dressing</option>
          <option value="cuisine">Cuisine</option>
          <option value="bibliotheque">Bibliothèque</option>
          <option value="placard">Placard / Rangement</option>
          <option value="commerce">Agencement commerce</option>
          <option value="exterieur">Menuiserie extérieure</option>
          <option value="autre">Autre</option>
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
