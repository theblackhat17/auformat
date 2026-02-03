'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { PlancheConfig } from '@/lib/types';
import { SceneBase } from './SceneBase';
import { rebuildPlancheScene, centerPlancheCamera } from '../three/three-planche';
import { disposeGroup } from '../three/three-shared';

interface Props {
  config: PlancheConfig;
}

export function PlancheRenderer({ config }: Props) {
  const refsRef = useRef<any>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const handleReady = useCallback((refs: any) => {
    refsRef.current = refs;
    rebuildPlancheScene(refs.mainGroup, configRef.current.boards, configRef.current.material, disposeGroup);
    if (configRef.current.boards.length > 0) {
      centerPlancheCamera(refs.camera, refs.controls, configRef.current.boards[0]);
    }
  }, []);

  useEffect(() => {
    if (!refsRef.current) return;
    const refs = refsRef.current;
    rebuildPlancheScene(refs.mainGroup, config.boards, config.material, disposeGroup);
  }, [config]);

  return <SceneBase onReady={handleReady} />;
}
