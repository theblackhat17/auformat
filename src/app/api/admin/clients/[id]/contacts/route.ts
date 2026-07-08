import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import type { ClientContact } from '@/lib/types';

/**
 * Contacts supplémentaires d'un client (conjoint, architecte, assistant…).
 * Chaque e-mail envoyé au client (suivi, devis, messagerie, relances) part
 * aussi vers ces adresses.
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const contacts = await query<ClientContact>(
      'SELECT id, user_id, name, email, phone, created_at FROM client_contacts WHERE user_id = $1 ORDER BY created_at',
      [id]
    );
    return NextResponse.json({ contacts });
  } catch (err) {
    console.error('List client contacts error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const client = await queryOne<{ id: string; email: string }>('SELECT id, email FROM profiles WHERE id = $1', [id]);
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });

    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'E-mail invalide' }, { status: 400 });
    }
    if (email === client.email.toLowerCase()) {
      return NextResponse.json({ error: 'Cette adresse est déjà celle du client' }, { status: 400 });
    }
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : null;
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim().slice(0, 40) : null;

    const inserted = await rawQuery(
      `INSERT INTO client_contacts (user_id, name, email, phone) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
       RETURNING *`,
      [id, name, email, phone]
    );

    logAdminAction(request, auth, 'add_client_contact', 'client', id, `Contact ajouté : ${email}`);
    return NextResponse.json({ contact: toCamelCase<ClientContact>(inserted.rows[0]) }, { status: 201 });
  } catch (err) {
    console.error('Add client contact error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const { contactId } = await request.json();
    if (!contactId) return NextResponse.json({ error: 'contactId requis' }, { status: 400 });

    const result = await rawQuery('DELETE FROM client_contacts WHERE id = $1 AND user_id = $2 RETURNING email', [contactId, id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Contact introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'delete_client_contact', 'client', id, `Contact supprimé : ${result.rows[0].email}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete client contact error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
