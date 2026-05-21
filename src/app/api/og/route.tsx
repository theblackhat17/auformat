import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge';

const PAGE_SUBTITLES: Record<string, string> = {
  '/': 'Menuiserie & ébénisterie sur mesure',
  '/realisations': 'Portfolio menuiserie sur mesure',
  '/contact': 'Devis gratuit et sans engagement',
  '/avis': 'Témoignages de nos clients',
  '/materiaux': 'Essences de bois nobles et durables',
  '/savoir-faire': 'Expertise menuiserie et ébénisterie',
  '/processus': 'De la conception à l\'installation',
  '/about': 'Notre histoire et nos valeurs',
  '/configurateur': 'Configurez votre meuble en ligne',
  '/menuiserie-lille': 'Atelier Cysoing — Métropole lilloise',
  '/menuiserie-le-touquet': 'Atelier La Calotterie — Côte d\'Opale',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Au Format';
  const path = searchParams.get('path') || '/';
  const subtitle = PAGE_SUBTITLES[path] || 'Menuiserie sur mesure dans le Nord et le Pas-de-Calais';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#1a1a1a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative wood grain gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(139,111,71,0.15) 0%, rgba(139,111,71,0.05) 50%, transparent 100%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '6px',
            background: 'linear-gradient(90deg, #8B6F47, #C4A265, #8B6F47)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '60px 80px',
            position: 'relative',
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2D5A3D, #3a7a52)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '22px',
                fontWeight: 700,
              }}
            >
              AF
            </div>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#C4A265',
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              Au Format
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 50 ? '42px' : '52px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              maxWidth: '900px',
              marginBottom: '20px',
              display: 'flex',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '700px',
              display: 'flex',
            }}
          >
            {subtitle}
          </div>

          {/* Bottom info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginTop: '50px',
              fontSize: '18px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <span style={{ display: 'flex' }}>auformat.com</span>
            <span style={{ display: 'flex' }}>•</span>
            <span style={{ display: 'flex' }}>Cysoing (Lille)</span>
            <span style={{ display: 'flex' }}>•</span>
            <span style={{ display: 'flex' }}>La Calotterie (Le Touquet)</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
