'use client';

import { useState } from 'react';
import type { CompositionConfig } from '@/lib/types';

const EXAMPLES = [
  'Une cuisine de 3,20 m avec frigo intégré, lave-vaisselle et beaucoup de tiroirs',
  'Un dressing de 2,50 m avec penderie double, tiroirs et portes coulissantes',
  'Un meuble vasque suspendu de 1,20 m avec une colonne et un miroir éclairé',
];

export function AssistantModal({
  currentConfig,
  onResult,
  onClose,
}: {
  /** Composition en cours (pour la modifier) ; absent = création depuis zéro */
  currentConfig?: CompositionConfig;
  onResult: (config: CompositionConfig, explication: string) => void;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/configurateur/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentConfig }),
      });
      // Le corps peut ne pas être du JSON si un proxy a intercepté la réponse
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "L'assistant est momentanément indisponible. Réessayez dans quelques instants.");
        return;
      }
      onResult(data.config, data.explication);
      onClose();
    } catch {
      setError('Erreur de connexion. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-noir/45 animate-fade-in" onClick={loading ? undefined : onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] w-full max-w-lg animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-noir/8">
          <h2 className="font-display text-xl text-noir flex items-center gap-2.5">
            <svg className="w-5 h-5 text-vert-foret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
              <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
            </svg>
            {currentConfig ? 'Modifier avec l\'assistant' : 'Composer avec l\'assistant'}
          </h2>
          <button onClick={onClose} disabled={loading} aria-label="Fermer" className="p-1.5 rounded-full hover:bg-beige/70 text-noir/55 hover:text-noir transition-colors disabled:opacity-40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <p className="text-sm text-noir/70 leading-relaxed mb-4">
            {currentConfig
              ? 'Décrivez ce que vous voulez changer : l\'assistant ajuste votre composition.'
              : 'Décrivez votre projet en quelques phrases : dimensions, rangements souhaités, matériau… L\'assistant compose un premier agencement que vous pourrez ajuster.'}
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            autoFocus
            disabled={loading}
            placeholder={EXAMPLES[0]}
            aria-label="Description de votre projet"
            className="w-full px-3.5 py-2.5 bg-white border border-noir/20 rounded-lg text-sm placeholder-noir/55 focus:outline-none focus:border-vert-foret focus:ring-[3px] focus:ring-vert-foret/15 resize-none disabled:opacity-60"
          />

          {!currentConfig && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={loading}
                  onClick={() => setPrompt(ex)}
                  className="text-xs text-bois-fonce bg-beige hover:bg-beige/70 px-2.5 py-1.5 rounded-full transition-colors text-left disabled:opacity-50"
                >
                  {ex.length > 52 ? ex.slice(0, 52) + '…' : ex}
                </button>
              ))}
            </div>
          )}

          {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={loading || prompt.trim().length < 10} className="btn-primary w-full mt-4 disabled:opacity-60">
            {loading ? (
              <span className="inline-flex items-center gap-2.5">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                L&apos;assistant compose votre projet… (jusqu&apos;à une minute pour les grands projets)
              </span>
            ) : (
              'Composer mon projet'
            )}
          </button>
          <p className="text-xs text-noir/55 text-center mt-3">
            Proposition indicative générée par IA à partir de notre catalogue — vous gardez la main sur chaque détail.
          </p>
        </form>
      </div>
    </div>
  );
}
