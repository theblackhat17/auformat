import { NextResponse } from 'next/server';
import { getGeneralSettings, getHomepageSettings } from '@/lib/content';

export async function GET() {
  try {
    const [general, homepage] = await Promise.all([
      getGeneralSettings(),
      getHomepageSettings(),
    ]);
    return NextResponse.json({ general, homepage });
  } catch (err) {
    console.error('Content settings error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
