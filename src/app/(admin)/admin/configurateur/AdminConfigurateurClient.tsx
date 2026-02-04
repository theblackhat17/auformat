'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  ConfigurateurMaterial,
  ConfigurateurProductType,
  ConfigurateurOptionPrices,
  ConfigurateurLabels,
} from '@/lib/types';

type TabKey = 'materials' | 'types' | 'prices' | 'labels';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'materials', label: 'Materiaux' },
  { key: 'types', label: 'Types de produit' },
  { key: 'prices', label: 'Prix options' },
  { key: 'labels', label: 'Textes' },
];

export function AdminConfigurateurClient() {
  const [activeTab, setActiveTab] = useState<TabKey>('materials');
  const [materials, setMaterials] = useState<ConfigurateurMaterial[]>([]);
  const [productTypes, setProductTypes] = useState<ConfigurateurProductType[]>([]);
  const [optionPrices, setOptionPrices] = useState<ConfigurateurOptionPrices | null>(null);
  const [labels, setLabels] = useState<ConfigurateurLabels | null>(null);
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
      setMaterials(data.materials || []);
      setProductTypes(data.product_types || []);
      setOptionPrices(data.option_prices || null);
      setLabels(data.labels || null);
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
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-white border border-b-white border-gray-200 text-vert-foret -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'materials' && (
          <MaterialsTab
            materials={materials}
            onChange={(m) => setMaterials(m)}
            onSave={() => saveKey('materials', materials)}
            saving={saving}
          />
        )}
        {activeTab === 'types' && (
          <ProductTypesTab
            types={productTypes}
            onChange={(t) => setProductTypes(t)}
            onSave={() => saveKey('product_types', productTypes)}
            saving={saving}
          />
        )}
        {activeTab === 'prices' && optionPrices && (
          <OptionPricesTab
            prices={optionPrices}
            onChange={(p) => setOptionPrices(p)}
            onSave={() => saveKey('option_prices', optionPrices)}
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
/* Materials Tab                      */
/* ================================= */
function MaterialsTab({
  materials,
  onChange,
  onSave,
  saving,
}: {
  materials: ConfigurateurMaterial[];
  onChange: (m: ConfigurateurMaterial[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const updateItem = (index: number, field: keyof ConfigurateurMaterial, value: string | number) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addItem = () => {
    onChange([
      ...materials,
      { name: 'Nouveau materiau', colorHex: '#CCCCCC', prixM2: 30, sortOrder: materials.length + 1 },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(materials.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Materiaux ({materials.length})</h2>
        <div className="flex gap-2">
          <button onClick={addItem} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            + Ajouter
          </button>
          <button onClick={onSave} disabled={saving} className="px-4 py-1.5 text-sm bg-vert-foret text-white rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 font-medium">Couleur</th>
            <th className="pb-2 font-medium">Nom</th>
            <th className="pb-2 font-medium">Prix/m2</th>
            <th className="pb-2 font-medium">Ordre</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2">
                <input
                  type="color"
                  value={m.colorHex}
                  onChange={(e) => updateItem(i, 'colorHex', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                />
              </td>
              <td className="py-2">
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateItem(i, 'name', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-200 rounded"
                />
              </td>
              <td className="py-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={m.prixM2}
                    onChange={(e) => updateItem(i, 'prixM2', parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-200 rounded"
                  />
                  <span className="text-gray-400">EUR</span>
                </div>
              </td>
              <td className="py-2">
                <input
                  type="number"
                  value={m.sortOrder}
                  onChange={(e) => updateItem(i, 'sortOrder', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 border border-gray-200 rounded"
                />
              </td>
              <td className="py-2 text-right">
                <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================= */
/* Product Types Tab                  */
/* ================================= */
function ProductTypesTab({
  types,
  onChange,
  onSave,
  saving,
}: {
  types: ConfigurateurProductType[];
  onChange: (t: ConfigurateurProductType[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const updateDim = (
    index: number,
    minMax: 'dimensionsMin' | 'dimensionsMax',
    field: string,
    value: number,
  ) => {
    const updated = [...types];
    updated[index] = {
      ...updated[index],
      [minMax]: { ...updated[index][minMax], [field]: value },
    };
    onChange(updated);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Types de produit ({types.length})</h2>
        <button onClick={onSave} disabled={saving} className="px-4 py-1.5 text-sm bg-vert-foret text-white rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="space-y-4">
        {types.map((t, i) => (
          <div key={t.slug} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-medium text-gray-900">{t.nom}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{t.slug}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{t.optionsCategorie}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Dimensions min (mm)</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['largeur', 'hauteur', 'profondeur', 'epaisseur'] as const).map((dim) => (
                    <div key={dim}>
                      <label className="text-xs text-gray-400 capitalize">{dim.charAt(0).toUpperCase()}</label>
                      <input
                        type="number"
                        value={t.dimensionsMin[dim]}
                        onChange={(e) => updateDim(i, 'dimensionsMin', dim, parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Dimensions max (mm)</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['largeur', 'hauteur', 'profondeur', 'epaisseur'] as const).map((dim) => (
                    <div key={dim}>
                      <label className="text-xs text-gray-400 capitalize">{dim.charAt(0).toUpperCase()}</label>
                      <input
                        type="number"
                        value={t.dimensionsMax[dim]}
                        onChange={(e) => updateDim(i, 'dimensionsMax', dim, parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================= */
/* Option Prices Tab                  */
/* ================================= */
function OptionPricesTab({
  prices,
  onChange,
  onSave,
  saving,
}: {
  prices: ConfigurateurOptionPrices;
  onChange: (p: ConfigurateurOptionPrices) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const PRICE_LABELS: Record<keyof ConfigurateurOptionPrices, string> = {
    tiroir: 'Tiroir',
    porte: 'Porte',
    pied: 'Pied',
    coulissantes: 'Portes coulissantes',
    etagere: 'Etagere',
    dos: 'Panneau de dos',
    decoupe_ronde: 'Decoupe ronde',
    decoupe_rectangulaire: 'Decoupe rectangulaire',
    bord_arrondi: 'Bord arrondi',
    bord_chanfrein: 'Bord chanfrein',
    bord_droit: 'Bord droit',
    fixation_murale: 'Fixation murale',
    fixation_sol: 'Fixation au sol',
    separateur: 'Separateur',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Prix des options</h2>
        <button onClick={onSave} disabled={saving} className="px-4 py-1.5 text-sm bg-vert-foret text-white rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(Object.keys(PRICE_LABELS) as (keyof ConfigurateurOptionPrices)[]).map((key) => (
          <div key={key} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100">
            <label className="text-sm text-gray-700">{PRICE_LABELS[key]}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                value={prices[key]}
                onChange={(e) => onChange({ ...prices, [key]: parseFloat(e.target.value) || 0 })}
                className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right"
              />
              <span className="text-xs text-gray-400">EUR</span>
            </div>
          </div>
        ))}
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
