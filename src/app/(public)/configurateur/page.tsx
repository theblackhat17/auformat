'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useConfiguratorWizard, defaultConfigForType } from '@/components/configurateur/useConfiguratorWizard';
import { ConfigurateurWizard } from '@/components/configurateur/ConfigurateurWizard';
import { WizardNavigation } from '@/components/configurateur/WizardNavigation';
import { WizardPriceSummary } from '@/components/configurateur/WizardPriceSummary';
import { MeubleRenderer } from '@/components/configurateur/renderers/MeubleRenderer';
import { PlancheRenderer } from '@/components/configurateur/renderers/PlancheRenderer';
import { CuisineRenderer } from '@/components/configurateur/renderers/CuisineRenderer';
import type { ConfiguratorConfig, MeubleConfig, PlancheConfig, CuisineConfig, FurnitureConfig, WizardState } from '@/lib/types';

const STORAGE_KEY = 'unsaved-config';

/** Migrate old FurnitureConfig (no productType) to MeubleConfig */
function migrateConfig(raw: unknown): ConfiguratorConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Already new format
  if (obj.productType === 'meuble' || obj.productType === 'planche' || obj.productType === 'cuisine') {
    return obj as unknown as ConfiguratorConfig;
  }

  // Legacy FurnitureConfig detection: has cabinets but no productType
  if (Array.isArray(obj.cabinets)) {
    const legacy = obj as unknown as FurnitureConfig;
    const migrated: MeubleConfig = {
      productType: 'meuble',
      name: (legacy.name as string) || 'Mon Meuble',
      template: (legacy.template as string) || 'sur_mesure',
      material: (legacy.material as string) || 'chene',
      cabinets: legacy.cabinets,
      globalHandle: (legacy.globalHandle as string) || 'moderne',
      hardware: { hingeType: 'standard', drawerSlideType: 'standard', shelfSupportType: 'pins' },
      finish: { edgeBanding: 'none', finish: 'brut' },
      showDimensions: legacy.showDimensions ?? true,
      exploded: legacy.exploded ?? false,
    };
    return migrated;
  }

  return null;
}

function Viewport({ config }: { config: ConfiguratorConfig }) {
  switch (config.productType) {
    case 'meuble':
      return <MeubleRenderer config={config} />;
    case 'planche':
      return <PlancheRenderer config={config} />;
    case 'cuisine':
      return <CuisineRenderer config={config} />;
  }
}

export default function ConfigurateurPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-400">Chargement...</div>}>
      <ConfigurateurInner />
    </Suspense>
  );
}

function ConfigurateurInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { state, dispatch, steps, price } = useConfiguratorWizard();
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from query param or sessionStorage on mount
  useEffect(() => {
    if (loaded) return;

    const projectId = searchParams.get('project');
    const restore = searchParams.get('restore');

    if (projectId) {
      // Load project from API
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data && data.config) {
            const config = migrateConfig(data.config);
            if (config) {
              dispatch({
                type: 'LOAD_STATE',
                state: {
                  currentStep: 0,
                  maxReachedStep: steps.length - 1,
                  config,
                  isDirty: false,
                  projectId: data.id,
                },
              });
            }
          }
        })
        .catch(() => {});
    } else if (restore === 'true') {
      // Restore from sessionStorage
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const config = migrateConfig(parsed.config || parsed);
          if (config) {
            dispatch({
              type: 'LOAD_STATE',
              state: {
                currentStep: parsed.currentStep || 0,
                maxReachedStep: parsed.maxReachedStep || 0,
                config,
                isDirty: true,
                projectId: parsed.projectId || null,
              },
            });
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {}
    }

    setLoaded(true);
  }, [loaded, searchParams, dispatch, steps.length]);

  const isLastStep = state.currentStep === steps.length - 1;

  const handleSave = useCallback(async () => {
    if (!profile) {
      // Save to sessionStorage and redirect to login
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        config: state.config,
        currentStep: state.currentStep,
        maxReachedStep: state.maxReachedStep,
        projectId: state.projectId,
      }));
      router.push('/login?redirect=/configurateur&restore=true');
      return;
    }

    setIsSaving(true);
    try {
      const url = state.projectId ? `/api/projects/${state.projectId}` : '/api/projects';
      const method = state.projectId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.config.name,
          type: state.config.productType,
          config: state.config,
          status: 'draft',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erreur lors de la sauvegarde');
        return;
      }

      const data = await res.json();
      dispatch({
        type: 'LOAD_STATE',
        state: { ...state, isDirty: false, projectId: data.id || state.projectId },
      });

      if (confirm('Projet sauvegarde ! Voir tous vos projets ?')) {
        router.push('/mes-projets');
      }
    } catch {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [profile, state, router, dispatch]);

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <a href="/" className="text-lg font-bold text-vert-foret hover:text-vert-foret-dark transition-colors">
            Au Format
          </a>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-medium text-gray-700">Configurateur 3D</h1>
        </div>
        <div className="flex items-center gap-3">
          {profile ? (
            <span className="text-sm text-gray-500">{profile.fullName || profile.email}</span>
          ) : (
            <a href="/login?redirect=/configurateur" className="text-sm text-vert-foret hover:underline">
              Se connecter
            </a>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 relative bg-gray-50">
          <Viewport config={state.config} />
        </div>

        {/* Wizard Sidebar */}
        <div className="w-[420px] border-l border-gray-200 bg-gray-50 flex flex-col shrink-0">
          {/* Step indicator */}
          <WizardNavigation
            steps={steps}
            currentStep={state.currentStep}
            maxReachedStep={state.maxReachedStep}
            onGoto={(step) => dispatch({ type: 'GOTO_STEP', step })}
            onNext={() => dispatch({ type: 'NEXT_STEP' })}
            onPrev={() => dispatch({ type: 'PREV_STEP' })}
            onSave={handleSave}
            isSaving={isSaving}
            isLastStep={isLastStep}
          />

          {/* Step content */}
          <ConfigurateurWizard state={state} dispatch={dispatch} steps={steps} price={price} />

          {/* Price summary */}
          <WizardPriceSummary price={price} />
        </div>
      </div>
    </div>
  );
}
