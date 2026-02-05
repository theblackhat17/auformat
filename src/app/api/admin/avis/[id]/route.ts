import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { update, deleteById } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, location, clientType, rating, projectType, testimonial, verified, published, date } = body;

    const avis = await update('avis', id, {
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

    if (!avis) {
      return NextResponse.json({ error: 'Avis introuvable' }, { status: 404 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(avis);
  } catch (err) {
    console.error('Avis PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const deleted = await deleteById('avis', id);

    if (!deleted) {
      return NextResponse.json({ error: 'Avis introuvable' }, { status: 404 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Avis DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
