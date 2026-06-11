'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { DEFAULT_THEME_COLORS } from '@/lib/types';

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
  fontTheme: string;
  colorBoisClair: string;
  colorBoisFonce: string;
  colorVertForet: string;
  colorVertForetDark: string;
  colorBeige: string;
  colorNoir: string;
  colorBlanc: string;
}

const COLOR_FIELDS: Array<{ key: keyof Settings & `color${string}`; label: string; hint: string }> = [
  { key: 'colorVertForet',     label: 'Vert forêt (principal)', hint: 'Boutons primaires, accents' },
  { key: 'colorVertForetDark', label: 'Vert forêt foncé',       hint: 'Hover des boutons primaires' },
  { key: 'colorBoisClair',     label: 'Bois clair',             hint: 'Accents chauds, liens' },
  { key: 'colorBoisFonce',     label: 'Bois foncé',             hint: 'Accents foncés, scrollbar' },
  { key: 'colorBeige',         label: 'Beige',                  hint: 'Fonds doux, sections claires' },
  { key: 'colorNoir',          label: 'Noir (texte)',           hint: 'Texte principal' },
  { key: 'colorBlanc',         label: 'Blanc (fond)',           hint: 'Arrière-plan global' },
];

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
  fontTheme: 'moderne',
  ...DEFAULT_THEME_COLORS,
};

const SEO_PAGE_LABELS: Record<string, string> = {
  '/': 'Accueil',
  '/about': 'À propos',
  '/realisations': 'Réalisations',
  '/processus': 'Processus',
  '/contact': 'Contact',
  '/avis': 'Avis clients',
  '/configurateur': 'Configurateur',
  '/savoir-faire': 'Savoir-faire',
  '/materiaux': 'Matériaux',
};

export function AdminSettingsClient() {
  const [tab, setTab] = useState<'settings' | 'appearance' | 'seo'>('settings');
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

  const resetColors = () => setSettings((s) => ({ ...s, ...DEFAULT_THEME_COLORS }));

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
          onClick={tab === 'seo' ? handleSaveSeo : handleSaveSettings}
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
          onClick={() => setTab('appearance')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'appearance' ? 'bg-white border border-b-white border-gray-200 -mb-px text-vert-foret' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Apparence
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

      {tab === 'settings' && (
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
      )}

      {tab === 'appearance' && (
        <div className="space-y-6">
          {/* Typographie */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-noir">Typographie</h2>
            <p className="text-sm text-noir/50 mt-1 mb-4">
              Choisissez les polices du site public. « Moderne » utilise Young Serif pour les titres et Hanken Grotesk pour le texte ; « Classique » revient aux polices d&apos;origine du site.
            </p>
            <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Thème typographique">
              <button
                type="button"
                role="radio"
                aria-checked={settings.fontTheme !== 'classique'}
                onClick={() => update('fontTheme', 'moderne')}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${
                  settings.fontTheme !== 'classique' ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="block text-xl text-noir mb-1" style={{ fontFamily: 'var(--font-young-serif), Georgia, serif' }}>Moderne</span>
                <span className="block text-sm text-noir/60">Young Serif (titres) + Hanken Grotesk (texte) — le redesign actuel.</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={settings.fontTheme === 'classique'}
                onClick={() => update('fontTheme', 'classique')}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${
                  settings.fontTheme === 'classique' ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="block text-xl font-bold text-noir mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Classique</span>
                <span className="block text-sm text-noir/60">Polices système d&apos;origine, titres en gras — l&apos;ancien rendu du site.</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-noir">Couleurs principales du site</h2>
                <p className="text-sm text-noir/50 mt-1">
                  Ces couleurs sont appliquées partout sur le site public, l&apos;admin et l&apos;espace client. L&apos;aperçu est en direct, la sauvegarde requiert un clic sur Enregistrer.
                </p>
              </div>
              <button
                type="button"
                onClick={resetColors}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Réinitialiser
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {COLOR_FIELDS.map((f) => (
                <ColorField
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  value={settings[f.key] as string}
                  onChange={(v) => update(f.key, v)}
                />
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div
            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6"
            style={{
              ['--color-bois-clair' as string]: settings.colorBoisClair,
              ['--color-bois-fonce' as string]: settings.colorBoisFonce,
              ['--color-vert-foret' as string]: settings.colorVertForet,
              ['--color-vert-foret-dark' as string]: settings.colorVertForetDark,
              ['--color-beige' as string]: settings.colorBeige,
              ['--color-noir' as string]: settings.colorNoir,
              ['--color-blanc' as string]: settings.colorBlanc,
            }}
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Aperçu</h3>
            <div className="rounded-lg p-6 bg-beige">
              <h4 className="text-xl font-bold text-noir mb-2">Titre exemple</h4>
              <p className="text-noir/70 mb-4">Un paragraphe pour visualiser le rendu des couleurs choisies.</p>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark transition-colors">
                  Bouton principal
                </button>
                <button className="px-4 py-2 border border-vert-foret text-vert-foret text-sm font-medium rounded-lg">
                  Bouton secondaire
                </button>
                <span className="px-3 py-1 bg-bois-clair text-noir text-sm rounded-full">Tag bois clair</span>
                <span className="px-3 py-1 bg-bois-fonce text-white text-sm rounded-full">Tag bois foncé</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'seo' && (
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

function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalized}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-lg border border-gray-300 cursor-pointer p-1 bg-white"
          aria-label={`${label} - color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm font-mono"
        />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
