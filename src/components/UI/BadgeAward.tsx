'use client';

import { motion } from 'framer-motion';
import { BadgeType } from '@/store/useStore';
import { useAudioEffects } from '@/hooks/useAudioEffects';
import { useEffect } from 'react';

interface BadgeAwardProps {
  badge: BadgeType;
  gameName: string;
  onClose: () => void;
}

const BADGE_CONFIG = {
  gold: {
    emoji: '🥇',
    color: 'from-yellow-300 to-yellow-500',
    shadow: 'shadow-yellow-500/50',
    title: 'Gold Badge!',
    msg: 'Perfect score! You are a genius!',
  },
  silver: {
    emoji: '🥈',
    color: 'from-gray-300 to-gray-400',
    shadow: 'shadow-gray-400/50',
    title: 'Silver Badge!',
    msg: 'Great job! You did so well!',
  },
  bronze: {
    emoji: '🥉',
    color: 'from-amber-600 to-amber-700',
    shadow: 'shadow-amber-700/50',
    title: 'Bronze Badge!',
    msg: 'Good try! Keep practicing!',
  },
  none: { emoji: '', color: '', shadow: '', title: '', msg: '' },
};

export const BadgeAward = ({ badge, gameName, onClose }: BadgeAwardProps) => {
  const { playPop } = useAudioEffects();
  const conf = BADGE_CONFIG[badge];

  useEffect(() => {
    // We could play a specific sound here based on the badge
  }, [badge]);

  if (badge === 'none') return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className={`bg-gradient-to-b ${conf.color} p-1 rounded-3xl ${conf.shadow} shadow-2xl max-w-sm w-full relative`}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 flex flex-col items-center text-center gap-4">
          <p className="text-sm font-extrabold text-gray-500 uppercase tracking-widest">{gameName} Complete</p>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="text-8xl drop-shadow-xl"
          >
            {conf.emoji}
          </motion.div>
          <h2 className="text-3xl font-extrabold text-gray-800">{conf.title}</h2>
          <p className="text-lg font-bold text-gray-600">{conf.msg}</p>

          <button
            onClick={() => { playPop(); onClose(); }}
            className="mt-4 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-10 rounded-full shadow-lg active:scale-95 transition-transform text-xl"
          >
            Awesome!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
