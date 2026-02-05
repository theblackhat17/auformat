'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';

interface PageContentRow {
  id: string;
  pageKey: string;
  sectionKey: string;
  content: Record<string, unknown>;
  sortOrder: number;
}

const PAGE_TABS = [
  { key: 'homepage', label: 'Accueil' },
  { key: 'about', label: 'À propos' },
  { key: 'homemade', label: 'Savoir-faire' },
  { key: 'processus', label: 'Processus' },
];

export function AdminPageContentClient() {
  const [activeTab, setActiveTab] = useState('homepage');
  const [sections, setSections] = useState<PageContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const loadSections = useCallback(async (pageKey: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/page-content/${pageKey}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSections(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSections(activeTab);
  }, [activeTab, loadSections]);

  const updateContent = (sectionKey: string, key: string, value: unknown) => {
    setSections((prev) =>
      prev.map((s) =>
        s.sectionKey === sectionKey
          ? { ...s, content: { ...s.content, [key]: value } }
          : s
      )
    );
  };

  const updateArrayItem = (sectionKey: string, arrayKey: string, index: number, field: string, value: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.sectionKey !== sectionKey) return s;
        const arr = [...(s.content[arrayKey] as Record<string, string>[])];
        arr[index] = { ...arr[index], [field]: value };
        return { ...s, content: { ...s.content, [arrayKey]: arr } };
      })
    );
  };

  const addArrayItem = (sectionKey: string, arrayKey: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.sectionKey !== sectionKey) return s;
        const arr = [...(s.content[arrayKey] as Record<string, string>[])];
        // Create new item with same keys as existing items
        const template = arr.length > 0 ? Object.fromEntries(Object.keys(arr[0]).map((k) => [k, ''])) : {};
        return { ...s, content: { ...s.content, [arrayKey]: [...arr, template] } };
      })
    );
  };

  const removeArrayItem = (sectionKey: string, arrayKey: string, index: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.sectionKey !== sectionKey) return s;
        const arr = [...(s.content[arrayKey] as Record<string, string>[])];
        arr.splice(index, 1);
        return { ...s, content: { ...s.content, [arrayKey]: arr } };
      })
    );
  };

  const moveArrayItem = (sectionKey: string, arrayKey: string, index: number, direction: 'up' | 'down') => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.sectionKey !== sectionKey) return s;
        const arr = [...(s.content[arrayKey] as Record<string, string>[])];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= arr.length) return s;
        [arr[index], arr[target]] = [arr[target], arr[index]];
        return { ...s, content: { ...s.content, [arrayKey]: arr } };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/page-content/${activeTab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: sections.map((s) => ({
            sectionKey: s.sectionKey,
            content: s.content,
            sortOrder: s.sortOrder,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Contenu enregistré');
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (section: PageContentRow) => {
    const c = section.content;

    // Generic renderer for sections with items arrays
    if (c.items && Array.isArray(c.items)) {
      const items = c.items as Record<string, string>[];
      return (
        <div key={section.id} className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-noir mb-4 capitalize">{section.sectionKey.replace(/_/g, ' ')}</h3>
          {c.title !== undefined && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input type="text" value={(c.title as string) || ''} onChange={(e) => updateContent(section.sectionKey, 'title', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
          )}
          {c.subtitle !== undefined && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
              <input type="text" value={(c.subtitle as string) || ''} onChange={(e) => updateContent(section.sectionKey, 'subtitle', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
          )}
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg relative group">
                {/* Actions bar */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400">#{i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveArrayItem(section.sectionKey, 'items', i, 'up')}
                      disabled={i === 0}
                      className="p-1 text-gray-400 hover:text-noir disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Monter"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveArrayItem(section.sectionKey, 'items', i, 'down')}
                      disabled={i === items.length - 1}
                      className="p-1 text-gray-400 hover:text-noir disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Descendre"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeArrayItem(section.sectionKey, 'items', i)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Supprimer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(item).map((field) => {
                    const val = item[field] || '';
                    const isLong = val.length > 60;
                    return (
                      <div key={field} className={isLong ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{field}</label>
                        {isLong ? (
                          <textarea
                            value={val}
                            onChange={(e) => updateArrayItem(section.sectionKey, 'items', i, field, e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                          />
                        ) : (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => updateArrayItem(section.sectionKey, 'items', i, field, e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addArrayItem(section.sectionKey, 'items')}
            className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-vert-foret hover:text-vert-foret transition-colors"
          >
            + Ajouter un élément
          </button>
        </div>
      );
    }

    // Section with paragraphs (about/history)
    if (c.paragraphs && Array.isArray(c.paragraphs)) {
      return (
        <div key={section.id} className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-noir mb-4 capitalize">{section.sectionKey.replace(/_/g, ' ')}</h3>
          {c.title !== undefined && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input type="text" value={(c.title as string) || ''} onChange={(e) => updateContent(section.sectionKey, 'title', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
          )}
          <div className="space-y-3">
            {(c.paragraphs as string[]).map((p, i) => (
              <div key={i}>
                <label className="block text-xs font-medium text-gray-500 mb-1">Paragraphe {i + 1}</label>
                <textarea
                  value={p}
                  onChange={(e) => {
                    const arr = [...(c.paragraphs as string[])];
                    arr[i] = e.target.value;
                    updateContent(section.sectionKey, 'paragraphs', arr);
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Generic key-value section (hero, cta, etc.)
    return (
      <div key={section.id} className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-noir mb-4 capitalize">{section.sectionKey.replace(/_/g, ' ')}</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(c).map(([key, val]) => {
            if (typeof val !== 'string') return null;
            const isLong = val.length > 80;
            return (
              <div key={key} className={isLong ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}</label>
                {isLong ? (
                  <textarea value={val} onChange={(e) => updateContent(section.sectionKey, key, e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm" />
                ) : (
                  <input type="text" value={val} onChange={(e) => updateContent(section.sectionKey, key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-noir">Contenu des pages</h1>
          <p className="text-sm text-noir/50 mt-1">Éditez les textes des pages publiques</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-vert-foret text-white font-medium rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {PAGE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key ? 'bg-white text-noir shadow-sm' : 'text-noir/50 hover:text-noir'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400">Chargement...</div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => renderSection(section))}
        </div>
      )}
    </div>
  );
}
