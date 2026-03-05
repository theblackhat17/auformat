'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';

// --- Types ---

interface UmamiStat {
  value: number;
  prev: number;
}

interface Journey {
  id: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  country: string;
  city: string | null;
  language: string;
  firstAt: string;
  lastAt: string;
  views: number;
  pages: { path: string; title: string; time: string; referrer: string | null }[];
}

interface AnalyticsData {
  active: number;
  stats: {
    pageviews: UmamiStat;
    visitors: UmamiStat;
    visits: UmamiStat;
    bounces: UmamiStat;
    totaltime: UmamiStat;
  };
  pageviews: { pageviews: { x: string; y: number }[]; sessions: { x: string; y: number }[] };
  topPages: { x: string; y: number }[];
  topReferrers: { x: string; y: number }[];
  browsers: { x: string; y: number }[];
  devices: { x: string; y: number }[];
  countries: { x: string; y: number }[];
  languages: { x: string; y: number }[];
  screens: { x: string; y: number }[];
  titles: { x: string; y: number }[];
  journeys: Journey[];
  sessionCount: number;
}

const PERIODS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
] as const;

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '\u{1F1EB}\u{1F1F7}', BE: '\u{1F1E7}\u{1F1EA}', CH: '\u{1F1E8}\u{1F1ED}',
  CA: '\u{1F1E8}\u{1F1E6}', US: '\u{1F1FA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}', ES: '\u{1F1EA}\u{1F1F8}', IT: '\u{1F1EE}\u{1F1F9}',
  NL: '\u{1F1F3}\u{1F1F1}', PT: '\u{1F1F5}\u{1F1F9}', LU: '\u{1F1F1}\u{1F1FA}',
  MA: '\u{1F1F2}\u{1F1E6}', TN: '\u{1F1F9}\u{1F1F3}', DZ: '\u{1F1E9}\u{1F1FF}',
};

const DEVICE_ICONS: Record<string, string> = {
  laptop: '\u{1F4BB}', desktop: '\u{1F5A5}\u{FE0F}', mobile: '\u{1F4F1}', tablet: '\u{1F4F1}',
};

// --- Utility ---

function fmtTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function pctChange(value: number, prev: number): { str: string; color: string } {
  if (prev === 0) return { str: value > 0 ? '+\u221E' : '\u2014', color: value > 0 ? 'text-green-600' : 'text-noir/30' };
  const change = ((value - prev) / prev) * 100;
  if (change > 0) return { str: `+${change.toFixed(0)}%`, color: 'text-green-600' };
  if (change < 0) return { str: `${change.toFixed(0)}%`, color: 'text-red-500' };
  return { str: '\u2014', color: 'text-noir/30' };
}

// --- Components ---

function StatCard({ label, value, prev, color, suffix, icon }: {
  label: string; value: number; prev: number; color: string; suffix?: string; icon: string;
}) {
  const change = pctChange(value, prev);
  return (
    <Card className={`border-l-4 ${color} relative overflow-hidden`} padding="sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-noir/40 uppercase tracking-wider font-medium">{label}</p>
          <p className="text-2xl font-bold text-noir mt-1">
            {value.toLocaleString('fr-FR')}
            {suffix && <span className="text-sm font-normal text-noir/40 ml-1">{suffix}</span>}
          </p>
          <p className={`text-xs mt-1 ${change.color} font-medium`}>{change.str}</p>
        </div>
        <span className="text-2xl opacity-20">{icon}</span>
      </div>
    </Card>
  );
}

function BarChart({ data, label, secondaryData, secondaryLabel }: {
  data: { x: string; y: number }[]; label: string;
  secondaryData?: { x: string; y: number }[]; secondaryLabel?: string;
}) {
  if (!data.length) return null;
  const allValues = [...data.map(d => d.y), ...(secondaryData || []).map(d => d.y)];
  const max = Math.max(...allValues, 1);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>{label}</CardTitle>
        {secondaryLabel && (
          <div className="flex items-center gap-4 text-xs text-noir/50">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-bois-clair inline-block" /> {label}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> {secondaryLabel}</span>
          </div>
        )}
      </div>
      <div className="flex items-end gap-[2px] h-40">
        {data.map((d, i) => {
          const s = secondaryData?.[i];
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-[1px] group relative">
              {s && (
                <div
                  className="w-full bg-blue-400/50 rounded-t transition-all min-h-[1px]"
                  style={{ height: `${(s.y / max) * 100}%` }}
                />
              )}
              <div
                className="w-full bg-bois-clair rounded-t transition-all min-h-[1px]"
                style={{ height: `${(d.y / max) * 100}%` }}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-noir text-blanc text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {d.x}: {d.y}{s ? ` / ${s.y}` : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-noir/30">
        <span>{data[0]?.x}</span>
        <span>{data[data.length - 1]?.x}</span>
      </div>
    </Card>
  );
}

function MetricsTable({ title, data, labelHeader, icon }: {
  title: string; data: { x: string; y: number }[]; labelHeader?: string; icon?: string;
}) {
  if (!data.length) return null;
  const max = data[0]?.y || 1;
  const total = data.reduce((s, d) => s + d.y, 0);

  return (
    <Card>
      <CardTitle className="mb-3">{icon && <span className="mr-1.5">{icon}</span>}{title}</CardTitle>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-noir/40 uppercase tracking-wider pb-1 border-b border-gray-100">
          <span>{labelHeader || 'Page'}</span>
          <span>Visites</span>
        </div>
        {data.map((item) => (
          <div key={item.x} className="group">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-sm text-noir truncate max-w-[70%]" title={item.x}>
                {item.x || '(direct)'}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-noir/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  {total > 0 ? `${((item.y / total) * 100).toFixed(0)}%` : ''}
                </span>
                <span className="text-sm font-medium text-noir">
                  {item.y.toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-bois-clair/60 rounded-full transition-all"
                style={{ width: `${(item.y / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function JourneyCard({ journey }: { journey: Journey }) {
  const [open, setOpen] = useState(false);
  const duration = (new Date(journey.lastAt).getTime() - new Date(journey.firstAt).getTime()) / 1000;
  const flag = COUNTRY_FLAGS[journey.country] || journey.country;
  const deviceIcon = DEVICE_ICONS[journey.device] || journey.device;
  const entryPage = journey.pages[0]?.path || '/';
  const exitPage = journey.pages[journey.pages.length - 1]?.path || '/';

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors text-left gap-2 sm:gap-0"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg" title={journey.device}>{deviceIcon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="font-medium text-noir truncate">{entryPage}</span>
              {journey.pages.length > 1 && (
                <>
                  <span className="text-noir/30">{'\u2192'}</span>
                  <span className="text-noir/60 truncate">{exitPage}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-noir/40 mt-0.5 flex-wrap">
              <span>{flag}</span>
              <span>{journey.browser}</span>
              <span className="text-noir/20">|</span>
              <span>{journey.os}</span>
              <span className="text-noir/20 hidden sm:inline">|</span>
              <span className="hidden sm:inline">{journey.screen}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 pl-8 sm:pl-0">
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-noir">{journey.views} pages</p>
            <p className="text-[10px] text-noir/40">{fmtTime(Math.round(duration))}</p>
          </div>
          <span className="text-[10px] text-noir/30">{fmtDateFull(journey.firstAt)}</span>
          <svg className={`w-4 h-4 text-noir/30 transition-transform ml-auto sm:ml-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && journey.pages.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-100">
          <div className="relative ml-4 mt-3">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-bois-clair/30" />
            {journey.pages.map((page, i) => (
              <div key={i} className="relative pl-5 pb-3 last:pb-0">
                <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full -translate-x-[3.5px] ${
                  i === 0 ? 'bg-green-500' : i === journey.pages.length - 1 ? 'bg-red-400' : 'bg-bois-clair'
                }`} />
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-noir truncate" title={page.title}>{page.path}</p>
                    <p className="text-[10px] text-noir/30 truncate">{page.title}</p>
                  </div>
                  <span className="text-[10px] text-noir/30 flex-shrink-0">{fmtDate(page.time)}</span>
                </div>
                {i === 0 && page.referrer && (
                  <p className="text-[10px] text-blue-500 mt-0.5">via {page.referrer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export function AdminAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<string>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
    const interval = setInterval(() => fetchData(period), 30000);
    return () => clearInterval(interval);
  }, [period, fetchData]);

  const bounceRate = data && data.stats.visits.value > 0
    ? Math.round((data.stats.bounces.value / data.stats.visits.value) * 100)
    : 0;
  const prevBounceRate = data && data.stats.visits.prev > 0
    ? Math.round((data.stats.bounces.prev / data.stats.visits.prev) * 100)
    : 0;
  const avgTime = data && data.stats.visits.value > 0
    ? Math.round(data.stats.totaltime.value / data.stats.visits.value)
    : 0;
  const prevAvgTime = data && data.stats.visits.prev > 0
    ? Math.round(data.stats.totaltime.prev / data.stats.visits.prev)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-noir">Analytics</h1>
          <p className="text-sm text-noir/50 mt-1">
            Suivi des visiteurs en temps reel
            {data && (
              <span className="inline-flex items-center ml-3 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                {data.active} en ligne
              </span>
            )}
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                period === p.value
                  ? 'bg-white text-noir font-medium shadow-sm'
                  : 'text-noir/50 hover:text-noir'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
          <p className="text-xs text-red-400 mt-1">
            Verifiez que Umami est en cours d&apos;execution et que les variables d&apos;environnement sont configurees.
          </p>
        </Card>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-l-gray-200 animate-pulse" padding="sm">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-7 bg-gray-200 rounded w-12" />
            </Card>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Visiteurs" value={data.stats.visitors.value} prev={data.stats.visitors.prev} color="border-l-blue-500" icon={'\u{1F465}'} />
            <StatCard label="Pages vues" value={data.stats.pageviews.value} prev={data.stats.pageviews.prev} color="border-l-green-500" icon={'\u{1F4C4}'} />
            <StatCard label="Sessions" value={data.stats.visits.value} prev={data.stats.visits.prev} color="border-l-purple-500" icon={'\u{1F4CA}'} />
            <StatCard label="Taux de rebond" value={bounceRate} prev={prevBounceRate} color="border-l-amber-500" suffix="%" icon={'\u{21A9}\u{FE0F}'} />
            <StatCard label="Temps moyen" value={avgTime} prev={prevAvgTime} color="border-l-bois-clair" suffix="s" icon={'\u{23F1}\u{FE0F}'} />
          </div>

          {/* Chart */}
          <BarChart
            data={data.pageviews.pageviews}
            label="Pages vues"
            secondaryData={data.pageviews.sessions}
            secondaryLabel="Sessions"
          />

          {/* Pages & Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricsTable title="Pages les plus visitees" data={data.topPages} icon={'\u{1F4C4}'} />
            <MetricsTable title="Sources de trafic" data={data.topReferrers} labelHeader="Source" icon={'\u{1F517}'} />
          </div>

          {/* Titles */}
          {data.titles.length > 0 && (
            <MetricsTable title="Titres de pages" data={data.titles} labelHeader="Titre" icon={'\u{1F3F7}\u{FE0F}'} />
          )}

          {/* Tech & Geo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsTable title="Navigateurs" data={data.browsers} labelHeader="Navigateur" icon={'\u{1F310}'} />
            <MetricsTable title="Appareils" data={data.devices} labelHeader="Type" icon={'\u{1F4BB}'} />
            <MetricsTable title="Langues" data={data.languages} labelHeader="Langue" icon={'\u{1F30D}'} />
            <MetricsTable title="Ecrans" data={data.screens} labelHeader="Resolution" icon={'\u{1F5A5}\u{FE0F}'} />
          </div>

          {/* Countries */}
          {data.countries.length > 0 && (
            <Card>
              <CardTitle className="mb-3">{'\u{1F30D}'} Pays</CardTitle>
              <div className="flex flex-wrap gap-2">
                {data.countries.map((c) => (
                  <div key={c.x} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                    <span>{COUNTRY_FLAGS[c.x] || c.x}</span>
                    <span className="text-sm text-noir">{c.x}</span>
                    <span className="text-xs font-medium text-noir/60">{c.y}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* User Journeys */}
          {data.journeys.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>{'\u{1F6A6}'} Parcours utilisateurs</CardTitle>
                <span className="text-xs text-noir/40">{data.sessionCount} sessions au total</span>
              </div>
              <div className="space-y-2">
                {data.journeys.map((j) => (
                  <JourneyCard key={j.id} journey={j} />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
