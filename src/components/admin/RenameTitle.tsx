'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Titre de fiche renommable (projet, dossier…) : crayon à côté du nom,
 * édition en place, `onSave` renvoie true si l'enregistrement a réussi.
 */
export function RenameTitle({ name, onSave, maxLength = 120 }: {
  name: string;
  onSave: (name: string) => Promise<boolean>;
  maxLength?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <span className="flex items-center gap-2 min-w-0">
        <h1 className="text-2xl font-bold text-noir truncate">{name}</h1>
        <button
          type="button"
          onClick={() => { setValue(name); setEditing(true); }}
          className="shrink-0 text-noir/35 hover:text-vert-foret transition-colors"
          title="Renommer"
          aria-label="Renommer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
          </svg>
        </button>
      </span>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const next = value.trim();
        if (!next || next === name) { setEditing(false); return; }
        setBusy(true);
        const ok = await onSave(next);
        setBusy(false);
        if (ok) setEditing(false);
      }}
      className="flex items-center gap-2 flex-wrap"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={maxLength}
        className="text-xl font-bold text-noir px-3 py-1.5 bg-white border border-noir/20 rounded-lg focus:outline-none focus:border-vert-foret min-w-[220px]"
        aria-label="Nouveau nom"
      />
      <Button size="sm" type="submit" isLoading={busy} disabled={!value.trim()}>Enregistrer</Button>
      <button type="button" onClick={() => setEditing(false)} disabled={busy} className="text-sm text-noir/50 hover:text-noir px-1 disabled:opacity-50">
        Annuler
      </button>
    </form>
  );
}
