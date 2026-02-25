import { NextResponse } from 'next/server';
import { getGeneralSettings, getHomepageSettings, getSettings } from '@/lib/content';

export async function GET() {
  try {
    const [general, homepage, siteSettings] = await Promise.all([
      getGeneralSettings(),
      getHomepageSettings(),
      getSettings(),
    ]);
    return NextResponse.json({
      general: { ...general, configurateurEnabled: siteSettings?.configurateurEnabled ?? false },
      homepage,
    });
  } catch (err) {
    console.error('Content settings error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
