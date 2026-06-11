'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Configurateur2D } from '@/components/configurateur-2d/Configurateur2D';
import { ConfigurateurCompo, readCompoDraft } from '@/components/configurateur-compo/ConfigurateurCompo';
import { UniversGate } from '@/components/configurateur-compo/UniversGate';
import type { CompositionConfig, ConfigurateurSettings, Project } from '@/lib/types';

export default function ConfigurateurPageClient() {
  return (
    <Suspense fallback={<Loading />}>
      <ConfigurateurLoader />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="min-h-screen bg-beige/40 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-noir/60">Chargement du configurateur…</p>
      </div>
    </div>
  );
}

type View =
  | { kind: 'gate' }
  | { kind: 'meuble' }
  | { kind: 'compo'; config: CompositionConfig; projectId: string | null; projectName: string | null };

function ConfigurateurLoader() {
  const searchParams = useSearchParams();
  const projectParam = searchParams.get('project');
  const reprendreParam = searchParams.get('reprendre');

  const [settings, setSettings] = useState<ConfigurateurSettings | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    fetch('/api/content/configurateur')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setSettings(data))
      .catch(() => setError(true));
  }, []);

  /* Rechargement d'un projet enregistré (?project=ID) */
  useEffect(() => {
    if (!settings || view) return;
    if (!projectParam) {
      // Reprise directe du brouillon (ex. « Personnaliser » depuis une page de partage)
      if (reprendreParam) {
        const d = readCompoDraft();
        if (d) {
          setView({ kind: 'compo', config: d.config, projectId: d.projectId, projectName: d.projectName });
          return;
        }
      }
      setView({ kind: 'gate' });
      return;
    }
    fetch(`/api/projects/${projectParam}`)
      .then((res) => {
        if (res.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent(`/configurateur?project=${projectParam}`)}`;
          return null;
        }
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((project: Project | null) => {
        if (!project) return;
        const config = project.config as unknown;
        if (config && typeof config === 'object' && (config as CompositionConfig).version === 2) {
          setView({ kind: 'compo', config: config as CompositionConfig, projectId: project.id, projectName: project.name });
        } else {
          // Projet de l'ancien configurateur mono-meuble
          setView({ kind: 'meuble' });
        }
      })
      .catch(() => setView({ kind: 'gate' }));
  }, [settings, projectParam, reprendreParam, view]);

  if (error) {
    return (
      <div className="min-h-screen bg-beige/40 flex items-center justify-center">
        <div className="text-center">
          <p className="text-noir/70 mb-2">Impossible de charger le configurateur.</p>
          <button onClick={() => window.location.reload()} className="text-sm text-vert-foret hover:underline">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!settings || !view) {
    return <Loading />;
  }

  if (view.kind === 'meuble') {
    return (
      <div className="bg-beige/40 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 pt-6 -mb-4">
          <button
            onClick={() => setView({ kind: 'gate' })}
            className="inline-flex items-center gap-2 text-sm font-semibold text-noir/70 hover:text-vert-foret transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
            Changer d&apos;univers
          </button>
        </div>
        <Configurateur2D settings={settings} />
      </div>
    );
  }

  if (view.kind === 'compo') {
    return (
      <ConfigurateurCompo
        key={view.projectId || 'draft'}
        settings={settings}
        initialConfig={view.config}
        initialProjectId={view.projectId}
        initialProjectName={view.projectName}
        onBackToUnivers={() => setView({ kind: 'gate' })}
      />
    );
  }

  const draft = typeof window !== 'undefined' ? readCompoDraft() : null;

  return (
    <UniversGate
      settings={settings}
      hasDraft={!!draft}
      onResumeDraft={() => {
        const d = readCompoDraft();
        if (d) setView({ kind: 'compo', config: d.config, projectId: d.projectId, projectName: d.projectName });
      }}
      onStart={(config) => setView({ kind: 'compo', config, projectId: null, projectName: null })}
    />
  );
}
