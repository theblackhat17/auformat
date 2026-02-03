'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { MeubleConfig } from '@/lib/types';
import { SceneBase } from './SceneBase';
import { rebuildScene, centerCamera } from '../three/three-meuble';

interface Props {
  config: MeubleConfig;
}

export function MeubleRenderer({ config }: Props) {
  const refsRef = useRef<any>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const handleReady = useCallback((refs: any) => {
    refsRef.current = refs;
    rebuildScene(refs.mainGroup, configRef.current);
    centerCamera(refs.camera, refs.controls, configRef.current);
  }, []);

  useEffect(() => {
    if (!refsRef.current) return;
    const refs = refsRef.current;
    rebuildScene(refs.mainGroup, config);
  }, [config]);

  return <SceneBase onReady={handleReady} />;
}
