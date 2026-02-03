'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { CuisineConfig } from '@/lib/types';
import { SceneBase } from './SceneBase';
import { rebuildCuisineScene, centerCuisineCamera } from '../three/three-cuisine';

interface Props {
  config: CuisineConfig;
}

export function CuisineRenderer({ config }: Props) {
  const refsRef = useRef<any>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const handleReady = useCallback((refs: any) => {
    refsRef.current = refs;
    rebuildCuisineScene(refs.mainGroup, configRef.current);
    centerCuisineCamera(refs.camera, refs.controls, configRef.current);
  }, []);

  useEffect(() => {
    if (!refsRef.current) return;
    const refs = refsRef.current;
    rebuildCuisineScene(refs.mainGroup, config);
  }, [config]);

  return <SceneBase onReady={handleReady} />;
}
