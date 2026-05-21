'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/admin/ImageUpload';

interface ServiceContent {
  intro?: string;
  features?: { title: string; desc: string }[];
  body?: string;
  cta_title?: string;
  cta_text?: string;
}

interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  shortDescription: string | null;
  image: string | null;
  content: ServiceContent;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  sortOrder: number;
  published: boolean;
}

const EMPTY: Omit<ServiceItem, 'id'> = {
  slug: '', title: '', subtitle: null, icon: null, shortDescription: null,
  image: null, content: { intro: '', features: [], body: '', cta_title: '', cta_text: '' },
  metaTitle: null, metaDescription: null, metaKeywords: null,
  sortOrder: 0, published: true,
};

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function AdminServicesClient() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<Omit<ServiceItem, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'general' | 'content' | 'seo'>('general');
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/services');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setTab('general'); setModalOpen(true); };
  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setForm({
      slug: item.slug, title: item.title, subtitle: item.subtitle,
      icon: item.icon, shortDescription: item.shortDescription, image: item.image,
      content: typeof item.content === 'object' && item.content ? item.content : { intro: '', features: [], body: '', cta_title: '', cta_text: '' },
      metaTitle: item.metaTitle, metaDescription: item.metaDescription,
      metaKeywords: item.metaKeywords, sortOrder: item.sortOrder, published: item.published,
    });
    setTab('general');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.slug || !form.title) { toast.error('Slug et titre requis'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/services/${editing.id}` : '/api/admin/services';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erreur'); }
      toast.success(editing ? 'Service modifie' : 'Service cree');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ServiceItem) => {
    if (!confirm(`Supprimer "${item.title}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/services/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Service supprime');
      load();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const updateContent = (key: keyof ServiceContent, value: unknown) => {
    setForm((prev) => ({ ...prev, content: { ...prev.content, [key]: value } }));
  };

  const addFeature = () => {
    const features = [...(form.content.features || []), { title: '', desc: '' }];
    updateContent('features', features);
  };

  const removeFeature = (idx: number) => {
    const features = (form.content.features || []).filter((_, i) => i !== idx);
    updateContent('features', features);
  };

  const updateFeature = (idx: number, key: 'title' | 'desc', value: string) => {
    const features = [...(form.content.features || [])];
    features[idx] = { ...features[idx], [key]: value };
    updateContent('features', features);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-1">Pages de services visibles sur /services/[slug]</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium">
          + Nouveau service
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Ordre</th>
              <th className="text-left px-4 py-3 font-medium">Service</th>
              <th className="text-left px-4 py-3 font-medium">Slug</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{item.sortOrder}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <Image src={item.image} alt="" width={40} height={40} className="rounded object-cover" />
                    ) : (
                      <span className="text-2xl">{item.icon || '📦'}</span>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.shortDescription?.slice(0, 60)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">/services/{item.slug}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.published ? 'Publie' : 'Brouillon'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">Modifier</button>
                  <button onClick={() => handleDelete(item)} className="text-red-500 hover:underline text-xs">Supprimer</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun service</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Modifier : ${editing.title}` : 'Nouveau service'} size="lg">
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {(['general', 'content', 'seo'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'general' ? 'General' : t === 'content' ? 'Contenu' : 'SEO'}
              </button>
            ))}
          </div>

          {/* General tab */}
          {tab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input value={form.title} onChange={(e) => {
                    const title = e.target.value;
                    setForm((prev) => ({ ...prev, title, slug: editing ? prev.slug : slugify(title) }));
                  }} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
                  <input value={form.subtitle || ''} onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icone (emoji)</label>
                  <input value={form.icon || ''} onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="🏠" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description courte (carte homepage)</label>
                <textarea value={form.shortDescription || ''} onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image principale</label>
                <ImageUpload value={form.image || undefined} onChange={(url) => setForm((prev) => ({ ...prev, image: url }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.published} onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                      className="rounded" />
                    <span className="text-sm text-gray-700">Publie</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Content tab */}
          {tab === 'content' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Introduction</label>
                <textarea value={form.content.intro || ''} onChange={(e) => updateContent('intro', e.target.value)}
                  rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Paragraphe d'introduction du service..." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Points forts</label>
                  <button onClick={addFeature} className="text-xs text-green-700 hover:underline">+ Ajouter</button>
                </div>
                {(form.content.features || []).map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={f.title} onChange={(e) => updateFeature(i, 'title', e.target.value)}
                      placeholder="Titre" className="w-1/3 border rounded-lg px-3 py-2 text-sm" />
                    <input value={f.desc} onChange={(e) => updateFeature(i, 'desc', e.target.value)}
                      placeholder="Description" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    <button onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 px-2">x</button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu additionnel</label>
                <textarea value={form.content.body || ''} onChange={(e) => updateContent('body', e.target.value)}
                  rows={6} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Texte libre, details du service..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre CTA</label>
                  <input value={form.content.cta_title || ''} onChange={(e) => updateContent('cta_title', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Un projet ?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texte CTA</label>
                  <input value={form.content.cta_text || ''} onChange={(e) => updateContent('cta_text', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Contactez-nous pour un devis." />
                </div>
              </div>
            </div>
          )}

          {/* SEO tab */}
          {tab === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta titre</label>
                <input value={form.metaTitle || ''} onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Titre pour Google (60 car. max)" />
                <p className="text-xs text-gray-400 mt-1">{(form.metaTitle || '').length}/60</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta description</label>
                <textarea value={form.metaDescription || ''} onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description pour Google (160 car. max)" />
                <p className="text-xs text-gray-400 mt-1">{(form.metaDescription || '').length}/160</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mots-cles (separes par des virgules)</label>
                <input value={form.metaKeywords || ''} onChange={(e) => setForm((prev) => ({ ...prev, metaKeywords: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium disabled:opacity-50">
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
