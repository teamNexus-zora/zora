'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useAudioEffects } from '@/hooks/useAudioEffects';
import { Cookie, Music, Type, Apple, Smile, Shapes, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

const SNACKS = [
  { id: 'dumpling', emoji: '🥟', name: 'Dumpling' },
  { id: 'taco', emoji: '🌮', name: 'Taco' },
  { id: 'dosa', emoji: '🫔', name: 'Dosa' },
  { id: 'strawberry', emoji: '🍓', name: 'Strawberry' },
];

export const ActionTray = () => {
  const [isGamesMenuOpen, setIsGamesMenuOpen] = useState(false);
  const { activeActivity, setActiveActivity, setEmotion, setAction, setSpeechText, setIsDancing, badges } = useStore();
  const { playPop, playCrunch, playDrum, playDanceMusic } = useAudioEffects();

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, snackName: string) => {
    // If dragged upwards enough, consider it "fed" to Zora
    if (info.offset.y < -150) {
      playCrunch();
      setEmotion('eating');
      setAction('bounce');
      setSpeechText(`Yum! I love ${snackName}!`);
      setTimeout(() => {
        setEmotion('joy');
        setAction('idle');
      }, 2000);
    }
  };

  const handleDrumTap = () => {
    // Don't restart if already dancing
    if (useStore.getState().isDancing) return;

    playDrum();
    const stopMusic = playDanceMusic(12); // play for 12 seconds

    setEmotion('joy');
    setAction('dance');
    setIsDancing(true);
    
    setTimeout(() => {
      stopMusic(); // just in case
      setIsDancing(false);
      setAction('idle');
      setEmotion('neutral');
    }, 12000);
  };

  const badgeEmojis = { none: '', bronze: '🥉', silver: '🥈', gold: '🥇' };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-4 max-w-xl z-20">
      
      <AnimatePresence>
        {activeActivity === 'snack' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex gap-4 p-4 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl w-full justify-center"
          >
            {SNACKS.map((snack) => (
              <motion.div
                key={snack.id}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.5}
                onDragEnd={(e, info) => handleDragEnd(e, info, snack.name)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-5xl cursor-grab active:cursor-grabbing p-2"
              >
                {snack.emoji}
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeActivity === 'music' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex gap-6 p-6 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl"
          >
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleDrumTap}
              className="w-24 h-24 bg-orange-400 rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-orange-600"
            >
              🥁
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleDrumTap}
              className="w-24 h-24 bg-green-400 rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-green-600"
            >
              🪇
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isGamesMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex gap-4 p-4 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl justify-center"
          >
            <TrayButton 
              icon={<Apple size={24} />} 
              isActive={activeActivity === 'apples'} 
              onClick={() => { playPop(); setActiveActivity('apples'); setIsGamesMenuOpen(false); }}
              color="bg-green-300 text-green-800 relative"
              label={`Apples ${badgeEmojis[badges.apples]}`}
            />
            <TrayButton 
              icon={<Smile size={24} />} 
              isActive={activeActivity === 'truths'} 
              onClick={() => { playPop(); setActiveActivity('truths'); setIsGamesMenuOpen(false); }}
              color="bg-fuchsia-300 text-fuchsia-800 relative"
              label={`Truths ${badgeEmojis[badges.truths]}`}
            />
            <TrayButton 
              icon={<Shapes size={24} />} 
              isActive={activeActivity === 'shapes'} 
              onClick={() => { playPop(); setActiveActivity('shapes'); setIsGamesMenuOpen(false); }}
              color="bg-indigo-300 text-indigo-800 relative"
              label={`Sort ${badgeEmojis[badges.shapes]}`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 sm:gap-3 w-full justify-center max-w-lg px-2 flex-wrap">
        <TrayButton 
          icon={<Cookie size={28} />} 
          isActive={activeActivity === 'snack'} 
          onClick={() => { playPop(); setActiveActivity(activeActivity === 'snack' ? 'none' : 'snack'); setIsGamesMenuOpen(false); }} 
          color="bg-amber-300 text-amber-800"
        />
        <TrayButton 
          icon={<Music size={28} />} 
          isActive={activeActivity === 'music'} 
          onClick={() => { playPop(); setActiveActivity(activeActivity === 'music' ? 'none' : 'music'); setIsGamesMenuOpen(false); }}
          color="bg-purple-300 text-purple-800"
        />
        <TrayButton 
          icon={<Type size={28} />} 
          isActive={activeActivity === 'tracing'} 
          onClick={() => { playPop(); setActiveActivity(activeActivity === 'tracing' ? 'none' : 'tracing'); setIsGamesMenuOpen(false); }}
          color="bg-sky-300 text-sky-800"
        />
        <TrayButton 
          icon={<Gamepad2 size={28} />} 
          isActive={isGamesMenuOpen || ['apples', 'truths', 'shapes'].includes(activeActivity)} 
          onClick={() => { playPop(); setIsGamesMenuOpen(!isGamesMenuOpen); if (['apples', 'truths', 'shapes'].includes(activeActivity)) setActiveActivity('none'); }}
          color="bg-emerald-300 text-emerald-800"
          label="Games"
        />
      </div>
    </div>
  );
};

const TrayButton = ({ icon, isActive, onClick, color, label }: { icon: React.ReactNode, isActive: boolean, onClick: () => void, color: string, label?: string }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={`p-3 sm:p-4 rounded-full transition-all border-4 shadow-[0_6px_0_rgba(0,0,0,0.15)] flex flex-col items-center justify-center gap-0.5 ${
      isActive 
        ? 'bg-gray-800 text-white border-gray-900 translate-y-[4px] shadow-[0_2px_0_rgba(0,0,0,0.15)]' 
        : `${color} border-white hover:-translate-y-1 hover:shadow-[0_8px_0_rgba(0,0,0,0.15)]`
    }`}
  >
    {icon}
    {label && <span className="text-[10px] font-extrabold leading-none mt-0.5">{label}</span>}
  </motion.button>
);
