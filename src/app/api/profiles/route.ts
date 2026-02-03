import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import type { Profile } from '@/lib/types';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const profiles = await query<Profile>(
      `SELECT id, email, full_name, company_name, phone, address, role,
              avatar_url, discount_rate, created_at, updated_at
       FROM profiles WHERE role = 'client' ORDER BY created_at DESC`
    );
    return NextResponse.json(profiles);
  } catch (err) {
    console.error('List profiles error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
