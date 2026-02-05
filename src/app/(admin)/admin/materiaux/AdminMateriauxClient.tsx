'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/admin/ImageUpload';

interface MateriauItem {
  id: string;
  name: string;
  latinName: string | null;
  image: string | null;
  categoryId: string | null;
  categoryLabel?: string;
  tag: string | null;
  description: string;
  hardness: number;
  stability: number;
  origin: string;
  color: string;
  features: { feature: string }[];
  usages: { usage: string }[];
  published: boolean;
  sortOrder: number;
}

interface Category { id: string; label: string; }

const EMPTY: Omit<MateriauItem, 'id'> = {
  name: '', latinName: null, image: null, categoryId: null, tag: null,
  description: '', hardness: 0, stability: 0, origin: '', color: '',
  features: [], usages: [], published: false, sortOrder: 0,
};

export function AdminMateriauxClient() {
  const [items, setItems] = useState<MateriauItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MateriauItem | null>(null);
  const [form, setForm] = useState<Omit<MateriauItem, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [matRes, catRes] = await Promise.all([
        fetch('/api/admin/materiaux'),
        fetch('/api/admin/categories?type=material'),
      ]);
      if (!matRes.ok || !catRes.ok) throw new Error();
      const matData = await matRes.json();
      const catData = await catRes.json();
      setItems(Array.isArray(matData) ? matData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item: MateriauItem) => {
    setEditing(item);
    setForm({
      name: item.name, latinName: item.latinName, image: item.image,
      categoryId: item.categoryId, tag: item.tag, description: item.description,
      hardness: item.hardness, stability: item.stability, origin: item.origin,
      color: item.color, features: Array.isArray(item.features) ? item.features : [],
      usages: Array.isArray(item.usages) ? item.usages : [], published: item.published,
      sortOrder: item.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/materiaux/${editing.id}` : '/api/admin/materiaux';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editing ? 'Matériau modifié' : 'Matériau créé');
      setModalOpen(false);
      load();
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce matériau ?')) return;
    try {
      await fetch(`/api/admin/materiaux/${id}`, { method: 'DELETE' });
      toast.success('Matériau supprimé');
      load();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const addFeature = () => setForm({ ...form, features: [...form.features, { feature: '' }] });
  const removeFeature = (i: number) => setForm({ ...form, features: form.features.filter((_, j) => j !== i) });
  const updateFeature = (i: number, v: string) => { const f = [...form.features]; f[i] = { feature: v }; setForm({ ...form, features: f }); };

  const addUsage = () => setForm({ ...form, usages: [...form.usages, { usage: '' }] });
  const removeUsage = (i: number) => setForm({ ...form, usages: form.usages.filter((_, j) => j !== i) });
  const updateUsage = (i: number, v: string) => { const u = [...form.usages]; u[i] = { usage: v }; setForm({ ...form, usages: u }); };

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-noir">Matériaux</h1>
          <p className="text-sm text-noir/50 mt-1">{items.length} matériaux</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-vert-foret text-white font-medium rounded-lg hover:bg-vert-foret-dark transition-colors">
          + Nouveau matériau
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Image</th>
              <th className="px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="px-4 py-3 font-medium text-gray-600">Catégorie</th>
              <th className="px-4 py-3 font-medium text-gray-600">Dureté</th>
              <th className="px-4 py-3 font-medium text-gray-600">Tag</th>
              <th className="px-4 py-3 font-medium text-gray-600">Publié</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{item.image ? <Image src={item.image} alt="" width={48} height={36} className="w-12 h-9 object-cover rounded" /> : <div className="w-12 h-9 bg-gray-100 rounded" />}</td>
                <td className="px-4 py-3 font-medium text-noir">{item.name}</td>
                <td className="px-4 py-3 text-gray-500">{item.categoryLabel || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{item.hardness}/5</td>
                <td className="px-4 py-3">{item.tag ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{item.tag}</span> : '-'}</td>
                <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full ${item.published ? 'bg-green-500' : 'bg-gray-300'}`} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs mr-3">Modifier</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline text-xs">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="text-center py-8 text-gray-400">Aucun matériau</div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le matériau' : 'Nouveau matériau'} size="xl" footer={
        <>
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </>
      }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom latin</label><input type="text" value={form.latinName || ''} onChange={(e) => setForm({ ...form, latinName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret italic" /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret">
                <option value="">-- Aucune --</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tag</label><input type="text" value={form.tag || ''} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="ex: Premium, Eco" /></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Dureté (0-5)</label><input type="number" min={0} max={5} value={form.hardness} onChange={(e) => setForm({ ...form, hardness: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Stabilité (0-5)</label><input type="number" min={0} max={5} value={form.stability} onChange={(e) => setForm({ ...form, stability: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Origine</label><input type="text" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label><input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
          </div>

          <ImageUpload value={form.image || ''} onChange={(path) => setForm({ ...form, image: path || null })} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Caractéristiques</label>
            {form.features.map((f, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="text" value={f.feature} onChange={(e) => updateFeature(i, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Caractéristique" />
                <button type="button" onClick={() => removeFeature(i)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">x</button>
              </div>
            ))}
            <button type="button" onClick={addFeature} className="text-sm text-vert-foret hover:underline">+ Ajouter</button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Usages</label>
            {form.usages.map((u, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="text" value={u.usage} onChange={(e) => updateUsage(i, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Usage" />
                <button type="button" onClick={() => removeUsage(i)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">x</button>
              </div>
            ))}
            <button type="button" onClick={addUsage} className="text-sm text-vert-foret hover:underline">+ Ajouter</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
            Publié
          </label>
        </div>
      </Modal>
    </div>
  );
}
