'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FurnitureConfig } from '@/lib/types';
import {
  setupLights,
  setupEnvironment,
  rebuildScene,
  centerCamera,
  changeView as changeViewHelper,
  checkPositionValidity,
} from './three-helpers';

interface ConfigurateurSceneProps {
  furniture: FurnitureConfig;
  onMoveModule?: (cabinetId: number, moduleId: number, newPosition: number) => void;
}

export default function ConfigurateurScene({ furniture, onMoveModule }: ConfigurateurSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mainGroupRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number>(0);
  const furnitureRef = useRef(furniture);

  // Drag state
  const isDraggingRef = useRef(false);
  const draggedModuleRef = useRef<THREE.Object3D | null>(null);
  const dragStartYRef = useRef(0);
  const dragGhostRef = useRef<THREE.Mesh | null>(null);
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  furnitureRef.current = furniture;

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);
    scene.fog = new THREE.Fog(0xf0f4f8, 3000, 5000);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      1,
      10000
    );
    camera.position.set(2000, 1500, 2000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights & environment
    setupLights(scene);
    setupEnvironment(scene);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 800;
    controls.maxDistance = 5000;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Main group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    mainGroupRef.current = mainGroup;

    // Build initial furniture
    rebuildScene(mainGroup, furnitureRef.current);
    centerCamera(camera, controls, furnitureRef.current);

    // Animation loop
    function animate() {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize
    function onResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onResize);

    // Canvas events
    const canvas = renderer.domElement;

    function getMousePos(event: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onCanvasHover(event: MouseEvent) {
      if (isDraggingRef.current) return;
      getMousePos(event);
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(mainGroup.children, true);
      const hasModule = intersects.length > 0 && intersects[0].object.userData.moduleData;
      canvas.style.cursor = hasModule ? 'grab' : 'default';
    }

    function onMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;
      getMousePos(event);
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(mainGroup.children, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.moduleData) {
          // Highlight selection
          if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
            object.material.emissive.setHex(0x444444);
          }

          // Start drag
          isDraggingRef.current = true;
          draggedModuleRef.current = object;
          dragStartYRef.current = event.clientY;
          controls.enabled = false;
          canvas.style.cursor = 'grabbing';

          // Create ghost
          if (object instanceof THREE.Mesh) {
            const ghostMat = new THREE.MeshBasicMaterial({
              color: 0x4ade80,
              transparent: true,
              opacity: 0.3,
            });
            const ghost = new THREE.Mesh(object.geometry.clone(), ghostMat);
            ghost.position.copy(object.position);
            ghost.rotation.copy(object.rotation);
            if (object.parent) {
              object.parent.add(ghost);
            } else {
              scene.add(ghost);
            }
            dragGhostRef.current = ghost;
          }

          // Create snap indicator
          const snapGeo = new THREE.PlaneGeometry(1500, 2);
          const snapMat = new THREE.MeshBasicMaterial({
            color: 0x4ade80,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          });
          const snap = new THREE.Mesh(snapGeo, snapMat);
          snap.visible = false;
          scene.add(snap);
          snapIndicatorRef.current = snap;

          // Make dragged object semi-transparent
          if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
            object.material.opacity = 0.5;
            object.material.transparent = true;
          }
        }
      }
    }

    function onMouseMove(event: MouseEvent) {
      if (!isDraggingRef.current || !draggedModuleRef.current) {
        onCanvasHover(event);
        return;
      }

      const moduleData = draggedModuleRef.current.userData.moduleData;
      if (!moduleData) return;

      const cabinet = furnitureRef.current.cabinets.find((c) =>
        c.modules.some((m) => m.id === moduleData.id)
      );
      if (!cabinet) return;

      const deltaY = event.clientY - dragStartYRef.current;
      const sensitivity = 2;
      const newPosition = moduleData.position - deltaY * sensitivity;

      const minPos = cabinet.thickness + 50;
      const maxPos = cabinet.height - cabinet.thickness - 100;
      const clampedPosition = Math.max(minPos, Math.min(maxPos, newPosition));

      const snapGrid = 50;
      const snappedPosition = Math.round(clampedPosition / snapGrid) * snapGrid;

      if (dragGhostRef.current) {
        dragGhostRef.current.position.y = snappedPosition;

        if (snapIndicatorRef.current) {
          snapIndicatorRef.current.visible = true;
          snapIndicatorRef.current.position.set(
            dragGhostRef.current.position.x,
            snappedPosition,
            dragGhostRef.current.position.z
          );
        }
      }

      const isValid = checkPositionValidity(cabinet, moduleData.id, snappedPosition);
      if (dragGhostRef.current && dragGhostRef.current.material instanceof THREE.MeshBasicMaterial) {
        dragGhostRef.current.material.color.setHex(isValid ? 0x4ade80 : 0xef4444);
      }
    }

    function onMouseUp() {
      if (!isDraggingRef.current || !draggedModuleRef.current) return;

      const moduleData = draggedModuleRef.current.userData.moduleData;
      const cabinet = furnitureRef.current.cabinets.find((c) =>
        c.modules.some((m) => m.id === moduleData.id)
      );

      if (cabinet && dragGhostRef.current) {
        const newPosition = dragGhostRef.current.position.y;
        if (checkPositionValidity(cabinet, moduleData.id, newPosition)) {
          onMoveModule?.(cabinet.id, moduleData.id, newPosition);
        }
      }

      // Cleanup drag
      isDraggingRef.current = false;
      controls.enabled = true;
      canvas.style.cursor = 'default';

      if (draggedModuleRef.current instanceof THREE.Mesh) {
        const mat = draggedModuleRef.current.material;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.opacity = 1;
          mat.transparent = false;
          mat.emissive.setHex(0x000000);
        }
      }

      if (dragGhostRef.current) {
        dragGhostRef.current.parent?.remove(dragGhostRef.current);
        dragGhostRef.current.geometry?.dispose();
        (dragGhostRef.current.material as THREE.Material)?.dispose();
        dragGhostRef.current = null;
      }

      if (snapIndicatorRef.current) {
        scene.remove(snapIndicatorRef.current);
        snapIndicatorRef.current.geometry?.dispose();
        (snapIndicatorRef.current.material as THREE.Material)?.dispose();
        snapIndicatorRef.current = null;
      }

      draggedModuleRef.current = null;
    }

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild on furniture change
  useEffect(() => {
    if (!mainGroupRef.current) return;
    rebuildScene(mainGroupRef.current, furniture);
  }, [furniture]);

  // Exposed imperative methods via ref-based callbacks
  const handleResetView = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      centerCamera(cameraRef.current, controlsRef.current, furnitureRef.current);
    }
  }, []);

  const handleChangeView = useCallback((view: 'front' | 'side' | 'top') => {
    if (cameraRef.current && controlsRef.current) {
      changeViewHelper(view, cameraRef.current, controlsRef.current, furnitureRef.current);
    }
  }, []);

  const handleToggleWireframe = useCallback(() => {
    if (!mainGroupRef.current) return;
    mainGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.wireframe = !child.material.wireframe;
      }
    });
  }, []);

  return (
    <div className="relative flex-1 min-h-[400px]">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* View controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleResetView}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm font-medium hover:bg-white transition-colors"
          title="Vue par defaut"
        >
          3D
        </button>
        <button
          onClick={() => handleChangeView('front')}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm font-medium hover:bg-white transition-colors"
          title="Vue de face"
        >
          Face
        </button>
        <button
          onClick={() => handleChangeView('side')}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm font-medium hover:bg-white transition-colors"
          title="Vue de cote"
        >
          Cote
        </button>
        <button
          onClick={() => handleChangeView('top')}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm font-medium hover:bg-white transition-colors"
          title="Vue de dessus"
        >
          Haut
        </button>
        <div className="h-px bg-gray-200 my-1" />
        <button
          onClick={handleToggleWireframe}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm font-medium hover:bg-white transition-colors"
          title="Wireframe"
        >
          Fil
        </button>
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-gray-500">
        Clic + glisser pour pivoter &middot; Molette pour zoomer &middot; Glisser un module pour le repositionner
      </div>
    </div>
  );
}
