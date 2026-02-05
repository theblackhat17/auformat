'use client';

import { Suspense, useState, useEffect } from 'react';
import { Configurateur2D } from '@/components/configurateur-2d/Configurateur2D';
import type { ConfigurateurSettings } from '@/lib/types';

export default function ConfigurateurPageClient() {
  return (
    <Suspense fallback={<Loading />}>
      <ConfigurateurLoader />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#2C5F2D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Chargement du configurateur...</p>
      </div>
    </div>
  );
}

function ConfigurateurLoader() {
  const [settings, setSettings] = useState<ConfigurateurSettings | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/content/configurateur')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setSettings(data))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Impossible de charger le configurateur.</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-[#2C5F2D] hover:underline"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return <Loading />;
  }

  return <Configurateur2D settings={settings} />;
}
