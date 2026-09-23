'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { useStore } from '@/store/useStore';
import * as THREE from 'three';

// ── Helper: compute normalised scale & centering from any scene ──────────────
function computeLayout(scene: THREE.Group, targetSize = 3.75) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const ns = targetSize / maxDim;
  const center = new THREE.Vector3();
  box.getCenter(center);
  return {
    normalizedScale: ns,
    offsetX: -center.x * ns,
    offsetY: -box.min.y * ns,
    offsetZ: -center.z * ns,
  };
}

export const ZoraRig = ({
  playPop,
  playGiggle,
}: {
  playPop: () => void;
  playGiggle: () => void;
}) => {
  const group = useRef<THREE.Group>(null);
  const { action, isSpeaking, isDancing, setAction, setEmotion } = useStore();

  // Always load both models — useGLTF caches them so no extra cost after first load
  const { scene: idleScene }  = useGLTF('/zora.glb');
  const { scene: danceScene } = useGLTF('/dance_zora.glb');

  // Pick whichever scene is active
  const activeScene = isDancing ? danceScene : idleScene;

  // Compute scale/offset once per scene (memoised per scene object)
  const idleLayout  = useMemo(() => computeLayout(idleScene),  [idleScene]);
  const danceLayout = useMemo(() => computeLayout(danceScene), [danceScene]);
  const layout = isDancing ? danceLayout : idleLayout;

  // Spring-driven scale for interactions
  const { scale } = useSpring({
    scale:
      action === 'dance'  ? 1.12 :
      action === 'bounce' ? 1.06 :
      action === 'giggle' ? 1.04 : 1,
    config: { mass: 1, tension: 200, friction: 14 },
  });

  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.getElapsedTime();
    const baseY = -1.5;

    if (action === 'idle' || action === 'nod') {
      group.current.position.y = baseY + Math.sin(time * 1.8) * 0.04;
    } else if (action === 'dance') {
      group.current.position.y = baseY + Math.abs(Math.sin(time * 9)) * 0.25;
      group.current.rotation.z = Math.sin(time * 5) * 0.18;
    } else if (action === 'bounce') {
      group.current.position.y = baseY + Math.abs(Math.sin(time * 12)) * 0.18;
    } else {
      group.current.position.y = baseY;
      group.current.rotation.z = 0;
    }

    if (isSpeaking) {
      group.current.rotation.x = Math.sin(time * 14) * 0.04;
    } else {
      group.current.rotation.x = 0;
    }

    if (action === 'shake') {
      group.current.rotation.y = Math.sin(time * 16) * 0.22;
    } else {
      group.current.rotation.y = 0;
    }
  });

  const handleTap = () => {
    playGiggle();
    setEmotion('joy');
    setAction('giggle');
    setTimeout(() => {
      if (useStore.getState().action === 'giggle') setAction('idle');
      if (useStore.getState().emotion === 'joy') setEmotion('neutral');
    }, 1200);
  };

  const handleHeadTap = () => {
    playPop();
    setEmotion('surprise');
    setAction('nod');
    setTimeout(() => {
      if (useStore.getState().action === 'nod') setAction('idle');
      if (useStore.getState().emotion === 'surprise') setEmotion('neutral');
    }, 1000);
  };

  return (
    <animated.group
      ref={group}
      scale={scale as unknown as number}
      position={[0, -1.5, 1.5]}
      dispose={null}
      onClick={handleTap}
      onPointerOver={handleHeadTap}
    >
      <primitive
        object={activeScene}
        scale={layout.normalizedScale}
        position={[layout.offsetX, layout.offsetY, layout.offsetZ]}
      />
    </animated.group>
  );
};

// Preload both models so the swap is instant with no stutter
useGLTF.preload('/zora.glb');
useGLTF.preload('/dance_zora.glb');
