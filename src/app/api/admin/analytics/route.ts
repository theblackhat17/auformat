import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import {
  getActiveVisitors, getStats, getPageviews, getMetrics,
  getSessions, getEvents,
} from '@/lib/umami';

const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || '';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  if (!WEBSITE_ID) {
    return NextResponse.json({ error: 'UMAMI_WEBSITE_ID not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'today';

  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let startAt: number;
  let unit = 'day';

  switch (period) {
    case 'today':
      startAt = todayStart.getTime();
      unit = 'hour';
      break;
    case '7d':
      startAt = now - 7 * 86400000;
      break;
    case '30d':
      startAt = now - 30 * 86400000;
      break;
    case '90d':
      startAt = now - 90 * 86400000;
      unit = 'month';
      break;
    default:
      startAt = todayStart.getTime();
      unit = 'hour';
  }

  try {
    const [
      active, stats, pageviews,
      topPages, topReferrers, browsers, devices, countries,
      languages, screens, titles,
      sessions, events,
    ] = await Promise.all([
      getActiveVisitors(WEBSITE_ID),
      getStats(WEBSITE_ID, startAt, now),
      getPageviews(WEBSITE_ID, startAt, now, unit),
      getMetrics(WEBSITE_ID, startAt, now, 'path'),
      getMetrics(WEBSITE_ID, startAt, now, 'referrer'),
      getMetrics(WEBSITE_ID, startAt, now, 'browser'),
      getMetrics(WEBSITE_ID, startAt, now, 'device'),
      getMetrics(WEBSITE_ID, startAt, now, 'country'),
      getMetrics(WEBSITE_ID, startAt, now, 'language'),
      getMetrics(WEBSITE_ID, startAt, now, 'screen'),
      getMetrics(WEBSITE_ID, startAt, now, 'title'),
      getSessions(WEBSITE_ID, startAt, now),
      getEvents(WEBSITE_ID, startAt, now),
    ]);

    // Build user journeys from events grouped by session
    const journeyMap = new Map<string, typeof events.data>();
    for (const ev of events.data) {
      if (ev.eventType !== 1) continue; // only pageviews
      const list = journeyMap.get(ev.sessionId) || [];
      list.push(ev);
      journeyMap.set(ev.sessionId, list);
    }

    const journeys = sessions.data.slice(0, 20).map((s) => {
      const evts = (journeyMap.get(s.id) || [])
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return {
        id: s.id,
        browser: s.browser,
        os: s.os,
        device: s.device,
        screen: s.screen,
        country: s.country,
        city: s.city,
        language: s.language,
        firstAt: s.firstAt,
        lastAt: s.lastAt,
        views: s.views,
        pages: evts.map((e) => ({
          path: e.urlPath,
          title: e.pageTitle,
          time: e.createdAt,
          referrer: e.referrerDomain,
        })),
      };
    });

    return NextResponse.json({
      active: active.visitors,
      stats,
      pageviews,
      topPages: topPages.slice(0, 10),
      topReferrers: topReferrers.slice(0, 10),
      browsers: browsers.slice(0, 5),
      devices: devices.slice(0, 5),
      countries: countries.slice(0, 10),
      languages: languages.slice(0, 5),
      screens: screens.slice(0, 5),
      titles: titles.slice(0, 10),
      journeys,
      sessionCount: sessions.count,
    });
  } catch (err) {
    console.error('Umami API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 502 }
    );
  }
}
