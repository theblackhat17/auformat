'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PROJECT_EVENT_TYPES } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import type { AgendaEvent } from '@/app/api/admin/agenda/route';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
/** Nombre max de pastilles affichées par case avant le « +N » */
const MAX_CHIPS = 3;

/** Clé locale « YYYY-MM-DD » d'une date (fuseau du navigateur) */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function typeInfo(key: string) {
  return PROJECT_EVENT_TYPES.find((t) => t.key === key);
}

interface GoogleStatus {
  connected: boolean;
  email: string | null;
}

/** Carte de connexion Google Agenda : statut, connexion OAuth et déconnexion */
function GoogleCalendarCard() {
  const toast = useToast();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const refreshStatus = () => {
    fetch('/api/admin/google/status')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setStatus({ connected: !!d.connected, email: d.email || null }))
      .catch(() => setStatus({ connected: false, email: null }));
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
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
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const first = gridDays[0];
    const last = gridDays[gridDays.length - 1];
    const from = new Date(first.getFullYear(), first.getMonth(), first.getDate()).toISOString();
    const to = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59).toISOString();
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/agenda?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setEvents(Array.isArray(d.events) ? d.events : []); })
      .catch(() => { if (!cancelled) toast.error("Erreur chargement de l'agenda"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridDays]);

  /** Événements indexés par jour local ; un événement multi-jours apparaît chaque jour couvert */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of events) {
      const start = new Date(event.startAt);
      const end = event.endAt ? new Date(event.endAt) : start;
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      // Garde-fou : on ne balaie jamais plus de 62 jours par événement
      for (let i = 0; i < 62 && cursor <= lastDay; i++) {
        const key = dayKey(cursor);
        const list = map.get(key) || [];
        list.push(event);
        map.set(key, list);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [events]);

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
            const dayEvents = eventsByDay.get(key) || [];
            return (
              <div
                key={key}
                className={`min-h-[76px] sm:min-h-[108px] p-1 sm:p-1.5 border-r border-b border-gray-200 ${inMonth ? 'bg-white' : 'bg-gray-50/60'}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-0.5 ${
                    isToday ? 'bg-vert-foret text-white font-semibold' : inMonth ? 'text-noir/70' : 'text-noir/30'
                  }`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {day.getDate()}
                </span>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, MAX_CHIPS).map((event) => {
                    const info = typeInfo(event.type);
                    const color = info?.color || '#666';
                    const time = event.allDay
                      ? ''
                      : `${new Date(event.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · `;
                    return (
                      <Link
                        key={`${event.id}-${key}`}
                        href={`/admin/projets/${event.projectId}`}
                        title={`${info?.label || event.type} — ${event.projectName}${event.clientName ? ` (${event.clientName})` : ''}`}
                        className="block truncate rounded px-1 py-0.5 text-[10px] sm:text-[11px] font-medium leading-tight hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: `${color}1a`, color }}
                      >
                        <span className="hidden md:inline">{time}</span>
                        {event.projectName}
                      </Link>
                    );
                  })}
                  {dayEvents.length > MAX_CHIPS && (
                    <p className="text-[10px] text-noir/45 px-1">+{dayEvents.length - MAX_CHIPS}</p>
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
                  <Link href={`/admin/projets/${event.projectId}`} className="flex items-center gap-3 py-2.5 group">
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
    </>
  );
}
