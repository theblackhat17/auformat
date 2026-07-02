'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProjectMilestone } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret';

/**
 * Configuration des étapes (jalons) du cycle de vie des projets :
 * libellés, ordre, ajout/suppression, indicateurs « interne (argent) »
 * et « prévenir le client ». Source de vérité partagée par le dashboard
 * et la fiche projet.
 */
export function ProjectConfigClient() {
  const toast = useToast();
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/project-settings')
      .then((r) => r.json())
      .then((d) => setMilestones(Array.isArray(d.milestones) ? d.milestones : []))
      .catch(() => toast.error('Impossible de charger la configuration'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (index: number, changes: Partial<ProjectMilestone>) =>
    setMilestones((list) => list.map((m, i) => (i === index ? { ...m, ...changes } : m)));

  const move = (index: number, delta: -1 | 1) =>
    setMilestones((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (index: number) =>
    setMilestones((list) => list.filter((_, i) => i !== index));

  const add = () =>
    setMilestones((list) => [
      ...list,
      // Clé stable générée une seule fois (ne dépend pas du libellé)
      { key: `etape_${Date.now()}`, label: 'Nouvelle étape', financial: false, clientNotify: false },
    ]);

  const save = async () => {
    if (milestones.length === 0) {
      toast.error('Au moins une étape est requise');
      return;
    }
    if (milestones.some((m) => !m.label.trim())) {
      toast.error('Chaque étape doit avoir un libellé');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/project-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setMilestones(data.milestones);
      toast.success('Étapes enregistrées');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-noir">Configuration des projets</h1>
          <p className="text-sm text-noir/50 mt-1">
            Étapes du cycle de vie : libellés, ordre, étapes internes (argent) et notifications client.
          </p>
        </div>
        <Link
          href="/admin/projets"
          className="px-4 py-2 border border-noir/20 text-noir text-sm font-medium rounded-lg hover:border-vert-foret hover:text-vert-foret transition-colors"
        >
          ← Retour aux projets
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-noir">Étapes du projet ({milestones.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={add}
              className="px-4 py-2 border border-vert-foret text-vert-foret text-sm font-medium rounded-lg hover:bg-vert-foret hover:text-white transition-colors"
            >
              + Ajouter une étape
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {milestones.map((m, i) => (
            <div key={m.key} className="border border-gray-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
              {/* Ordre */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="w-7 h-6 flex items-center justify-center text-xs border border-gray-200 rounded hover:border-vert-foret hover:text-vert-foret transition-colors disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-inherit"
                  aria-label="Monter l'étape"
                  title="Monter"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === milestones.length - 1}
                  className="w-7 h-6 flex items-center justify-center text-xs border border-gray-200 rounded hover:border-vert-foret hover:text-vert-foret transition-colors disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-inherit"
                  aria-label="Descendre l'étape"
                  title="Descendre"
                >
                  ▼
                </button>
              </div>

              <span className="w-6 text-center text-sm font-semibold text-noir/40">{i + 1}</span>

              {/* Libellé (la clé technique reste stable) */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={m.label}
                  onChange={(e) => patch(i, { label: e.target.value })}
                  className={inputCls}
                  placeholder="Libellé de l'étape"
                  aria-label={`Libellé de l'étape ${i + 1}`}
                />
              </div>

              {/* Indicateurs */}
              <label className="flex items-center gap-2 text-sm text-noir/70 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={m.financial}
                  onChange={(e) => patch(i, { financial: e.target.checked })}
                  className="accent-vert-foret w-4 h-4"
                />
                Interne (argent)
              </label>
              <label className="flex items-center gap-2 text-sm text-noir/70 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={m.clientNotify}
                  onChange={(e) => patch(i, { clientNotify: e.target.checked })}
                  className="accent-vert-foret w-4 h-4"
                />
                Prévenir le client
              </label>

              <button
                onClick={() => remove(i)}
                className="px-2.5 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                aria-label={`Supprimer l'étape « ${m.label} »`}
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {milestones.length === 0 && (
          <p className="text-sm text-noir/50 py-6 text-center">
            Aucune étape — ajoutez-en une avec « + Ajouter une étape ».
          </p>
        )}

        <p className="text-xs text-noir/40 mt-4">
          L&apos;ordre ci-dessus est celui du suivi des projets. Supprimer une étape ne supprime pas
          l&apos;historique déjà coché sur les projets existants.
        </p>
      </div>
    </>
  );
}
