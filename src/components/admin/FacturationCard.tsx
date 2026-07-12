'use client';

import { useState } from 'react';
import type { ProjectMilestone, ProjectStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

type Milestones = Record<string, { done: boolean; date?: string | null; by?: string | null }>;

/** ISO → valeur d'<input type="date"> en heure locale (pas UTC) */
function isoToInputDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Bloc « Facturation » (onglet Notes) : rappelle les étapes d'acompte et de
 * solde avec leur date de franchissement. Cocher / décocher / changer la date
 * écrit les mêmes jalons que l'onglet Étapes et le kanban → tout reste synchro.
 * `endpoint` = API milestones (projet ou dossier), PATCH { key, done, date? }.
 */
export function FacturationCard({ endpoint, catalog, milestones, onChanged }: {
  endpoint: string;
  catalog: ProjectMilestone[];
  milestones: Milestones;
  onChanged: (milestones: Milestones, status: ProjectStatus) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  // Étapes de facturation : acompte + solde (repérées par leur clé dans le catalogue)
  const billing = catalog.filter((m) => /acompte|solde/i.test(m.key) || /acompte|solde/i.test(m.label));
  if (billing.length === 0) return null;

  async function patch(key: string, done: boolean, date?: string) {
    setSaving(key);
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, done, ...(date ? { date: new Date(`${date}T12:00`).toISOString() } : {}) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || 'Erreur lors de la mise à jour');
        return;
      }
      onChanged(data.milestones || {}, data.status);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-semibold text-noir mb-1">Facturation</p>
      <p className="text-xs text-noir/50 mb-3">Synchronisé avec l&apos;onglet Étapes et le kanban. La date est modifiable une fois l&apos;étape cochée.</p>
      <ul className="space-y-2">
        {billing.map((m) => {
          const state = milestones[m.key];
          const done = state?.done === true;
          return (
            <li key={m.key} className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2.5 text-sm text-noir/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={done}
                  disabled={saving === m.key}
                  onChange={(e) => patch(m.key, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-vert-foret focus:ring-vert-foret"
                />
                <span className={done ? 'font-medium text-noir' : ''}>{m.label}</span>
              </label>
              {done && (
                <span className="flex items-center gap-1.5 text-xs text-noir/55">
                  {state?.date ? <>faite le <strong className="font-medium text-noir/80">{formatDate(state.date)}</strong></> : 'date inconnue'}
                  <input
                    type="date"
                    value={state?.date ? isoToInputDate(state.date) : ''}
                    disabled={saving === m.key}
                    onChange={(e) => { if (e.target.value) patch(m.key, true, e.target.value); }}
                    className="px-1.5 py-0.5 bg-white border border-noir/20 rounded text-xs focus:outline-none focus:border-vert-foret"
                    aria-label={`Date de « ${m.label} »`}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Date de franchissement d'une étape terminée : affichée avec un champ date
 * pour la corriger a posteriori (onglet Étapes).
 */
export function MilestoneDateEdit({ dateIso, disabled, onSave }: {
  dateIso: string | null | undefined;
  disabled?: boolean;
  onSave: (date: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-noir/45">
      {dateIso ? <>Franchie le {formatDate(dateIso)}</> : 'Franchie'}
      <input
        type="date"
        value={dateIso ? isoToInputDate(dateIso) : ''}
        disabled={disabled}
        onChange={(e) => { if (e.target.value) onSave(e.target.value); }}
        onClick={(e) => e.stopPropagation()}
        className="px-1.5 py-0.5 bg-white border border-noir/15 rounded text-xs text-noir/60 focus:outline-none focus:border-vert-foret"
        aria-label="Modifier la date de l'étape"
        title="Modifier la date"
      />
    </span>
  );
}
