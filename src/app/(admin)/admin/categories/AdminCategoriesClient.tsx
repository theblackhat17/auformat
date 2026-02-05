'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

interface Category {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  type: string;
  sortOrder: number;
  published: boolean;
}

const EMPTY: Omit<Category, 'id'> = { slug: '', label: '', icon: '', type: 'realisation', sortOrder: 0, published: true };

export function AdminCategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<Omit<Category, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setForm({ slug: cat.slug, label: cat.label, icon: cat.icon || '', type: cat.type, sortOrder: cat.sortOrder, published: cat.published }); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editing ? 'Categorie modifiee' : 'Categorie creee');
      setModalOpen(false);
      load();
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette categorie ?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erreur suppression'); return; }
      toast.success('Categorie supprimee');
      load();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const filtered = filterType === 'all' ? categories : categories.filter((c) => c.type === filterType);

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-noir">Categories</h1>
          <p className="text-sm text-noir/50 mt-1">{categories.length} categories</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-vert-foret text-white font-medium rounded-lg hover:bg-vert-foret-dark transition-colors">
          + Nouvelle categorie
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'realisation', 'material'].map((t) => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterType === t ? 'bg-vert-foret text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'all' ? 'Toutes' : t === 'realisation' ? 'Realisations' : 'Materiaux'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Label</th>
              <th className="px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 font-medium text-gray-600">Icone</th>
              <th className="px-4 py-3 font-medium text-gray-600">Ordre</th>
              <th className="px-4 py-3 font-medium text-gray-600">Publie</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-noir">{cat.label}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${cat.type === 'realisation' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{cat.type}</span></td>
                <td className="px-4 py-3 text-lg">{cat.icon || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{cat.sortOrder}</td>
                <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full ${cat.published ? 'bg-green-500' : 'bg-gray-300'}`} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(cat)} className="text-blue-600 hover:underline text-xs mr-3">Modifier</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:underline text-xs">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-gray-400">Aucune categorie</div>}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la categorie' : 'Nouvelle categorie'} footer={
        <>
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret">
              <option value="realisation">Realisation</option>
              <option value="material">Materiau</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icone (emoji)</label>
            <input type="text" value={form.icon || ''} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
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
