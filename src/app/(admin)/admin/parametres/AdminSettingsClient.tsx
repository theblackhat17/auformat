'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ImageUpload } from '@/components/admin/ImageUpload';

interface Settings {
  id?: string;
  companyName: string;
  slogan: string;
  address: string;
  zipcode: string;
  city: string;
  phone: string;
  email: string;
  hoursWeekdays: string;
  hoursSaturday: string;
  hoursSunday: string;
  instagram: string;
  facebook: string;
  heroBackground: string;
  configurateurEnabled: boolean;
}

interface SeoEntry {
  pagePath: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

const EMPTY: Settings = {
  companyName: '', slogan: '', address: '', zipcode: '', city: '',
  phone: '', email: '', hoursWeekdays: '', hoursSaturday: '', hoursSunday: '',
  instagram: '', facebook: '', heroBackground: '', configurateurEnabled: false,
};

const SEO_PAGE_LABELS: Record<string, string> = {
  '/': 'Accueil',
  '/about': 'À propos',
  '/realisations': 'Réalisations',
  '/processus': 'Processus',
  '/contact': 'Contact',
  '/avis': 'Avis clients',
  '/configurateur': 'Configurateur',
  '/homemade': 'Savoir-faire',
  '/materiaux': 'Matériaux',
};

export function AdminSettingsClient() {
  const [tab, setTab] = useState<'settings' | 'seo'>('settings');
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [seoPages, setSeoPages] = useState<SeoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/admin/seo').then((r) => r.json()),
    ])
      .then(([settingsData, seoData]) => {
        if (settingsData && !settingsData.error) setSettings({ ...EMPTY, ...settingsData });
        if (Array.isArray(seoData)) setSeoPages(seoData);
      })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success('Paramètres enregistrés');
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSeo = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: seoPages }),
      });
      if (!res.ok) throw new Error();
      toast.success('SEO enregistré');
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof Settings, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  const updateSeo = (pagePath: string, field: keyof SeoEntry, value: string) => {
    setSeoPages((prev) =>
      prev.map((p) => (p.pagePath === pagePath ? { ...p, [field]: value } : p))
    );
  };

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-noir">Paramètres du site</h1>
          <p className="text-sm text-noir/50 mt-1">Informations générales, contact et SEO</p>
        </div>
        <button
          onClick={tab === 'settings' ? handleSaveSettings : handleSaveSeo}
          disabled={saving}
          className="px-5 py-2.5 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('settings')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'settings' ? 'bg-white border border-b-white border-gray-200 -mb-px text-vert-foret' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Paramètres
        </button>
        <button
          onClick={() => setTab('seo')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'seo' ? 'bg-white border border-b-white border-gray-200 -mb-px text-vert-foret' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          SEO / Référencement
        </button>
      </div>

      {tab === 'settings' ? (
        <div className="space-y-6">
          {/* General */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-noir mb-4">Informations générales</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom de la société" value={settings.companyName} onChange={(v) => update('companyName', v)} />
              <Field label="Slogan" value={settings.slogan} onChange={(v) => update('slogan', v)} />
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-noir mb-4">Contact</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <Field label="Adresse" value={settings.address} onChange={(v) => update('address', v)} />
              </div>
              <Field label="Code postal" value={settings.zipcode} onChange={(v) => update('zipcode', v)} />
              <Field label="Ville" value={settings.city} onChange={(v) => update('city', v)} />
              <Field label="Téléphone" value={settings.phone} onChange={(v) => update('phone', v)} />
              <div className="sm:col-span-3">
                <Field label="Email" value={settings.email} onChange={(v) => update('email', v)} type="email" />
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-noir mb-4">Horaires</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Lundi - Vendredi" value={settings.hoursWeekdays} onChange={(v) => update('hoursWeekdays', v)} />
              <Field label="Samedi" value={settings.hoursSaturday} onChange={(v) => update('hoursSaturday', v)} />
              <Field label="Dimanche" value={settings.hoursSunday} onChange={(v) => update('hoursSunday', v)} />
            </div>
          </div>

          {/* Social */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-noir mb-4">Réseaux sociaux</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Instagram (URL)" value={settings.instagram || ''} onChange={(v) => update('instagram', v)} type="url" placeholder="https://instagram.com/..." />
              <Field label="Facebook (URL)" value={settings.facebook || ''} onChange={(v) => update('facebook', v)} type="url" placeholder="https://facebook.com/..." />
            </div>
          </div>

          {/* Hero Background */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-noir mb-2">Image de fond - Page d&apos;accueil</h2>
            <p className="text-sm text-noir/50 mb-4">
              Cette image sera affichée en arrière-plan de la section hero sur la page d&apos;accueil, derrière le texte &quot;Franchissons ensemble, le pas vers le bois&quot;.
            </p>
            <ImageUpload
              label="Image de fond hero"
              value={settings.heroBackground || ''}
              onChange={(v) => update('heroBackground', v)}
            />
          </div>

          {/* Configurateur toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-noir">Configurateur en ligne</h2>
                <p className="text-sm text-noir/50 mt-1">
                  {settings.configurateurEnabled
                    ? 'Le configurateur est visible sur le site (navigation, footer, page d\'accueil).'
                    : 'Le configurateur est masqué du site. Activez-le quand vous serez prêt pour le lancement.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.configurateurEnabled}
                onClick={() => setSettings((s) => ({ ...s, configurateurEnabled: !s.configurateurEnabled }))}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-vert-foret/20 ${
                  settings.configurateurEnabled ? 'bg-vert-foret' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.configurateurEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-noir/50">Modifiez le titre, la description et les mots-clés qui apparaissent dans les moteurs de recherche pour chaque page.</p>
          {seoPages.map((page) => (
            <div key={page.pagePath} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{page.pagePath}</span>
                <h3 className="text-sm font-semibold text-noir">{SEO_PAGE_LABELS[page.pagePath] || page.pagePath}</h3>
              </div>
              <div className="space-y-3">
                <Field
                  label="Titre (meta title)"
                  value={page.metaTitle}
                  onChange={(v) => updateSeo(page.pagePath, 'metaTitle', v)}
                  hint={`${page.metaTitle.length}/70 caractères`}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (meta description)</label>
                  <textarea
                    value={page.metaDescription}
                    onChange={(e) => updateSeo(page.pagePath, 'metaDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">{page.metaDescription.length}/160 caractères recommandés</p>
                </div>
                <Field
                  label="Mots-clés (séparés par des virgules)"
                  value={page.metaKeywords}
                  onChange={(v) => updateSeo(page.pagePath, 'metaKeywords', v)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
