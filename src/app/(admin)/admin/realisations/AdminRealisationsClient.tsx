'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { GalleryUpload } from '@/components/admin/GalleryUpload';
import { formatDate } from '@/lib/utils';

interface Realisation {
  id: string;
  title: string;
  slug: string;
  categoryId: string | null;
  categoryLabel?: string;
  description: string;
  body: string | null;
  image: string | null;
  gallery: { image: string }[];
  duration: string | null;
  surface: string | null;
  material: string | null;
  location: string | null;
  features: { feature: string }[];
  published: boolean;
  date: string;
  sortOrder: number;
}

interface Category { id: string; label: string; slug: string; }

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const EMPTY: Omit<Realisation, 'id'> = {
  title: '', slug: '', categoryId: null, description: '', body: null,
  image: null, gallery: [], duration: null, surface: null, material: null,
  location: null, features: [], published: false, date: new Date().toISOString(), sortOrder: 0,
};

export function AdminRealisationsClient() {
  const [items, setItems] = useState<Realisation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Realisation | null>(null);
  const [form, setForm] = useState<Omit<Realisation, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [realRes, catRes] = await Promise.all([
        fetch('/api/admin/realisations'),
        fetch('/api/admin/categories?type=realisation'),
      ]);
      if (!realRes.ok || !catRes.ok) throw new Error();
      const realData = await realRes.json();
      const catData = await catRes.json();
      setItems(Array.isArray(realData) ? realData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (item: Realisation) => {
    setEditing(item);
    setForm({
      title: item.title, slug: item.slug, categoryId: item.categoryId,
      description: item.description, body: item.body, image: item.image,
      gallery: Array.isArray(item.gallery) ? item.gallery : [],
      duration: item.duration, surface: item.surface, material: item.material,
      location: item.location, features: Array.isArray(item.features) ? item.features : [],
      published: item.published, date: item.date, sortOrder: item.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/realisations/${editing.id}` : '/api/admin/realisations';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editing ? 'Realisation modifiee' : 'Realisation creee');
      setModalOpen(false);
      load();
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette realisation ?')) return;
    try {
      await fetch(`/api/admin/realisations/${id}`, { method: 'DELETE' });
      toast.success('Realisation supprimee');
      load();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const addFeature = () => setForm({ ...form, features: [...form.features, { feature: '' }] });
  const removeFeature = (i: number) => setForm({ ...form, features: form.features.filter((_, j) => j !== i) });
  const updateFeature = (i: number, v: string) => {
    const f = [...form.features];
    f[i] = { feature: v };
    setForm({ ...form, features: f });
  };

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-noir">Realisations</h1>
          <p className="text-sm text-noir/50 mt-1">{items.length} realisations</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-vert-foret text-white font-medium rounded-lg hover:bg-vert-foret-dark transition-colors">
          + Nouvelle realisation
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Image</th>
              <th className="px-4 py-3 font-medium text-gray-600">Titre</th>
              <th className="px-4 py-3 font-medium text-gray-600">Categorie</th>
              <th className="px-4 py-3 font-medium text-gray-600">Publie</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {item.image ? <img src={item.image} alt="" className="w-12 h-9 object-cover rounded" /> : <div className="w-12 h-9 bg-gray-100 rounded" />}
                </td>
                <td className="px-4 py-3 font-medium text-noir">{item.title}</td>
                <td className="px-4 py-3 text-gray-500">{item.categoryLabel || '-'}</td>
                <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full ${item.published ? 'bg-green-500' : 'bg-gray-300'}`} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(item.date)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs mr-3">Modifier</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline text-xs">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="text-center py-8 text-gray-400">Aucune realisation</div>}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la realisation' : 'Nouvelle realisation'} size="xl" footer={
        <>
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </>
      }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret font-mono text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
            <select value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret">
              <option value="">-- Aucune --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description courte</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu detaille</label>
            <textarea value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Duree</label><input type="text" value={form.duration || ''} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="ex: 3 semaines" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Surface</label><input type="text" value={form.surface || ''} onChange={(e) => setForm({ ...form, surface: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="ex: 25m2" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Materiau</label><input type="text" value={form.material || ''} onChange={(e) => setForm({ ...form, material: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="ex: Chene massif" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label><input type="text" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="ex: Lille" /></div>
          </div>

          <ImageUpload value={form.image || ''} onChange={(path) => setForm({ ...form, image: path || null })} label="Image principale" />

          <GalleryUpload value={form.gallery} onChange={(gallery) => setForm({ ...form, gallery })} />

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Caracteristiques</label>
            {form.features.map((f, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="text" value={f.feature} onChange={(e) => updateFeature(i, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm" placeholder="Caracteristique" />
                <button type="button" onClick={() => removeFeature(i)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">x</button>
              </div>
            ))}
            <button type="button" onClick={addFeature} className="text-sm text-vert-foret hover:underline">+ Ajouter</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><input type="date" value={form.date ? form.date.split('T')[0] : ''} onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
            Publie
          </label>
        </div>
      </Modal>
    </div>
  );
}
