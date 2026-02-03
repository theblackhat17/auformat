import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { queryOne, rawQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await queryOne('SELECT * FROM site_settings LIMIT 1');
    return NextResponse.json(settings || {});
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const {
      companyName, slogan, address, zipcode, city,
      phone, email, hoursWeekdays, hoursSaturday, hoursSunday,
      instagram, facebook,
    } = body;

    // Check if a row exists
    const existing = await queryOne<{ id: string }>('SELECT id FROM site_settings LIMIT 1');

    if (existing) {
      const result = await rawQuery(
        `UPDATE site_settings SET
          company_name = $1, slogan = $2, address = $3, zipcode = $4, city = $5,
          phone = $6, email = $7, hours_weekdays = $8, hours_saturday = $9, hours_sunday = $10,
          instagram = $11, facebook = $12, updated_at = NOW()
         WHERE id = $13 RETURNING *`,
        [companyName, slogan, address, zipcode, city, phone, email, hoursWeekdays, hoursSaturday, hoursSunday, instagram, facebook, existing.id]
      );
      return NextResponse.json(result.rows[0]);
    } else {
      const result = await rawQuery(
        `INSERT INTO site_settings (company_name, slogan, address, zipcode, city, phone, email, hours_weekdays, hours_saturday, hours_sunday, instagram, facebook)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [companyName, slogan, address, zipcode, city, phone, email, hoursWeekdays, hoursSaturday, hoursSunday, instagram, facebook]
      );
      return NextResponse.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Settings PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
