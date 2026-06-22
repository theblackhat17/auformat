'use client';

import { createElement, useEffect, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Visionneuse de réalité augmentée : charge le composant <model-viewer> de Google
 * à la demande (bundle séparé) et lance l'AR (Scene Viewer sur Android, Quick Look
 * sur iOS) à partir des modèles GLB/USDZ exportés depuis la scène Three.js.
 */
export function ArViewer({ glbUrl, usdzUrl, onClose }: { glbUrl: string; usdzUrl: string; onClose: () => void }) {
  const [ready, setReady] = useState(false);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    let active = true;
    import('@google/model-viewer').then(() => active && setReady(true)).catch(() => active && setReady(true));
    return () => { active = false; };
  }, []);

  const viewer = createElement(
    'model-viewer' as any,
    {
      src: glbUrl,
      ...(usdzUrl ? { 'ios-src': usdzUrl } : {}),
      ar: true,
      'ar-modes': 'webxr scene-viewer quick-look',
      'ar-scale': 'fixed',
      'camera-controls': true,
      'shadow-intensity': '1',
      'touch-action': 'pan-y',
      'environment-image': 'neutral',
      style: { width: '100%', height: '100%', backgroundColor: 'transparent' },
    } as any,
    createElement(
      'button',
      {
        slot: 'ar-button',
        className: 'absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-vert-foret text-white text-sm font-bold rounded-full shadow-lg',
      },
      '📐 Placer dans ma pièce'
    )
  );

  return (
    <div className="fixed inset-0 z-[130] bg-noir/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl w-full max-w-2xl h-[82vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-display text-lg text-noir">Voir chez moi</h3>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-full hover:bg-gray-100 text-noir/50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="relative flex-1 bg-beige/40">
          {ready ? viewer : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="px-5 py-3 text-xs text-noir/60 text-center flex-shrink-0 border-t border-gray-100">
          {isMobile
            ? 'Touchez « Placer dans ma pièce », puis bougez votre téléphone pour poser le meuble à l\'échelle réelle.'
            : 'Vous êtes sur ordinateur : pour la réalité augmentée, ouvrez le configurateur depuis votre téléphone. Vous pouvez déjà faire tourner le modèle ici.'}
        </div>
      </div>
    </div>
  );
}
