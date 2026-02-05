'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/admin/ImageUpload';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo: string | null;
  description: string | null;
  sortOrder: number;
  published: boolean;
}

const EMPTY: Omit<TeamMember, 'id'> = {
  name: '', role: '', photo: null, description: null, sortOrder: 0, published: false,
};

export function AdminEquipeClient() {
  const [items, setItems] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<Omit<TeamMember, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/equipe');
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
  const openEdit = (item: TeamMember) => {
    setEditing(item);
    setForm({ name: item.name, role: item.role, photo: item.photo, description: item.description, sortOrder: item.sortOrder, published: item.published });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/equipe/${editing.id}` : '/api/admin/equipe';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editing ? 'Membre modifié' : 'Membre ajouté');
      setModalOpen(false);
      load();
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce membre ?')) return;
    try {
      await fetch(`/api/admin/equipe/${id}`, { method: 'DELETE' });
      toast.success('Membre supprimé');
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
          <h1 className="text-2xl font-bold text-noir">Équipe</h1>
          <p className="text-sm text-noir/50 mt-1">{items.length} membres</p>
        </div>
        <button onClick={openCreate} className="px-5 py-2.5 bg-vert-foret text-white font-medium rounded-lg hover:bg-vert-foret-dark transition-colors">
          + Nouveau membre
        </button>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((member) => (
          <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-6 text-center relative">
            <div className="w-24 h-24 mx-auto rounded-full bg-beige overflow-hidden mb-4">
              {member.photo ? (
                <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-bois-fonce">{member.name.charAt(0)}</div>
              )}
            </div>
            <h3 className="font-semibold text-noir">{member.name}</h3>
            <p className="text-sm text-gray-500">{member.role || '-'}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`inline-block w-2 h-2 rounded-full ${member.published ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-400">Ordre: {member.sortOrder}</span>
            </div>
            <div className="flex gap-2 mt-4 justify-center">
              <button onClick={() => openEdit(member)} className="text-blue-600 hover:underline text-xs">Modifier</button>
              <button onClick={() => handleDelete(member.id)} className="text-red-500 hover:underline text-xs">Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-400">Aucun membre dans l&apos;équipe</div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le membre' : 'Nouveau membre'} footer={
        <>
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </>
      }>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Rôle / Poste</label><input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="ex: Menuisier, Gérant..." /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret text-sm" /></div>

          <ImageUpload value={form.photo || ''} onChange={(path) => setForm({ ...form, photo: path || null })} label="Photo" />

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Ordre d&apos;affichage</label><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" /></div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
            Publié
          </label>
        </div>
      </Modal>
    </div>
  );
}
