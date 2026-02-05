'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-blanc flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <p className="text-8xl font-bold text-red-400">500</p>
        <h1 className="mt-4 text-2xl font-bold text-noir">Une erreur est survenue</h1>
        <p className="mt-3 text-noir/50">
          Quelque chose s&apos;est mal passé. Veuillez réessayer ou revenir à l&apos;accueil.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret/90 transition-colors"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-gray-200 text-noir/70 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  );
}
