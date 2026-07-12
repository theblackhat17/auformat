'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ClientContact, ClientWithStats, Project, Quote, UserSession } from '@/lib/types';
import { formatDate, formatPrice, timeAgo, getInitials } from '@/lib/utils';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/lib/constants';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function ClientDetailClient({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [data, setData] = useState<{ client: ClientWithStats; projects: Project[]; quotes: Quote[]; sessions: UserSession[]; contacts: ClientContact[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', companyName: '', phone: '', address: '', discountRate: 0 });
  const [inviting, setInviting] = useState(false);

  /** Envoie (ou renvoie) l'e-mail d'accès : lien de définition du mot de passe pour activer le compte */
  async function handleInvite() {
    if (!data?.client?.email) return;
    setInviting(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.client.email, fullName: data.client.fullName || '', sendInvite: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        toast.error(d?.error || "Erreur lors de l'envoi de l'invitation");
        return;
      }
      toast.success(`E-mail d'accès envoyé à ${data.client.email}`);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setInviting(false);
    }
  }

  useEffect(() => {
    fetch(`/api/admin/clients/${clientId}`).then((r) => r.json()).then((d) => {
      setData(d);
      if (d.client) {
        setEditForm({
          fullName: d.client.fullName || '',
          companyName: d.client.companyName || '',
          phone: d.client.phone || '',
          address: d.client.address || '',
          discountRate: d.client.discountRate || 0,
        });
      }
    }).finally(() => setLoading(false));
  }, [clientId]);

  async function handleSaveEdit() {
    const res = await fetch(`/api/profiles/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditModal(false);
      // Reload
      const d = await fetch(`/api/admin/clients/${clientId}`).then((r) => r.json());
      setData(d);
    }
  }

  if (loading || !data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  const { client, projects, quotes, sessions } = data;
  const tabs = ['overview', 'projects', 'quotes', 'notes', 'history'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-vert-foret text-white flex items-center justify-center text-xl font-bold">
            {getInitials(client.fullName)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-noir">{client.fullName || client.email}</h1>
            {client.companyName && <p className="text-sm text-noir/50">{client.companyName}</p>}
            <p className="text-xs text-noir/30 mt-1">Client depuis {formatDate(client.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInvite}
            isLoading={inviting}
            title="Envoie un e-mail avec un lien pour définir son mot de passe et activer son compte"
          >
            {client.totalLogins > 0 ? "Renvoyer l'accès" : 'Envoyer l’accès au compte'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>🖨 Imprimer</Button>
          <Button variant="outline" size="sm" onClick={() => setEditModal(true)}>Modifier</Button>
          <Link href={`/admin/devis?client=${clientId}`}><Button size="sm">Nouveau devis</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm"><p className="text-xs text-noir/40">Projets</p><p className="text-2xl font-bold text-noir">{client.totalProjects}</p></Card>
        <Card padding="sm"><p className="text-xs text-noir/40">Devis</p><p className="text-2xl font-bold text-noir">{client.totalQuotes}</p></Card>
        <Card padding="sm"><p className="text-xs text-noir/40">CA Total</p><p className="text-2xl font-bold text-vert-foret">{formatPrice(client.totalRevenue)}</p></Card>
        <Card padding="sm"><p className="text-xs text-noir/40">Connexions</p><p className="text-2xl font-bold text-noir">{client.totalLogins}</p></Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-0">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-vert-foret text-vert-foret' : 'border-transparent text-noir/40 hover:text-noir/70'}`}>
            {tab === 'overview' ? 'Apercu' : tab === 'projects' ? 'Projets' : tab === 'quotes' ? 'Devis' : tab === 'notes' ? 'Notes' : 'Historique'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-noir/40 text-xs block">Email</span>{client.email}</div>
              <div><span className="text-noir/40 text-xs block">Telephone</span>{client.phone || '—'}</div>
              <div><span className="text-noir/40 text-xs block">Adresse</span>{client.address || '—'}</div>
              <div><span className="text-noir/40 text-xs block">Remise</span>{client.discountRate > 0 ? `${client.discountRate}%` : 'Aucune'}</div>
              <div><span className="text-noir/40 text-xs block">Dernière visite</span>{client.lastSeen ? timeAgo(client.lastSeen) : 'Jamais'}</div>
            </div>
          </Card>
          <ContactsCard
            clientId={clientId}
            contacts={data.contacts || []}
            onChanged={(contacts) => setData((d) => (d ? { ...d, contacts } : d))}
          />
        </div>
      )}

      {activeTab === 'notes' && (
        <ClientNotesCard clientId={clientId} value={client.adminNotes || ''} onSaved={(adminNotes) => setData((d) => (d ? { ...d, client: { ...d.client, adminNotes } } : d))} />
      )}

      {activeTab === 'projects' && (
        <div className="space-y-3">
          <AssignProjectCard
            clientId={clientId}
            onAssigned={async () => {
              const d = await fetch(`/api/admin/clients/${clientId}`).then((r) => r.json());
              setData(d);
            }}
          />
          {projects.length === 0 ? <p className="text-sm text-noir/40 py-8 text-center">Aucun projet</p> : projects.map((p) => (
            <Card key={p.id} padding="sm" className="flex items-center justify-between">
              <div>
                <p className="font-medium text-noir">{p.name}</p>
                <p className="text-xs text-noir/40">{formatDate(p.createdAt)}</p>
              </div>
              <Badge variant={PROJECT_STATUS_COLORS[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="space-y-3">
          {quotes.length === 0 ? <p className="text-sm text-noir/40 py-8 text-center">Aucun devis</p> : quotes.map((q) => (
            <Card key={q.id} padding="sm" className="flex items-center justify-between">
              <div>
                <p className="font-medium text-noir">{q.title} <span className="text-xs text-noir/30 font-mono">{q.quoteNumber}</span></p>
                <p className="text-xs text-noir/40">{formatDate(q.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-noir">{formatPrice(q.totalTtc)}</span>
                <Badge variant={QUOTE_STATUS_COLORS[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          {sessions.length === 0 ? <p className="text-sm text-noir/40 py-8 text-center">Aucune session</p> : sessions.map((s) => (
            <Card key={s.id} padding="sm" className="flex items-center justify-between text-sm">
              <div>
                <p className="text-noir/70">{formatDate(s.loggedInAt)}</p>
                <p className="text-xs text-noir/30">{s.ipAddress} &middot; {(s.userAgent || '').slice(0, 50)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Fiche imprimable (visible uniquement à l'impression) */}
      <ClientPrintSheet client={client} contacts={data.contacts || []} projects={projects} quotes={quotes} />

      {/* Edit modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Modifier le client" footer={
        <>
          <Button variant="ghost" onClick={() => setEditModal(false)}>Annuler</Button>
          <Button onClick={handleSaveEdit}>Enregistrer</Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Nom complet" value={editForm.fullName} onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} />
          <Input label="Societe" value={editForm.companyName} onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))} />
          <Input label="Telephone" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
          <Input label="Adresse" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
          <Input label="Remise (%)" type="number" min={0} max={100} value={String(editForm.discountRate)} onChange={(e) => setEditForm((p) => ({ ...p, discountRate: Number(e.target.value) }))} />
        </div>
      </Modal>
    </div>
  );
}

/* ————— Contacts supplémentaires : reçoivent tous les e-mails envoyés au client ————— */
function ContactsCard({ clientId, contacts, onChanged }: { clientId: string; contacts: ClientContact[]; onChanged: (contacts: ClientContact[]) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!form.email.trim()) { setError('E-mail requis'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error || "Erreur lors de l'ajout"); return; }
      const next = contacts.filter((c) => c.id !== data.contact.id).concat(data.contact);
      onChanged(next);
      setForm({ name: '', email: '', phone: '' });
    } catch {
      setError('Erreur réseau');
    } finally {
      setBusy(false);
    }
  }

  async function remove(contact: ClientContact) {
    if (!confirm(`Retirer « ${contact.email} » des contacts ? Cette adresse ne recevra plus les e-mails du client.`)) return;
    const res = await fetch(`/api/admin/clients/${clientId}/contacts`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: contact.id }),
    });
    if (res.ok) onChanged(contacts.filter((c) => c.id !== contact.id));
  }

  return (
    <Card>
      <CardTitle>Contacts supplémentaires</CardTitle>
      <p className="text-xs text-noir/50 mb-4">Ces adresses reçoivent aussi tous les e-mails envoyés au client (suivi de projet, devis, messagerie, relances).</p>
      {contacts.length === 0 ? (
        <p className="text-sm text-noir/45 mb-4">Aucun contact supplémentaire — les e-mails ne partent qu&apos;à l&apos;adresse principale.</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-4">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-noir truncate">{c.name || c.email}</p>
                <p className="text-xs text-noir/45 truncate">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
              </div>
              <button onClick={() => remove(c)} className="text-sm text-red-600 hover:underline shrink-0">Retirer</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
        <div className="flex-1 min-w-[160px]">
          <Input label="Nom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex. Conjoint, architecte…" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input label="E-mail *" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Input label="Téléphone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <Button size="sm" onClick={add} isLoading={busy}>+ Ajouter</Button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </Card>
  );
}

/* ————— Attribuer un projet existant au client ————— */
/** Propose les projets encore sans client et hors dossier (un projet en dossier hérite du client de son dossier) */
function AssignProjectCard({ clientId, onAssigned }: { clientId: string; onAssigned: () => Promise<void> }) {
  const toast = useToast();
  const [candidates, setCandidates] = useState<{ id: string; name: string }[] | null>(null);
  const [selected, setSelected] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/projects')
      .then((r) => r.json())
      .then((all) => {
        if (cancelled || !Array.isArray(all)) return;
        setCandidates(all.filter((p: Project) => !p.userId && !p.folderId).map((p: Project) => ({ id: p.id, name: p.name })));
      })
      .catch(() => { if (!cancelled) setCandidates([]); });
    return () => { cancelled = true; };
  }, []);

  async function assign() {
    if (!selected) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/projects/${selected}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientUserId: clientId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Projet attribué au client');
      setCandidates((c) => (c ? c.filter((p) => p.id !== selected) : c));
      setSelected('');
      await onAssigned();
    } catch {
      toast.error("Erreur lors de l'attribution");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Card padding="sm">
      <p className="text-sm font-semibold text-noir mb-1">Attribuer un projet</p>
      <p className="text-xs text-noir/45 mb-3">
        Projets sans client, hors dossier — un projet dans un dossier hérite du client attribué au dossier.
      </p>
      {candidates === null ? (
        <p className="text-sm text-noir/40">Chargement…</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-noir/45">Aucun projet sans client à attribuer.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 min-w-[220px] px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
          >
            <option value="">Choisir un projet…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button size="sm" onClick={assign} isLoading={assigning} disabled={!selected}>Attribuer</Button>
        </div>
      )}
    </Card>
  );
}

/* ————— Notes internes sur le client (jamais visibles côté client) ————— */
function ClientNotesCard({ clientId, value, onSaved }: { clientId: string; value: string; onSaved: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  async function save() {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: text }),
      });
      if (!res.ok) throw new Error();
      onSaved(text);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardTitle>Notes internes</CardTitle>
      <p className="text-xs text-noir/50 mb-3">Jamais visibles par le client.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Préférences, historique des échanges, points d'attention…"
        className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret resize-y"
      />
      <div className="mt-3 flex items-center justify-end gap-3">
        {status === 'saved' && <span className="text-xs text-vert-foret">Notes enregistrées</span>}
        {status === 'error' && <span className="text-xs text-red-600">Erreur lors de l&apos;enregistrement</span>}
        <Button size="sm" onClick={save} isLoading={saving}>Enregistrer</Button>
      </div>
    </Card>
  );
}

/* ————— Fiche client imprimable : identité, contacts, notes, projets, devis ————— */
function ClientPrintSheet({ client, contacts, projects, quotes }: {
  client: ClientWithStats;
  contacts: ClientContact[];
  projects: Project[];
  quotes: Quote[];
}) {
  return (
    <div id="client-print" className="hidden print:block">
      <style>{`@media print {
        body * { visibility: hidden; }
        #client-print, #client-print * { visibility: visible; }
        #client-print { position: absolute; left: 0; top: 0; width: 100%; }
      }`}</style>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Fiche client — {client.fullName || client.email}</h1>
      <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
        {client.companyName ? `${client.companyName} · ` : ''}Client depuis le {formatDate(client.createdAt)}
      </p>

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Coordonnées</h2>
      <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={{ width: 140, color: '#777', padding: '2px 0' }}>E-mail</td><td style={{ padding: '2px 0' }}>{client.email}</td></tr>
          <tr><td style={{ width: 140, color: '#777', padding: '2px 0' }}>Téléphone</td><td style={{ padding: '2px 0' }}>{client.phone || '—'}</td></tr>
          <tr><td style={{ width: 140, color: '#777', padding: '2px 0' }}>Adresse</td><td style={{ padding: '2px 0' }}>{client.address || '—'}</td></tr>
          <tr><td style={{ width: 140, color: '#777', padding: '2px 0' }}>Remise</td><td style={{ padding: '2px 0' }}>{client.discountRate > 0 ? `${client.discountRate}%` : 'Aucune'}</td></tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Contacts supplémentaires</h2>
      {contacts.length === 0 ? (
        <p style={{ fontSize: 12, color: '#777' }}>Aucun.</p>
      ) : (
        <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td style={{ width: 140, padding: '2px 0' }}>{c.name || '—'}</td>
                <td style={{ padding: '2px 0' }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {client.adminNotes?.trim() && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Notes internes</h2>
          <p style={{ fontSize: 12, whiteSpace: 'pre-line' }}>{client.adminNotes}</p>
        </>
      )}

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Projets ({projects.length})</h2>
      {projects.length === 0 ? (
        <p style={{ fontSize: 12, color: '#777' }}>Aucun projet.</p>
      ) : (
        <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#777' }}>
              <th style={{ padding: '2px 8px 2px 0' }}>Projet</th>
              <th style={{ padding: '2px 8px 2px 0' }}>Créé le</th>
              <th style={{ padding: '2px 0' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: '3px 8px 3px 0', borderTop: '1px solid #eee' }}>{p.name}</td>
                <td style={{ padding: '3px 8px 3px 0', borderTop: '1px solid #eee' }}>{formatDate(p.createdAt)}</td>
                <td style={{ padding: '3px 0', borderTop: '1px solid #eee' }}>{PROJECT_STATUS_LABELS[p.status] || p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>Devis ({quotes.length})</h2>
      {quotes.length === 0 ? (
        <p style={{ fontSize: 12, color: '#777' }}>Aucun devis.</p>
      ) : (
        <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#777' }}>
              <th style={{ padding: '2px 8px 2px 0' }}>Numéro</th>
              <th style={{ padding: '2px 8px 2px 0' }}>Titre</th>
              <th style={{ padding: '2px 8px 2px 0' }}>Créé le</th>
              <th style={{ padding: '2px 8px 2px 0', textAlign: 'right' }}>Total TTC</th>
              <th style={{ padding: '2px 0' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td style={{ padding: '3px 8px 3px 0', borderTop: '1px solid #eee' }}>{q.quoteNumber}</td>
                <td style={{ padding: '3px 8px 3px 0', borderTop: '1px solid #eee' }}>{q.title}</td>
                <td style={{ padding: '3px 8px 3px 0', borderTop: '1px solid #eee' }}>{formatDate(q.createdAt)}</td>
                <td style={{ padding: '3px 8px 3px 0', borderTop: '1px solid #eee', textAlign: 'right' }}>{formatPrice(q.totalTtc)}</td>
                <td style={{ padding: '3px 0', borderTop: '1px solid #eee' }}>{QUOTE_STATUS_LABELS[q.status] || q.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
