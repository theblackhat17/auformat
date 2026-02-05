import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Page introuvable' };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-blanc flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <p className="text-8xl font-bold text-vert-foret">404</p>
        <h1 className="mt-4 text-2xl font-bold text-noir">Page introuvable</h1>
        <p className="mt-3 text-noir/50">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret/90 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-gray-200 text-noir/70 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Nous contacter
          </Link>
        </div>
      </div>
    </div>
  );
}
