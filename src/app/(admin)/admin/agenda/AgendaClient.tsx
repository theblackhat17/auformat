'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PROJECT_EVENT_TYPES } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import type { AgendaEvent } from '@/app/api/admin/agenda/route';

/** Événement lu depuis Google Agenda (sens Google → site), non rattaché à un projet */
type GoogleEvt = { id: string; summary: string; startAt: string; endAt: string | null; allDay: boolean; htmlLink: string | null };
/** Élément d'une case : une date de projet (site) ou un événement Google */
type CellItem = { kind: 'site'; ev: AgendaEvent } | { kind: 'google'; ev: GoogleEvt };

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
/** Nombre max de pastilles affichées par case avant le « +N » */
const MAX_CHIPS = 4;
/** Rafraîchissement auto de l'agenda (ms) — quasi-instantané, sans recharger la page */
const REFRESH_MS = 15000;

/** Clé locale « YYYY-MM-DD » d'une date (fuseau du navigateur) */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function typeInfo(key: string) {
  return PROJECT_EVENT_TYPES.find((t) => t.key === key);
}

/** Fiche à ouvrir : le dossier si l'événement y est rattaché, sinon le projet */
function eventHref(event: AgendaEvent): string {
  return event.folderId ? `/admin/dossiers/${event.folderId}` : `/admin/projets/${event.projectId}`;
}

interface GoogleStatus {
  connected: boolean;
  email: string | null;
  calendarId: string | null;
}
type GoogleCal = { id: string; summary: string; primary: boolean };

/** Carte de connexion Google Agenda : statut, connexion OAuth et déconnexion */
function GoogleCalendarCard() {
  const toast = useToast();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCal[]>([]);
  const [savingCal, setSavingCal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshStatus = () => {
    fetch('/api/admin/google/status')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setStatus({ connected: !!d.connected, email: d.email || null, calendarId: d.calendarId || null }))
      .catch(() => setStatus({ connected: false, email: null, calendarId: null }));
  };

  useEffect(() => {
    refreshStatus();
    // Retour du flux OAuth : ?google=connected|error
    const params = new URLSearchParams(window.location.search);
    const result = params.get('google');
    if (result === 'connected') toast.success('Google Agenda connecté');
    else if (result === 'error') toast.error('Échec de la connexion à Google Agenda');
    if (result) {
      params.delete('google');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charge la liste des agendas du compte dès qu'on est connecté (pour choisir « AU FORMAT »)
  useEffect(() => {
    if (!status?.connected) { setCalendars([]); return; }
    fetch('/api/admin/google/calendars')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCalendars(Array.isArray(d.calendars) ? d.calendars : []))
      .catch(() => setCalendars([]));
  }, [status?.connected]);

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/admin/google/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Google Agenda déconnecté');
      refreshStatus();
    } catch {
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setDisconnecting(false);
    }
  };

  const chooseCalendar = async (calendarId: string) => {
    setSavingCal(true);
    try {
      const res = await fetch('/api/admin/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setStatus((s) => (s ? { ...s, calendarId: d.calendarId || calendarId } : s));
      toast.success('Agenda cible mis à jour');
    } catch {
      toast.error('Erreur lors du choix de l’agenda');
    } finally {
      setSavingCal(false);
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/google/sync-all', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error();
      toast.success(`${d.synced}/${d.total} date(s) synchronisée(s) vers Google`);
    } catch {
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-noir">Google Agenda</p>
          {status === null ? (
            <p className="text-xs text-noir/45 mt-0.5">Vérification de la connexion…</p>
          ) : status.connected ? (
            <p className="text-xs text-green-700 mt-0.5">
              Connecté{status.email ? ` · ${status.email}` : ''}
            </p>
          ) : (
            <p className="text-xs text-noir/50 mt-0.5">
              Synchronisez automatiquement les RDV et jours d&apos;atelier vers votre agenda Google.
            </p>
          )}
        </div>
        {status?.connected ? (
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="px-3 py-1.5 border border-noir/20 text-noir/70 text-sm rounded-lg hover:border-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {disconnecting ? 'Déconnexion…' : 'Déconnecter'}
          </button>
        ) : status ? (
          <a
            href="/api/admin/google/connect"
            className="px-3 py-1.5 bg-vert-foret text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
          >
            Connecter Google Agenda
          </a>
        ) : null}
      </div>

      {/* Choix de l'agenda cible + rattrapage des dates existantes */}
      {status?.connected && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
          <label className="text-xs text-noir/60 flex items-center gap-2">
            Agenda cible
            <select
              value={status.calendarId || 'primary'}
              onChange={(e) => chooseCalendar(e.target.value)}
              disabled={savingCal || calendars.length === 0}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-noir bg-white focus:outline-none focus:border-vert-foret disabled:opacity-60"
            >
              {/* Repli : garantit que la cible réellement enregistrée est toujours affichée,
                  même si la liste n'est pas encore chargée ou vaut « primary » */}
              {status.calendarId && !calendars.some((c) => c.id === status.calendarId) && (
                <option value={status.calendarId}>
                  {status.calendarId === 'primary' ? 'Agenda principal' : status.calendarId}
                </option>
              )}
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>{c.summary}{c.primary ? ' (principal)' : ''}</option>
              ))}
            </select>
          </label>
          <button
            onClick={syncAll}
            disabled={syncing}
            className="px-3 py-1.5 border border-vert-foret text-vert-foret text-sm rounded-lg hover:bg-vert-foret hover:text-white transition-colors disabled:opacity-50"
          >
            {syncing ? 'Synchronisation…' : 'Synchroniser tous les projets'}
          </button>
          <span className="text-xs text-noir/40">Pousse toutes les dates déjà créées vers l&apos;agenda choisi.</span>
        </div>
      )}
    </div>
  );
}

/** Agenda global de l'atelier : calendrier mensuel de tous les RDV et jours d'atelier */
export function AgendaClient() {
  const toast = useToast();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleEvt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayDetail, setDayDetail] = useState<{ date: Date; items: CellItem[] } | null>(null);

  /** Jours visibles : grille complète de semaines Lun→Dim couvrant le mois */
  const gridDays = useMemo(() => {
    const offset = (month.getDay() + 6) % 7; // Lundi = 0
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const rows = Math.ceil((offset + daysInMonth) / 7);
    const days: Date[] = [];
    for (let i = 0; i < rows * 7; i++) {
      days.push(new Date(month.getFullYear(), month.getMonth(), 1 - offset + i));
    }
    return days;
  }, [month]);

  /** Charge les dates du site ET les événements Google de la plage visible.
   *  `silent` = rafraîchissement automatique (pas d'indicateur de chargement). */
  const load = useCallback(async (silent: boolean) => {
    const first = gridDays[0];
    const last = gridDays[gridDays.length - 1];
    const from = new Date(first.getFullYear(), first.getMonth(), first.getDate()).toISOString();
    const to = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59).toISOString();
    if (!silent) setLoading(true);
    // Sens retour Google → site : retire du site les RDV supprimés depuis l'app
    // Google Agenda, avant de lire les événements (no-op serveur > 1×/minute)
    try { await fetch('/api/admin/google/reconcile', { method: 'POST' }); } catch { /* best effort */ }
    const q = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const [site, gg] = await Promise.allSettled([
      fetch(`/api/admin/agenda?${q}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/admin/google/events?${q}`).then((r) => (r.ok ? r.json() : Promise.reject())),
    ]);
    if (site.status === 'fulfilled') setEvents(Array.isArray(site.value.events) ? site.value.events : []);
    else if (!silent) toast.error("Erreur chargement de l'agenda");
    if (gg.status === 'fulfilled') setGoogleEvents(Array.isArray(gg.value.events) ? gg.value.events : []);
    if (!silent) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridDays]);

  // Chargement au changement de mois
  useEffect(() => { load(false); }, [load]);

  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  /** Supprime un RDV du site (projet ou dossier) depuis le détail d'une journée — retiré aussi de Google */
  async function handleDeleteEvent(event: AgendaEvent) {
    if (!confirm('Supprimer ce rendez-vous ? Il sera aussi retiré de Google Agenda.')) return;
    setDeletingEventId(event.id);
    try {
      const url = event.folderId
        ? `/api/admin/folders/${event.folderId}/events`
        : `/api/admin/projects/${event.projectId}/events`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });
      if (!res.ok) throw new Error();
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setDayDetail((prev) => {
        if (!prev) return prev;
        const items = prev.items.filter((it) => it.kind !== 'site' || it.ev.id !== event.id);
        return items.length > 0 ? { ...prev, items } : null;
      });
      toast.success('Rendez-vous supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingEventId(null);
    }
  }

  // Rafraîchissement automatique en continu (et au retour sur l'onglet) — sans recharger la page
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') load(true); };
    const iv = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', tick); };
  }, [load]);

  /** Éléments (site + Google) indexés par jour ; multi-jours = présent sur chaque jour couvert.
   *  Les événements Google déjà poussés depuis le site (même google_event_id) ne sont pas doublonnés. */
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CellItem[]>();
    const span = (startAt: string, endAt: string | null, item: CellItem) => {
      const start = new Date(startAt);
      const end = endAt ? new Date(endAt) : start;
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      for (let i = 0; i < 62 && cursor <= lastDay; i++) {
        const k = dayKey(cursor);
        const list = map.get(k) || [];
        list.push(item);
        map.set(k, list);
        cursor.setDate(cursor.getDate() + 1);
      }
    };
    for (const ev of events) span(ev.startAt, ev.endAt, { kind: 'site', ev });
    const sitePushed = new Set(events.map((e) => e.googleEventId).filter(Boolean));
    for (const ev of googleEvents) {
      if (ev.id && sitePushed.has(ev.id)) continue; // déjà représenté par la date du projet
      span(ev.startAt, ev.endAt, { kind: 'google', ev });
    }
    return map;
  }, [events, googleEvents]);

  const todayKey = dayKey(new Date());
  const monthLabel = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const upcoming = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return events
      .filter((e) => new Date(e.endAt || e.startAt).getTime() >= startOfToday.getTime())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 8);
  }, [events]);

  const navBtn = 'px-3 py-1.5 border border-noir/20 text-noir/70 text-sm rounded-lg hover:border-vert-foret hover:text-vert-foret transition-colors';

  return (
    <>
      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-noir">Agenda</h1>
          <p className="text-sm text-noir/50 mt-1">
            RDV clients et jours d&apos;atelier de tous les projets — cliquez sur un événement pour ouvrir la fiche projet.
          </p>
        </div>
        <Link href="/admin/projets" className={navBtn}>← Suivi des projets</Link>
      </div>

      {/* Connexion Google Agenda */}
      <GoogleCalendarCard />

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        {/* Navigation du mois */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="text-lg font-semibold text-noir capitalize" aria-live="polite">{monthLabel}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className={navBtn}
              aria-label="Mois précédent"
            >
              ← Précédent
            </button>
            <button
              onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }}
              className={navBtn}
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className={navBtn}
              aria-label="Mois suivant"
            >
              Suivant →
            </button>
          </div>
        </div>

        {/* Grille du mois */}
        <div className={`grid grid-cols-7 border-l border-t border-gray-200 rounded-lg overflow-hidden ${loading ? 'opacity-60' : ''}`}>
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-1 py-1.5 text-center text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-noir/40 bg-gray-50 border-r border-b border-gray-200">
              {d}
            </div>
          ))}
          {gridDays.map((day) => {
            const key = dayKey(day);
            const inMonth = day.getMonth() === month.getMonth();
            const isToday = key === todayKey;
            const dayItems = itemsByDay.get(key) || [];
            return (
              <div
                key={key}
                className={`min-h-[76px] sm:min-h-[108px] p-1 sm:p-1.5 border-r border-b border-gray-200 ${inMonth ? 'bg-white' : 'bg-gray-50/60'}`}
              >
                <button
                  type="button"
                  onClick={() => dayItems.length > 0 && setDayDetail({ date: new Date(day), items: dayItems })}
                  disabled={dayItems.length === 0}
                  title={dayItems.length > 0 ? `Voir les ${dayItems.length} événement(s) du jour` : undefined}
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-0.5 transition-colors ${
                    isToday ? 'bg-vert-foret text-white font-semibold' : inMonth ? 'text-noir/70' : 'text-noir/30'
                  } ${dayItems.length > 0 ? 'hover:ring-2 hover:ring-vert-foret/40 cursor-pointer' : 'cursor-default'}`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {day.getDate()}
                </button>
                <div className="space-y-0.5">
                  {dayItems.slice(0, MAX_CHIPS).map((item, idx) => {
                    if (item.kind === 'site') {
                      const event = item.ev;
                      const info = typeInfo(event.type);
                      const color = info?.color || '#666';
                      const time = event.allDay
                        ? ''
                        : `${new Date(event.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · `;
                      return (
                        <Link
                          key={`s-${event.id}-${key}`}
                          href={eventHref(event)}
                          title={`${info?.label || event.type} — ${event.projectName}${event.clientName ? ` (${event.clientName})` : ''}`}
                          className="block truncate rounded px-1 py-0.5 text-[10px] sm:text-[11px] font-medium leading-tight hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${color}1a`, color }}
                        >
                          <span className="hidden md:inline">{time}</span>
                          {event.projectName}
                        </Link>
                      );
                    }
                    // Événement Google (non lié à un projet) — style neutre, ouvre Google
                    const g = item.ev;
                    const time = g.allDay ? '' : `${new Date(g.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · `;
                    return (
                      <a
                        key={`g-${g.id}-${key}-${idx}`}
                        href={g.htmlLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${g.summary} · Google Agenda`}
                        className="block truncate rounded px-1 py-0.5 text-[10px] sm:text-[11px] font-medium leading-tight bg-gray-100 text-noir/60 border-l-2 border-gray-400 hover:bg-gray-200 transition-colors"
                      >
                        <span className="hidden md:inline">{time}</span>
                        {g.summary}
                      </a>
                    );
                  })}
                  {dayItems.length > MAX_CHIPS && (
                    <button
                      type="button"
                      onClick={() => setDayDetail({ date: new Date(day), items: dayItems })}
                      className="block w-full text-left text-[10px] font-medium text-vert-foret/80 hover:text-vert-foret px-1 py-0.5 rounded hover:bg-vert-foret/5 transition-colors"
                    >
                      +{dayItems.length - MAX_CHIPS} autre{dayItems.length - MAX_CHIPS > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Légende des types */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4">
          {PROJECT_EVENT_TYPES.map((t) => (
            <span key={t.key} className="inline-flex items-center gap-1.5 text-xs text-noir/60">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} aria-hidden="true" />
              {t.label}
              {!t.clientVisible && <span className="text-noir/35">(interne)</span>}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-xs text-noir/60">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-gray-300 border-l-2 border-gray-400" aria-hidden="true" />
            Google Agenda
          </span>
        </div>
      </div>

      {/* Vue liste : prochains événements du mois affiché */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 mt-4">
        <p className="text-sm font-semibold text-noir mb-3">Prochains événements</p>
        {loading ? (
          <p className="text-sm text-noir/40">Chargement…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-noir/45">Aucun événement à venir sur la période affichée.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((event) => {
              const info = typeInfo(event.type);
              const start = new Date(event.startAt);
              const dateLabel = event.allDay
                ? start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                : `${start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
              return (
                <li key={event.id}>
                  <Link href={eventHref(event)} className="flex items-center gap-3 py-2.5 group">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info?.color || '#666' }} aria-hidden="true" />
                    <span className="text-sm text-noir/70 w-52 shrink-0 capitalize hidden sm:block">{dateLabel}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-noir truncate group-hover:text-vert-foret transition-colors">
                        {info?.label || event.type}{event.title ? ` — ${event.title}` : ''}
                      </span>
                      <span className="block text-xs text-noir/45 truncate">
                        <span className="sm:hidden capitalize">{dateLabel} · </span>
                        {event.projectName}{event.clientName ? ` · ${event.clientName}` : ''}
                      </span>
                    </span>
                    <span className="text-noir/25 group-hover:text-vert-foret transition-colors" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Détail d'une journée : tous les événements, sans limite */}
      {dayDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-noir/40 p-0 sm:p-4"
          onClick={() => setDayDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <p className="font-semibold text-noir capitalize">
                {dayDetail.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="text-noir/40 font-normal ml-2 text-sm">{dayDetail.items.length} événement{dayDetail.items.length > 1 ? 's' : ''}</span>
              </p>
              <button
                type="button"
                onClick={() => setDayDetail(null)}
                className="text-noir/40 hover:text-noir w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <ul className="overflow-y-auto divide-y divide-gray-100 px-2 py-1">
              {dayDetail.items.map((item, idx) => {
                if (item.kind === 'site') {
                  const event = item.ev;
                  const info = typeInfo(event.type);
                  const color = info?.color || '#666';
                  const time = event.allDay
                    ? 'Journée'
                    : new Date(event.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <li key={`d-s-${event.id}-${idx}`} className="flex items-center gap-1">
                      <Link
                        href={eventHref(event)}
                        onClick={() => setDayDetail(null)}
                        className="flex flex-1 min-w-0 items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
                        <span className="text-sm text-noir/60 w-16 shrink-0 tabular-nums">{time}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-noir truncate group-hover:text-vert-foret transition-colors">
                            {info?.label || event.type}{event.title ? ` — ${event.title}` : ''}
                          </span>
                          <span className="block text-xs text-noir/45 truncate">
                            {event.projectName}{event.clientName ? ` · ${event.clientName}` : ''}
                          </span>
                        </span>
                        <span className="text-noir/25 group-hover:text-vert-foret transition-colors" aria-hidden="true">→</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event)}
                        disabled={deletingEventId !== null}
                        className="shrink-0 px-2 py-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-50 mr-1"
                      >
                        {deletingEventId === event.id ? 'Suppression…' : 'Supprimer'}
                      </button>
                    </li>
                  );
                }
                const g = item.ev;
                const time = g.allDay ? 'Journée' : new Date(g.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <li key={`d-g-${g.id}-${idx}`}>
                    <a
                      href={g.htmlLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-gray-300 border-l-2 border-gray-400" aria-hidden="true" />
                      <span className="text-sm text-noir/60 w-16 shrink-0 tabular-nums">{time}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-noir/80 truncate">{g.summary}</span>
                        <span className="block text-xs text-noir/40">Google Agenda</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
