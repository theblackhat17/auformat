import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { queryOne, rawQuery } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

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
      instagram, facebook, heroBackground, configurateurEnabled,
      colorBoisClair, colorBoisFonce, colorVertForet, colorVertForetDark,
      colorBeige, colorNoir, colorBlanc, fontTheme, googleReviewUrl,
    } = body;

    if (fontTheme !== undefined && !['moderne', 'classique'].includes(fontTheme)) {
      return NextResponse.json({ error: 'Thème typographique invalide' }, { status: 400 });
    }

    const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
    const colorFields = { colorBoisClair, colorBoisFonce, colorVertForet, colorVertForetDark, colorBeige, colorNoir, colorBlanc };
    for (const [k, v] of Object.entries(colorFields)) {
      if (v !== undefined && (typeof v !== 'string' || !HEX.test(v))) {
        return NextResponse.json({ error: `Couleur invalide: ${k}` }, { status: 400 });
      }
    }

    // Check if a row exists
    const existing = await queryOne<{ id: string }>('SELECT id FROM site_settings LIMIT 1');

    if (existing) {
      const result = await rawQuery(
        `UPDATE site_settings SET
          company_name = $1, slogan = $2, address = $3, zipcode = $4, city = $5,
          phone = $6, email = $7, hours_weekdays = $8, hours_saturday = $9, hours_sunday = $10,
          instagram = $11, facebook = $12, hero_background = $13, configurateur_enabled = $14,
          color_bois_clair = COALESCE($15, color_bois_clair),
          color_bois_fonce = COALESCE($16, color_bois_fonce),
          color_vert_foret = COALESCE($17, color_vert_foret),
          color_vert_foret_dark = COALESCE($18, color_vert_foret_dark),
          color_beige = COALESCE($19, color_beige),
          color_noir = COALESCE($20, color_noir),
          color_blanc = COALESCE($21, color_blanc),
          font_theme = COALESCE($22, font_theme),
          google_review_url = $23,
          updated_at = NOW()
         WHERE id = $24 RETURNING *`,
        [companyName, slogan, address, zipcode, city, phone, email, hoursWeekdays, hoursSaturday, hoursSunday, instagram, facebook, heroBackground || null, configurateurEnabled ?? false,
         colorBoisClair, colorBoisFonce, colorVertForet, colorVertForetDark, colorBeige, colorNoir, colorBlanc, fontTheme, googleReviewUrl || null, existing.id]
      );
      logAdminAction(request, auth, 'update_settings', 'settings', null, `Paramètres du site modifiés`);
      revalidatePath('/', 'layout');
      return NextResponse.json(result.rows[0]);
    } else {
      const result = await rawQuery(
        `INSERT INTO site_settings (company_name, slogan, address, zipcode, city, phone, email, hours_weekdays, hours_saturday, hours_sunday, instagram, facebook, hero_background, configurateur_enabled,
          color_bois_clair, color_bois_fonce, color_vert_foret, color_vert_foret_dark, color_beige, color_noir, color_blanc, font_theme, google_review_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          COALESCE($15, '#D4A574'), COALESCE($16, '#8B6F47'), COALESCE($17, '#2C5F2D'), COALESCE($18, '#234a24'),
          COALESCE($19, '#F5F1E8'), COALESCE($20, '#2B2B2B'), COALESCE($21, '#FFFFFF'), COALESCE($22, 'moderne'), $23)
         RETURNING *`,
        [companyName, slogan, address, zipcode, city, phone, email, hoursWeekdays, hoursSaturday, hoursSunday, instagram, facebook, heroBackground || null, configurateurEnabled ?? false,
         colorBoisClair, colorBoisFonce, colorVertForet, colorVertForetDark, colorBeige, colorNoir, colorBlanc, fontTheme, googleReviewUrl || null]
      );
      logAdminAction(request, auth, 'update_settings', 'settings', null, `Paramètres du site modifiés`);
      revalidatePath('/', 'layout');
      return NextResponse.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Settings PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
