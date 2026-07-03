'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  EMAIL_TEMPLATE_CATEGORIES,
  interpolateTemplate,
  wrapForPreview,
  type EmailTemplateDef,
  type EmailTemplateCategoryKey,
} from '@/lib/email-templates';

interface TemplateWithOverride extends EmailTemplateDef {
  overrideSubject: string | null;
  overrideBody: string | null;
  updatedAt: string | null;
}

export function AdminMailsClient() {
  const [templates, setTemplates] = useState<TemplateWithOverride[]>([]);
  const [tab, setTab] = useState<EmailTemplateCategoryKey>('compte');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/admin/email-templates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.templates)) setTemplates(data.templates);
        else toast.error('Erreur chargement');
      })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false));
  }, [toast]);

  const selected = useMemo(
    () => templates.find((t) => t.key === selectedKey) || null,
    [templates, selectedKey]
  );

  const openTemplate = useCallback((t: TemplateWithOverride) => {
    setSelectedKey(t.key);
    setSubject(t.overrideSubject ?? t.defaultSubject);
    setBodyDraft(t.overrideBody ?? t.defaultBody);
  }, []);

  const closeEditor = useCallback(() => setSelectedKey(null), []);

  // Aperçu en direct : interpolation des valeurs d'exemple dans le brouillon
  const previewSrcDoc = useMemo(() => {
    if (!selected) return '';
    const samples = Object.fromEntries(selected.variables.map((v) => [v.name, v.sample]));
    const previewSubject = interpolateTemplate(subject, samples);
    const previewBody = interpolateTemplate(bodyDraft, samples);
    const html = selected.layout === 'inner' ? wrapForPreview(previewSubject, previewBody) : previewBody;
    return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:16px;background:#fff;">${html}</body></html>`;
  }, [selected, subject, bodyDraft]);

  const insertVariable = (name: string) => {
    const token = `{{${name}}}`;
    const ta = bodyRef.current;
    if (!ta) {
      setBodyDraft((b) => b + token);
      return;
    }
    const start = ta.selectionStart ?? bodyDraft.length;
    const end = ta.selectionEnd ?? start;
    setBodyDraft(bodyDraft.slice(0, start) + token + bodyDraft.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${selected.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body: bodyDraft }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erreur sauvegarde');
      setTemplates((prev) =>
        prev.map((t) =>
          t.key === selected.key
            ? { ...t, overrideSubject: subject.trim(), overrideBody: bodyDraft, updatedAt: new Date().toISOString() }
            : t
        )
      );
      toast.success('Modèle enregistré');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selected) return;
    if (!confirm(`Réinitialiser « ${selected.label} » au modèle par défaut ?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${selected.key}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erreur réinitialisation');
      setTemplates((prev) =>
        prev.map((t) =>
          t.key === selected.key ? { ...t, overrideSubject: null, overrideBody: null, updatedAt: null } : t
        )
      );
      setSubject(selected.defaultSubject);
      setBodyDraft(selected.defaultBody);
      toast.success('Modèle réinitialisé');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réinitialisation');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!selected) return;
    setSendingTest(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${selected.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', subject, body: bodyDraft }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur d'envoi du test");
      toast.success(`E-mail de test envoyé à ${data?.to || 'votre adresse'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi du test");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;

  const isCustomized = (t: TemplateWithOverride) => t.overrideSubject !== null || t.overrideBody !== null;
  const categoryTemplates = templates.filter((t) => t.category === tab);

  return (
    <div>
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-noir">Mails</h1>
        <p className="text-sm text-noir/50 mt-1">
          Personnalisez le sujet et le contenu de chaque e-mail envoyé par le site.
          Sans personnalisation, le modèle d&apos;origine s&apos;applique.
        </p>
      </div>

      {selected ? (
        /* ================= Éditeur ================= */
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-start gap-3">
              <button
                onClick={closeEditor}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                ← Retour
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-noir">{selected.label}</h2>
                  {isCustomized(selected) && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-vert-foret/10 text-vert-foret rounded-full">
                      Personnalisé
                    </span>
                  )}
                </div>
                <p className="text-sm text-noir/50 mt-0.5">{selected.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isCustomized(selected) && (
                <button
                  onClick={handleReset}
                  disabled={saving || sendingTest}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Réinitialiser
                </button>
              )}
              <button
                onClick={handleSendTest}
                disabled={saving || sendingTest}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {sendingTest ? 'Envoi...' : 'Envoyer un test'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || sendingTest}
                className="px-5 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Édition */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sujet</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Variables disponibles</label>
                <div className="flex flex-wrap gap-1.5">
                  {selected.variables.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVariable(v.name)}
                      title={v.description}
                      className="px-2 py-1 text-xs font-mono bg-vert-foret/5 text-vert-foret border border-vert-foret/20 rounded-md hover:bg-vert-foret/10 transition-colors"
                    >
                      {`{{${v.name}}}`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Cliquez sur une variable pour l&apos;insérer au curseur. Les variables sont remplacées
                  automatiquement à l&apos;envoi et sécurisées (échappement HTML).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Corps (HTML)</label>
                <textarea
                  ref={bodyRef}
                  value={bodyDraft}
                  onChange={(e) => setBodyDraft(e.target.value)}
                  rows={15}
                  spellCheck={false}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret leading-relaxed"
                />
                {selected.layout === 'inner' && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Ce modèle est le contenu interne de l&apos;e-mail : l&apos;habillage (bandeau vert, signature)
                    et le bouton « Voir mon projet » sont ajoutés automatiquement à l&apos;envoi.
                  </p>
                )}
              </div>
            </div>

            {/* Aperçu */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Aperçu</h3>
                <span className="text-xs text-gray-400">avec des valeurs d&apos;exemple</span>
              </div>
              <p className="text-sm text-noir mb-3 pb-3 border-b border-gray-100">
                <span className="text-gray-400">Sujet :</span>{' '}
                {interpolateTemplate(subject, Object.fromEntries(selected.variables.map((v) => [v.name, v.sample])))}
              </p>
              <iframe
                title="Aperçu de l'e-mail"
                srcDoc={previewSrcDoc}
                sandbox=""
                className="w-full min-h-[480px] border border-gray-100 rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      ) : (
        /* ================= Liste ================= */
        <div>
          {/* Onglets par catégorie */}
          <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
            {EMAIL_TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setTab(cat.key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  tab === cat.key
                    ? 'bg-white border border-b-white border-gray-200 -mb-px text-vert-foret'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {categoryTemplates.map((t) => (
              <button
                key={t.key}
                onClick={() => openTemplate(t)}
                className="w-full flex items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 text-left hover:border-vert-foret/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-noir">{t.label}</span>
                    {isCustomized(t) && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-vert-foret/10 text-vert-foret rounded-full">
                        Personnalisé
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-noir/50 mt-0.5">{t.description}</p>
                  {t.updatedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Modifié le {new Date(t.updatedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <span className="text-gray-300 flex-shrink-0">›</span>
              </button>
            ))}
            {categoryTemplates.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                Aucun modèle dans cette catégorie.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
