import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, insert } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query('SELECT * FROM avis ORDER BY date DESC');
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Avis GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, location, clientType, rating, projectType, testimonial, verified, published, date } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const avis = await insert('avis', {
      name,
      location: location || '',
      clientType: clientType || 'Particulier',
      rating: rating || 5,
      projectType: projectType || '',
      testimonial: testimonial || '',
      verified: verified ?? false,
      published: published ?? false,
      date: date || new Date().toISOString(),
    });

    logAdminAction(request, auth, 'create_avis', 'avis', (avis as { id: string }).id, `Avis de "${name}" créé`);

    revalidatePath('/', 'layout');
    return NextResponse.json(avis, { status: 201 });
  } catch (err) {
    console.error('Avis POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
