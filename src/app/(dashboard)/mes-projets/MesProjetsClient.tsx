'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Project } from '@/lib/types';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_TYPE_ICONS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export function MesProjetsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteModal, setQuoteModal] = useState<Project | null>(null);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/projects').then((r) => r.json()).then(setProjects).finally(() => setLoading(false));
  }, []);

  async function handleDelete(project: Project) {
    if (!confirm(`Supprimer le projet "${project.name}" ?`)) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
    if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== project.id));
  }

  async function handleRequestQuote() {
    if (!quoteModal) return;
    setSubmitting(true);
    const res = await fetch(`/api/projects/${quoteModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'quote_requested', notes: quoteMessage }),
    });
    if (res.ok) {
      setProjects((prev) => prev.map((p) => p.id === quoteModal.id ? { ...p, status: 'quote_requested' as const, notes: quoteMessage } : p));
      setQuoteModal(null);
      setQuoteMessage('');
    }
    setSubmitting(false);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-noir">Mes projets</h1>
          <p className="text-sm text-noir/50 mt-1">{projects.length} projet(s)</p>
        </div>
        <Link href="/configurateur">
          <Button>Nouveau projet</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon="📁" title="Aucun projet" description="Utilisez le configurateur 3D pour créer votre premier projet." action={<Link href="/configurateur"><Button>Ouvrir le configurateur</Button></Link>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} hover>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{PROJECT_TYPE_ICONS[project.type] || '🎨'}</span>
                <Badge variant={PROJECT_STATUS_COLORS[project.status]}>{PROJECT_STATUS_LABELS[project.status] || project.status}</Badge>
              </div>
              <h3 className="text-lg font-semibold text-noir mb-1">{project.name}</h3>
              <p className="text-xs text-noir/40 mb-4">{formatDate(project.createdAt)}</p>
              {project.notes && <p className="text-sm text-noir/50 mb-4 line-clamp-2">{project.notes}</p>}
              <div className="flex gap-2 pt-3 border-t border-gray-50">
                <Link href={`/configurateur?project=${project.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">Modifier</Button>
                </Link>
                {project.status === 'draft' && (
                  <Button variant="secondary" size="sm" onClick={() => setQuoteModal(project)}>Devis</Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(project)} className="text-red-500 hover:bg-red-50">
                  🗑
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quote request modal */}
      <Modal isOpen={!!quoteModal} onClose={() => setQuoteModal(null)} title="Demander un devis" footer={
        <>
          <Button variant="ghost" onClick={() => setQuoteModal(null)}>Annuler</Button>
          <Button onClick={handleRequestQuote} isLoading={submitting}>Envoyer la demande</Button>
        </>
      }>
        <div className="space-y-4">
          <p className="text-sm text-noir/60">Projet : <strong>{quoteModal?.name}</strong></p>
          <div>
            <label className="block text-sm font-medium text-noir/70 mb-1.5">Message (optionnel)</label>
            <textarea value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} rows={4} placeholder="Précisions sur votre projet..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10 resize-none" />
          </div>
        </div>
      </Modal>
    </>
  );
}
