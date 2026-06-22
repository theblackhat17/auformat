'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/lib/auth-client';
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

      <PasswordCard />
      <DataCard />
    </div>
  );
}

/** Changement de mot de passe (comptes avec mot de passe — les comptes Google n'en ont pas) */
function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleChange() {
    setFeedback(null);
    if (next.length < 8) {
      setFeedback({ ok: false, msg: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });
      return;
    }
    if (next !== confirm) {
      setFeedback({ ok: false, msg: 'La confirmation ne correspond pas.' });
      return;
    }
    setSaving(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setFeedback({ ok: false, msg: result.error.message === 'Invalid password' ? 'Mot de passe actuel incorrect.' : (result.error.message || 'Erreur — si vous vous connectez avec Google, votre compte n\'a pas de mot de passe.') });
      } else {
        setFeedback({ ok: true, msg: 'Mot de passe modifié. Vos autres sessions ont été déconnectées.' });
        setCurrent(''); setNext(''); setConfirm('');
      }
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau.' });
    }
    setSaving(false);
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-noir mb-1">Sécurité</h3>
      <p className="text-xs text-noir/50 mb-4">Changez votre mot de passe. Si vous vous connectez avec Google, ce n&apos;est pas nécessaire.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Input id="pwd-current" label="Mot de passe actuel" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <Input id="pwd-new" label="Nouveau mot de passe" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <Input id="pwd-confirm" label="Confirmation" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      {feedback && <p className={`text-sm mt-3 ${feedback.ok ? 'text-green-700' : 'text-red-600'}`}>{feedback.msg}</p>}
      <Button onClick={handleChange} isLoading={saving} size="sm" className="mt-4" disabled={!current || !next || !confirm}>
        Changer mon mot de passe
      </Button>
    </Card>
  );
}

/** RGPD : export des données + suppression du compte */
function DataCard() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la suppression');
        return;
      }
      try { await authClient.signOut(); } catch { /* la session est déjà détruite côté serveur */ }
      router.push('/');
      router.refresh();
    } catch {
      setError('Erreur réseau.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-noir mb-1">Mes données</h3>
      <p className="text-xs text-noir/50 mb-4">
        Conformément au RGPD, vous pouvez exporter l&apos;ensemble de vos données ou supprimer votre compte.
      </p>
      <div className="flex flex-wrap gap-3">
        <a href="/api/profile/export" download>
          <Button variant="outline" size="sm">Télécharger mes données (JSON)</Button>
        </a>
        {!showDelete && (
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)} className="text-red-600 hover:bg-red-50">
            Supprimer mon compte
          </Button>
        )}
      </div>
      {showDelete && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-800 font-semibold mb-1">Cette action est définitive.</p>
          <p className="text-xs text-red-700/80 mb-3 leading-relaxed">
            Vos brouillons seront supprimés et votre profil anonymisé. Les devis émis sont conservés
            anonymisés pendant la durée légale (obligation comptable). Tapez <strong>SUPPRIMER</strong> pour confirmer.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              aria-label="Tapez SUPPRIMER pour confirmer"
              className="px-3 py-2 bg-white border border-red-300 rounded-lg text-sm focus:outline-none focus:border-red-500"
            />
            <Button size="sm" onClick={handleDelete} isLoading={deleting} disabled={confirmText !== 'SUPPRIMER'} className="!bg-red-600 hover:!bg-red-700">
              Supprimer définitivement
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowDelete(false); setConfirmText(''); setError(null); }}>
              Annuler
            </Button>
          </div>
          {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
        </div>
      )}
    </Card>
  );
}
