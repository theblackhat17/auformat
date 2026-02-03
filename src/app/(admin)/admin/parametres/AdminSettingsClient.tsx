'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';

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
}

const EMPTY: Settings = {
  companyName: '', slogan: '', address: '', zipcode: '', city: '',
  phone: '', email: '', hoursWeekdays: '', hoursSaturday: '', hoursSunday: '',
  instagram: '', facebook: '',
};

export function AdminSettingsClient() {
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (data && !data.error) setSettings({ ...EMPTY, ...data }); else throw new Error(); })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success('Parametres enregistres');
    } catch {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof Settings, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-noir">Parametres du site</h1>
          <p className="text-sm text-noir/50 mt-1">Informations generales, contact et reseaux sociaux</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-vert-foret text-white font-medium rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div className="space-y-8">
        {/* General */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-noir mb-4">Informations generales</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la societe</label>
              <input type="text" value={settings.companyName} onChange={(e) => update('companyName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slogan</label>
              <input type="text" value={settings.slogan} onChange={(e) => update('slogan', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-noir mb-4">Contact</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input type="text" value={settings.address} onChange={(e) => update('address', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input type="text" value={settings.zipcode} onChange={(e) => update('zipcode', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input type="text" value={settings.city} onChange={(e) => update('city', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input type="text" value={settings.phone} onChange={(e) => update('phone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-noir mb-4">Horaires</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lundi - Vendredi</label>
              <input type="text" value={settings.hoursWeekdays} onChange={(e) => update('hoursWeekdays', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Samedi</label>
              <input type="text" value={settings.hoursSaturday} onChange={(e) => update('hoursSaturday', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dimanche</label>
              <input type="text" value={settings.hoursSunday} onChange={(e) => update('hoursSunday', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" />
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-noir mb-4">Reseaux sociaux</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (URL)</label>
              <input type="url" value={settings.instagram || ''} onChange={(e) => update('instagram', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook (URL)</label>
              <input type="url" value={settings.facebook || ''} onChange={(e) => update('facebook', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret" placeholder="https://facebook.com/..." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
