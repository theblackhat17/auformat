import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Au Format — Menuiserie sur mesure',
    short_name: 'Au Format',
    description: 'Menuiserie et agencement sur mesure dans le Nord : cuisines, dressings, bibliothèques. Configurez votre projet en ligne.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF6EE',
    theme_color: '#2C5F2D',
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
