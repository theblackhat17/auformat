import { NextRequest, NextResponse } from 'next/server';
import { queryOne, update } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { getClientIp, getUserAgent } from '@/lib/middleware-auth';
import type { Profile } from '@/lib/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // Users can only see their own profile, admins can see any
  if (auth.role !== 'admin' && auth.userId !== id) {
    return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
  }

  try {
    const profile = await queryOne<Profile>(
      `SELECT id, email, full_name, company_name, phone, address, role,
              avatar_url, discount_rate, created_at, updated_at
       FROM profiles WHERE id = $1`,
      [id]
    );

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (auth.role !== 'admin' && auth.userId !== id) {
    return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Filter allowed fields
    const allowed: Record<string, unknown> = {};
    const allowedFields = ['fullName', 'companyName', 'phone', 'address'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) allowed[field] = body[field];
    }
    // Admin-only fields
    if (auth.role === 'admin') {
      if (body.discountRate !== undefined) allowed.discountRate = body.discountRate;
      if (body.role !== undefined) allowed.role = body.role;
    }

    const profile = await update<Profile>('profiles', id, allowed);

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const ip = getClientIp(request);
    const ua = getUserAgent(request);
    await logActivity(auth.userId, 'update_profile', 'user', id, { description: 'Profil mis a jour' }, ip, ua);

    return NextResponse.json(profile);
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
