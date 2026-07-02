'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type {
  ConfigurateurLabels,
  ConfigurateurUnivers,
  ConfigurateurModuleType,
} from '@/lib/types';
import Link from 'next/link';
import { UniversModulesTab } from './UniversModulesTab';

type TabKey = 'univers' | 'labels';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'univers', label: 'Univers & Modules' },
  { key: 'labels', label: 'Textes' },
];

export function AdminConfigurateurClient() {
  const searchParams = useSearchParams();
  const initialTab: TabKey = searchParams.get('tab') === 'labels' ? 'labels' : 'univers';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [univers, setUnivers] = useState<ConfigurateurUnivers[]>([]);
  const [moduleTypes, setModuleTypes] = useState<ConfigurateurModuleType[]>([]);
  const [labels, setLabels] = useState<ConfigurateurLabels | null>(null);
  const [pricingMode, setPricingMode] = useState<'masque' | 'estimation'>('masque');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/configurateur');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUnivers(data.univers || []);
      setModuleTypes(data.module_types || []);
      setLabels(data.labels || null);
      setPricingMode(data.pricing_mode === 'estimation' ? 'estimation' : 'masque');
    } catch {
      showToast('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveKey = async (key: string, value: unknown) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/configurateur', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error();
      showToast('Sauvegarde effectuee');
    } catch {
      showToast('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurateur 2D</h1>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-down">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white border border-b-white border-gray-200 text-vert-foret -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mode de prix client */}
      <div data-focus="prix" className="mb-4 p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-gray-900">Affichage des prix côté client</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {pricingMode === 'masque'
              ? '« Prix sur devis » : le client ne voit aucun prix, vous chiffrez depuis l\'admin.'
              : 'Estimation indicative affichée en direct au client.'}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-full p-1">
          {(['masque', 'estimation'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setPricingMode(mode); saveKey('pricing_mode', mode); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                pricingMode === mode ? 'bg-vert-foret text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {mode === 'masque' ? 'Prix sur devis' : 'Estimation visible'}
            </button>
          ))}
        </div>
      </div>

      {/* Materials link */}
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
        <p className="text-sm text-amber-800">
          Les materiaux du configurateur sont desormais geres depuis la page Materiaux.
        </p>
        <Link href="/admin/materiaux" className="px-4 py-1.5 text-sm bg-vert-foret text-white rounded-lg hover:bg-vert-foret-dark transition-colors whitespace-nowrap ml-4">
          Gerer les materiaux
        </Link>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'univers' && (
          <UniversModulesTab
            univers={univers}
            moduleTypes={moduleTypes}
            onUniversChange={setUnivers}
            onModulesChange={setModuleTypes}
            onSaveUnivers={() => saveKey('univers', univers)}
            onSaveModules={() => saveKey('module_types', moduleTypes)}
            saving={saving}
          />
        )}
        {activeTab === 'labels' && labels && (
          <LabelsTab
            labels={labels}
            onChange={(l) => setLabels(l)}
            onSave={() => saveKey('labels', labels)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

/* ================================= */
/* Labels Tab                         */
/* ================================= */
function LabelsTab({
  labels,
  onChange,
  onSave,
  saving,
}: {
  labels: ConfigurateurLabels;
  onChange: (l: ConfigurateurLabels) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const LABEL_NAMES: Record<keyof ConfigurateurLabels, string> = {
    titre: 'Titre principal',
    sousTitre: 'Sous-titre',
    boutonDevis: 'Bouton devis',
    prixEstimatif: 'Label prix',
    etape1: 'Etape 1',
    etape2: 'Etape 2',
    etape3: 'Etape 3',
    etape4: 'Etape 4',
    recapTitre: 'Titre recapitulatif',
    modalTitre: 'Titre modale',
    modalDescription: 'Description modale',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Textes de l&apos;interface</h2>
        <button onClick={onSave} disabled={saving} className="px-4 py-1.5 text-sm bg-vert-foret text-white rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="space-y-3">
        {(Object.keys(LABEL_NAMES) as (keyof ConfigurateurLabels)[]).map((key) => (
          <div key={key}>
            <label className="block text-sm text-gray-500 mb-1">{LABEL_NAMES[key]}</label>
            <input
              type="text"
              value={labels[key]}
              onChange={(e) => onChange({ ...labels, [key]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
