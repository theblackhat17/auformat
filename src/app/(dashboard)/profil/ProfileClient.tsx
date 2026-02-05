'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { getInitials, getDisplayName, formatDate } from '@/lib/utils';

export function ProfileClient() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    companyName: profile?.companyName || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  });

  if (!profile) return null;

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSuccess('');
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await refreshProfile();
        setEditing(false);
        setSuccess('Profil mis à jour avec succès');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {}
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg animate-slide-down">{success}</div>}

      {/* Header */}
      <Card className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-vert-foret text-white flex items-center justify-center text-2xl font-bold">
          {getInitials(profile.fullName)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-noir">{getDisplayName(profile)}</h2>
          <p className="text-sm text-noir/50">{profile.email}</p>
          <p className="text-xs text-noir/30 mt-1">Membre depuis {formatDate(profile.createdAt)}</p>
          {profile.discountRate > 0 && (
            <span className="inline-block mt-2 text-xs font-medium bg-vert-foret/10 text-vert-foret px-2 py-0.5 rounded-full">
              Remise {profile.discountRate}%
            </span>
          )}
        </div>
      </Card>

      {/* Info */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-noir">Informations personnelles</h3>
          <Button variant={editing ? 'ghost' : 'outline'} size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Annuler' : 'Modifier'}
          </Button>
        </div>
        {editing ? (
          <div className="space-y-4">
            <Input id="edit-fullName" label="Nom complet" value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
            <Input id="edit-companyName" label="Société" value={formData.companyName} onChange={(e) => updateField('companyName', e.target.value)} />
            <Input id="edit-phone" label="Téléphone" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
            <Input id="edit-address" label="Adresse" value={formData.address} onChange={(e) => updateField('address', e.target.value)} />
            <Button onClick={handleSave} isLoading={saving}>Enregistrer</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-noir/40 block text-xs mb-0.5">Nom complet</span><span className="text-noir">{profile.fullName || '—'}</span></div>
            <div><span className="text-noir/40 block text-xs mb-0.5">Société</span><span className="text-noir">{profile.companyName || '—'}</span></div>
            <div><span className="text-noir/40 block text-xs mb-0.5">Téléphone</span><span className="text-noir">{profile.phone || '—'}</span></div>
            <div><span className="text-noir/40 block text-xs mb-0.5">Adresse</span><span className="text-noir">{profile.address || '—'}</span></div>
          </div>
        )}
      </Card>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <a href="/mes-projets" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <span className="text-2xl">📁</span>
          <div><p className="font-medium text-noir">Mes projets</p><p className="text-xs text-noir/40">Voir mes configurations</p></div>
        </a>
        <a href="/mes-devis" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <span className="text-2xl">📄</span>
          <div><p className="font-medium text-noir">Mes devis</p><p className="text-xs text-noir/40">Consulter mes devis</p></div>
        </a>
      </div>
    </div>
  );
}
