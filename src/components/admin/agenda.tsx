'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProjectEvent } from '@/lib/types';
import { PROJECT_EVENT_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

/**
 * Agenda partagé (projet ou dossier) : formulaire d'événement (type, début,
 * heure de fin optionnelle, journée entière, titre, note interne) + liste
 * à venir / passées avec édition et suppression. `endpoint` = URL de l'API
 * events (ex. /api/admin/folders/<id>/events).
 */

/** Valeurs du formulaire d'événement (dates au format des inputs natifs, heure locale) */
export type EventFormValues = {
  type: string;
  allDay: boolean;
  start: string; // datetime-local ("YYYY-MM-DDTHH:mm") ou date ("YYYY-MM-DD") si allDay
  end: string;   // idem, optionnel
  title: string;
  notes: string;
};

/** ISO → valeur d'<input type="datetime-local"> en heure locale */
function isoToDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO → valeur d'<input type="date"> en heure locale */
function isoToDateLocal(iso: string): string {
  return isoToDateTimeLocal(iso).slice(0, 10);
}

/** Valeur d'input (locale) → ISO UTC pour l'API. allDay : minuit local (fin : 23h59 local). */
function inputToIso(value: string, allDay: boolean, isEnd = false): string {
  const d = allDay ? new Date(`${value}T${isEnd ? '23:59' : '00:00'}`) : new Date(value);
  return d.toISOString();
}

/** Charge utile POST/PATCH construite depuis le formulaire */
export function eventPayload(values: EventFormValues) {
  return {
    type: values.type,
    startAt: inputToIso(values.start, values.allDay),
    endAt: values.end ? inputToIso(values.end, values.allDay, true) : null,
    allDay: values.allDay,
    title: values.title.trim() || null,
    notes: values.notes.trim() || null,
  };
}

/** Date d'un événement en français (jour entier ou date + heure, plage si fin renseignée) */
export function eventDateLabel(event: ProjectEvent): string {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const dayFmt: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const startDay = start.toLocaleDateString('fr-FR', dayFmt);
  if (event.allDay) {
    if (end && end.toDateString() !== start.toDateString()) {
      return `Du ${startDay} au ${end.toLocaleDateString('fr-FR', dayFmt)} (journée entière)`;
    }
    return `${startDay} (journée entière)`;
  }
  const time = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (end) {
    if (end.toDateString() === start.toDateString()) return `${startDay}, de ${time(start)} à ${time(end)}`;
    return `Du ${startDay} ${time(start)} au ${end.toLocaleDateString('fr-FR', dayFmt)} ${time(end)}`;
  }
  return `${startDay} à ${time(start)}`;
}

/** Formulaire d'événement partagé entre création et édition */
export function EventForm({
  initial,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ProjectEvent;
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => void;
  onCancel?: () => void;
}) {
  const [type, setType] = useState(initial?.type || PROJECT_EVENT_TYPES[0].key);
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [start, setStart] = useState(() =>
    initial ? (initial.allDay ? isoToDateLocal(initial.startAt) : isoToDateTimeLocal(initial.startAt)) : ''
  );
  const [end, setEnd] = useState(() =>
    initial?.endAt ? (initial.allDay ? isoToDateLocal(initial.endAt) : isoToDateTimeLocal(initial.endAt)) : ''
  );
  const [title, setTitle] = useState(initial?.title || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  /** Bascule journée entière : convertit les valeurs saisies sans les perdre */
  function toggleAllDay(next: boolean) {
    setAllDay(next);
    if (next) {
      setStart((v) => v.slice(0, 10));
      setEnd((v) => v.slice(0, 10));
    } else {
      setStart((v) => (v && v.length === 10 ? `${v}T09:00` : v));
      setEnd((v) => (v && v.length === 10 ? `${v}T18:00` : v));
    }
  }

  const inputClass = 'px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!start) return;
        onSubmit({ type, allDay, start, end, title, notes });
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-noir/60">
          Type d&apos;événement
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {PROJECT_EVENT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-noir/60">
          Début
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-noir/60">
          Fin (optionnel)
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-noir/70 pb-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => toggleAllDay(e.target.checked)}
            className="w-4 h-4 accent-[#2C5F2D]"
          />
          Journée entière
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Titre (optionnel)"
          className={`${inputClass} flex-1 min-w-[180px]`}
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="Note interne (optionnel, jamais visible client)"
          className={`${inputClass} flex-1 min-w-[220px]`}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" isLoading={saving} disabled={!start}>{submitLabel}</Button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-noir/50 hover:text-noir/80 px-2 py-1">
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

/** Agenda complet (formulaire + listes à venir / passées) branché sur une API events */
export function AgendaPanel({ endpoint }: { endpoint: string }) {
  const toast = useToast();
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      toast.error("Erreur chargement de l'agenda");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setEvents(Array.isArray(d.events) ? d.events : []); })
      .catch(() => { if (!cancelled) toast.error("Erreur chargement de l'agenda"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function handleCreate(values: EventFormValues) {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload(values)),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Erreur lors de l'ajout");
        return;
      }
      toast.success("Date ajoutée à l'agenda");
      await refresh();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(eventId: string, values: EventFormValues) {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ...eventPayload(values) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || 'Erreur lors de la mise à jour');
        return;
      }
      toast.success('Événement mis à jour');
      setEditingId(null);
      await refresh();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event: ProjectEvent) {
    const label = PROJECT_EVENT_TYPES.find((t) => t.key === event.type)?.label || event.type;
    if (!confirm(`Supprimer « ${label} » du ${eventDateLabel(event)} ?`)) return;
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });
      if (!res.ok) {
        toast.error('Erreur lors de la suppression');
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      toast.success('Événement supprimé');
    } catch {
      toast.error('Erreur réseau');
    }
  }

  const now = Date.now();
  const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const isPast = (e: ProjectEvent) => new Date(e.endAt || e.startAt).getTime() < now && !(e.allDay && new Date(e.startAt).toDateString() === new Date().toDateString());
  const upcoming = sorted.filter((e) => !isPast(e));
  const past = sorted.filter(isPast).reverse();

  function renderEvent(event: ProjectEvent, faded: boolean) {
    const typeInfo = PROJECT_EVENT_TYPES.find((t) => t.key === event.type);
    if (editingId === event.id) {
      return (
        <li key={event.id} className="py-3">
          <EventForm
            initial={event}
            saving={saving}
            submitLabel="Enregistrer"
            onSubmit={(values) => handleUpdate(event.id, values)}
            onCancel={() => setEditingId(null)}
          />
        </li>
      );
    }
    return (
      <li key={event.id} className={`flex items-start gap-3 py-3 ${faded ? 'opacity-60' : ''}`}>
        <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: typeInfo?.color || '#999' }} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-semibold text-noir">{typeInfo?.label || event.type}</span>
            {typeInfo && !typeInfo.clientVisible && (
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded align-middle">interne</span>
            )}
          </p>
          <p className="text-sm text-noir/70">{eventDateLabel(event)}</p>
          {event.title && <p className="text-sm text-noir/70 mt-0.5">{event.title}</p>}
          {event.notes && <p className="text-xs text-noir/45 mt-0.5">🔒 {event.notes}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setEditingId(event.id)} className="text-sm text-vert-foret hover:underline">Modifier</button>
          <button onClick={() => handleDelete(event)} className="text-sm text-red-600 hover:text-red-700 hover:underline">Supprimer</button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Ajout d'une date */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-1">+ Ajouter une date</p>
        <p className="text-xs text-noir/50 mb-4">RDV client ou jour d&apos;atelier. Les jours d&apos;atelier et la note interne restent internes, jamais visibles par le client.</p>
        <div className="p-3 bg-beige/50 rounded-xl">
          <EventForm saving={saving} submitLabel="Ajouter" onSubmit={handleCreate} />
        </div>
      </div>

      {/* Liste des événements */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-noir">Dates planifiées</p>
          <Link href="/admin/agenda" className="text-sm text-vert-foret hover:underline">Voir l&apos;agenda global →</Link>
        </div>
        {loading ? (
          <p className="text-sm text-noir/40">Chargement…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-noir/45">Aucune date planifiée.</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-noir/40 mb-1">À venir</p>
                <ul className="divide-y divide-gray-100 mb-4">{upcoming.map((e) => renderEvent(e, false))}</ul>
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-noir/40 mb-1">Passées</p>
                <ul className="divide-y divide-gray-100">{past.map((e) => renderEvent(e, true))}</ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
