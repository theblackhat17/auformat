'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  ConfigurateurProductType,
  ConfigurateurOptionPrices,
  ConfigurateurLabels,
  ConfigurateurOption,
} from '@/lib/types';
import Link from 'next/link';

type TabKey = 'types' | 'prices' | 'options' | 'labels';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'types', label: 'Types de produit' },
  { key: 'prices', label: 'Prix (ancien)' },
  { key: 'options', label: 'Options' },
  { key: 'labels', label: 'Textes' },
];

export function AdminConfigurateurClient() {
  const [activeTab, setActiveTab] = useState<TabKey>('types');
  const [productTypes, setProductTypes] = useState<ConfigurateurProductType[]>([]);
  const [optionPrices, setOptionPrices] = useState<ConfigurateurOptionPrices | null>(null);
  const [options, setOptions] = useState<ConfigurateurOption[]>([]);
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
      setProductTypes(data.product_types || []);
      setOptionPrices(data.option_prices || null);
      setOptions(data.options || []);
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
        {activeTab === 'options' && (
          <OptionsTab
            options={options}
            onChange={(o) => setOptions(o)}
            onSave={() => saveKey('options', options)}
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
/* Option Prices Tab (legacy)         */
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
        <div>
          <h2 className="text-lg font-semibold">Prix des options (ancien format)</h2>
          <p className="text-xs text-gray-400 mt-1">Utilisez l&apos;onglet &quot;Options&quot; pour gerer les options dynamiquement</p>
        </div>
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
/* Options Tab (dynamic)              */
/* ================================= */
const CATEGORIES = [
  { value: 'furniture' as const, label: 'Mobilier' },
  { value: 'worktop' as const, label: 'Plan de travail' },
  { value: 'shelf' as const, label: 'Etagere' },
];

const OPTION_TYPES = [
  { value: 'compteur' as const, label: 'Compteur (+/-)' },
  { value: 'toggle' as const, label: 'Interrupteur (oui/non)' },
  { value: 'choix' as const, label: 'Choix (groupe)' },
];

function OptionsTab({
  options,
  onChange,
  onSave,
  saving,
}: {
  options: ConfigurateurOption[];
  onChange: (o: ConfigurateurOption[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [filterCat, setFilterCat] = useState<string>('all');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const filtered = filterCat === 'all'
    ? options
    : options.filter((o) => o.categorie === filterCat);

  const updateOption = (index: number, updates: Partial<ConfigurateurOption>) => {
    const realIndex = options.indexOf(filtered[index]);
    if (realIndex === -1) return;
    const updated = [...options];
    updated[realIndex] = { ...updated[realIndex], ...updates };
    onChange(updated);
  };

  const addOption = () => {
    const cat = filterCat === 'all' ? 'furniture' : filterCat;
    const maxSort = options.filter((o) => o.categorie === cat).reduce((max, o) => Math.max(max, o.sortOrder), 0);
    const newOption: ConfigurateurOption = {
      slug: `option_${Date.now()}`,
      nom: 'Nouvelle option',
      prix: 0,
      categorie: cat as 'furniture' | 'worktop' | 'shelf',
      type: 'compteur',
      actif: true,
      sortOrder: maxSort + 1,
    };
    onChange([...options, newOption]);
    setEditingIndex(filtered.length);
  };

  const removeOption = (index: number) => {
    const realIndex = options.indexOf(filtered[index]);
    if (realIndex === -1) return;
    onChange(options.filter((_, i) => i !== realIndex));
    setEditingIndex(null);
  };

  const toggleActive = (index: number) => {
    updateOption(index, { actif: !filtered[index].actif });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Options ({options.length})</h2>
        <div className="flex gap-2">
          <button onClick={addOption} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            + Ajouter
          </button>
          <button onClick={onSave} disabled={saving} className="px-4 py-1.5 text-sm bg-vert-foret text-white rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => { setFilterCat('all'); setEditingIndex(null); }}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${filterCat === 'all' ? 'bg-vert-foret text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Toutes ({options.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = options.filter((o) => o.categorie === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => { setFilterCat(cat.value); setEditingIndex(null); }}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${filterCat === cat.value ? 'bg-vert-foret text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Options list */}
      <div className="space-y-1">
        {filtered.map((opt, i) => (
          <div key={opt.slug + i}>
            {/* Summary row */}
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                editingIndex === i ? 'bg-gray-50 border border-gray-200' : 'hover:bg-gray-50'
              } ${!opt.actif ? 'opacity-50' : ''}`}
              onClick={() => setEditingIndex(editingIndex === i ? null : i)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleActive(i); }}
                className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${opt.actif ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}
              />
              <span className="text-sm font-medium text-gray-800 flex-1">{opt.nom}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{opt.type}</span>
              {opt.groupe && <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{opt.groupe}</span>}
              <span className="text-sm font-medium text-gray-600 w-16 text-right">{opt.prix.toFixed(2)} EUR</span>
              <span className="text-xs text-gray-300">{editingIndex === i ? '\u25B2' : '\u25BC'}</span>
            </div>

            {/* Edit form */}
            {editingIndex === i && (
              <div className="ml-6 mt-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Slug (identifiant)</label>
                    <input
                      type="text"
                      value={opt.slug}
                      onChange={(e) => updateOption(i, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nom</label>
                    <input
                      type="text"
                      value={opt.nom}
                      onChange={(e) => updateOption(i, { nom: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prix unitaire (EUR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={opt.prix}
                      onChange={(e) => updateOption(i, { prix: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ordre d&apos;affichage</label>
                    <input
                      type="number"
                      value={opt.sortOrder}
                      onChange={(e) => updateOption(i, { sortOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Categorie</label>
                    <select
                      value={opt.categorie}
                      onChange={(e) => updateOption(i, { categorie: e.target.value as 'furniture' | 'worktop' | 'shelf' })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select
                      value={opt.type}
                      onChange={(e) => updateOption(i, { type: e.target.value as 'compteur' | 'toggle' | 'choix' })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    >
                      {OPTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  {opt.type === 'choix' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Groupe</label>
                      <input
                        type="text"
                        value={opt.groupe || ''}
                        onChange={(e) => updateOption(i, { groupe: e.target.value || undefined })}
                        placeholder="ex: pieds, bord, fixation"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => removeOption(i)}
                    className="px-3 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    Supprimer cette option
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">Aucune option dans cette categorie</p>
      )}
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
