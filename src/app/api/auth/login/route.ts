import { NextRequest, NextResponse } from 'next/server';
import { rawQuery, toCamelCase } from '@/lib/db';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';
import { logActivity, logSession } from '@/lib/activity-logger';
import { getClientIp, getUserAgent } from '@/lib/middleware-auth';
import type { Profile } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // Use rawQuery to keep snake_case keys (avoid toCamelCase on password_hash)
    const result = await rawQuery(
      'SELECT * FROM profiles WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const token = signToken({ userId: user.id, role: user.role });
    await setAuthCookie(token);

    const ip = getClientIp(request);
    const ua = getUserAgent(request);

    await logActivity(user.id, 'login', 'auth', null, { description: 'Connexion reussie' }, ip, ua);
    await logSession(user.id, ip, ua);

    // Return profile without password_hash
    const { password_hash: _, ...safeUser } = user;
    const profile = toCamelCase<Profile>(safeUser);

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
