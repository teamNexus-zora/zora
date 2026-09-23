'use client';

import { useThree, Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ZoraRig } from './ZoraRig';
import { useAudioEffects } from '@/hooks/useAudioEffects';
import React, { useEffect, Suspense } from 'react';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl font-bold shadow-lg text-center max-w-sm">
            <p>Error loading Zora.</p>
            <p className="text-xs font-normal mt-2 opacity-70">{String(this.state.error)}</p>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

const ResponsiveCamera = () => {
  const { camera, size } = useThree();
  useEffect(() => {
    if (size.width < size.height) {
      const aspect = size.width / size.height;
      (camera as any).fov = Math.max(48, 35 / aspect);
    } else {
      (camera as any).fov = 48;
    }
    camera.position.set(0, 1.2, 6.5);
    camera.updateProjectionMatrix();
  }, [size, camera]);
  return null;
};

export const RoomCanvas = () => {
  const { playPop, playDing } = useAudioEffects();
  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Canvas
        shadows={false}
        dpr={[1, 1]}
        camera={{ position: [0, 1.2, 6.5], fov: 48 }}
        frameloop="always"
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ResponsiveCamera />
        <ambientLight intensity={2.8} color="#fff8f0" />
        <directionalLight position={[-4, 8, 6]} intensity={1.2} color="#ffe8d0" />
        <directionalLight position={[6, 4, 4]} intensity={0.6} color="#ffffff" />
        <Suspense fallback={<Html center><div className="bg-white/80 px-4 py-2 rounded-full font-bold text-amber-600 shadow-sm whitespace-nowrap animate-pulse">Loading Zora...</div></Html>}>
          <ErrorBoundary>
            <ZoraRig playPop={playPop} playGiggle={playDing} />
          </ErrorBoundary>
        </Suspense>
      </Canvas>
    </div>
  );
};
