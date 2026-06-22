import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';

const INDEXNOW_KEY = '194ce9818f582edabd882a7c371b8369';
const SITE_URL = 'https://auformat.com';

export async function POST(request: NextRequest) {
  // Soumission IndexNow réservée à l'admin : sinon n'importe qui peut spammer
  // les moteurs avec nos quotas
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { urls } = await request.json() as { urls?: string[] };
  if (!urls || urls.length === 0) {
    return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
  }

  const body = {
    host: 'auformat.com',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls.map((u) => u.startsWith('http') ? u : `${SITE_URL}${u}`),
  };

  const result = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return NextResponse.json({
    success: result.ok,
    status: result.status,
    submitted: body.urlList.length,
  });
}

export async function GET() {
  return NextResponse.json({ key: INDEXNOW_KEY });
}
