import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, getAuthPayload } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { getClientIp, getUserAgent } from '@/lib/middleware-auth';

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthPayload();

    if (payload) {
      const ip = getClientIp(request);
      const ua = getUserAgent(request);
      await logActivity(payload.userId, 'logout', 'auth', null, { description: 'Deconnexion' }, ip, ua);
    }

    await clearAuthCookie();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  }
}
