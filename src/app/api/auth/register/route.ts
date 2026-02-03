import { NextRequest, NextResponse } from 'next/server';
import { queryOne, insert } from '@/lib/db';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { logActivity, logSession } from '@/lib/activity-logger';
import { getClientIp, getUserAgent } from '@/lib/middleware-auth';
import type { Profile } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, companyName, phone } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caracteres' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe deja avec cet email' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const profile = await insert<Profile>('profiles', {
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName: fullName || null,
      companyName: companyName || null,
      phone: phone || null,
      role: 'client',
      discountRate: 0,
    });

    const token = signToken({ userId: profile.id, role: 'client' });
    await setAuthCookie(token);

    const ip = getClientIp(request);
    const ua = getUserAgent(request);

    await logActivity(profile.id, 'register', 'auth', profile.id, { description: 'Inscription reussie' }, ip, ua);
    await logSession(profile.id, ip, ua);

    const { passwordHash: _, ...safeProfile } = profile as Profile & { passwordHash?: string };
    return NextResponse.json({ success: true, profile: safeProfile });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
