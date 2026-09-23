import { RoomCanvas } from '@/components/RoomCanvas';
import { ActionTray } from '@/components/UI/ActionTray';
import { TracingBoard } from '@/components/UI/TracingBoard';
import { AppleCountingGame } from '@/components/UI/AppleCountingGame';
import { TruthsGame } from '@/components/UI/TruthsGame';
import { ShapeSortingGame } from '@/components/UI/ShapeSortingGame';
import { VoiceProvider } from '@/context/VoiceContext';

export default function Home() {
  return (
    <VoiceProvider>
      <main className="relative w-full h-screen overflow-hidden bg-gray-50 touch-none select-none">
        {/* 3D Park Environment with Zora */}
        <RoomCanvas />

        {/* Activity Overlays */}
        <TracingBoard />
        <AppleCountingGame />
        <TruthsGame />
        <ShapeSortingGame />

        {/* Bottom Activity Tray */}
        <ActionTray />
      </main>
    </VoiceProvider>
  );
}
