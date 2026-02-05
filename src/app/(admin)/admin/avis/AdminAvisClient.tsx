'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ratingStars, formatDate } from '@/lib/utils';

interface AvisItem {
  id: string;
  name: string;
  location: string;
  clientType: string;
  rating: number;
  projectType: string;
  testimonial: string;
  verified: boolean;
  published: boolean;
  date: string;
}

const EMPTY: Omit<AvisItem, 'id'> = {
  name: '', location: '', clientType: 'Particulier', rating: 5,
  projectType: '', testimonial: '', verified: false, published: false,
  date: new Date().toISOString(),
};

export function AdminAvisClient() {
  const [items, setItems] = useState<AvisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AvisItem | null>(null);
  const [form, setForm] = useState<Omit<AvisItem, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/avis');
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

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (item: AvisItem) => {
    setEditing(item);
    setForm({
      name: item.name, location: item.location, clientType: item.clientType,
      rating: item.rating, projectType: item.projectType, testimonial: item.testimonial,
      verified: item.verified, published: item.published, date: item.date,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/avis/${editing.id}` : '/api/admin/avis';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editing ? 'Avis modifié' : 'Avis créé');
      setModalOpen(false);
      load();
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return;
    try {
      await fetch(`/api/admin/avis/${id}`, { method: 'DELETE' });
      toast.success('Avis supprimé');
      load();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-noir">Avis clients</h1>
          <p className="text-sm text-noir/50 mt-1">{items.length} avis</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-vert-foret text-white font-medium rounded-lg hover:bg-vert-foret-dark transition-colors">
          + Nouvel avis
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Nom</th>
              <th className="px-4 py-3 font-medium text-gray-600">Note</th>
              <th className="px-4 py-3 font-medium text-gray-600">Type projet</th>
              <th className="px-4 py-3 font-medium text-gray-600">Vérifié</th>
              <th className="px-4 py-3 font-medium text-gray-600">Publié</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-noir">{item.name}</td>
                <td className="px-4 py-3 text-bois-clair text-xs">{ratingStars(item.rating)}</td>
                <td className="px-4 py-3 text-gray-500">{item.projectType || '-'}</td>
                <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full ${item.verified ? 'bg-blue-500' : 'bg-gray-300'}`} /></td>
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
        {items.length === 0 && <div className="text-center py-8 text-gray-400">Aucun avis</div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier l'avis" : 'Nouvel avis'} footer={
        <>
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </>
      }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de client</label>
              <select value={form.clientType} onChange={(e) => setForm({ ...form, clientType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret">
                <option value="Particulier">Particulier</option>
                <option value="Professionnel">Professionnel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (1-5)</label>
              <input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de projet</label>
            <input type="text" value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="ex: Cuisine, Dressing, Bibliothèque..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Témoignage</label>
            <textarea value={form.testimonial} onChange={(e) => setForm({ ...form, testimonial: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={form.date ? form.date.split('T')[0] : ''} onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} className="rounded" /> Vérifié</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" /> Publié</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
