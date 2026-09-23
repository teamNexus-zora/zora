'use client';

import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAudioEffects } from '@/hooks/useAudioEffects';

export const CountingGameOverlay = () => {
  const { activeActivity, setActiveActivity } = useStore();
  const { playPop } = useAudioEffects();

  return (
    <AnimatePresence>
      {activeActivity === 'counter' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute inset-0 z-30 bg-white"
        >
          <iframe 
            src="/counting/index.html" 
            className="w-full h-full border-none"
            title="Counting Game"
          />
          <button 
            onClick={() => { playPop(); setActiveActivity('none'); }}
            className="absolute top-6 right-6 p-4 bg-white/50 text-gray-800 rounded-full shadow-lg z-40 hover:bg-white active:scale-95 transition-all backdrop-blur-md"
          >
            <X size={32} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
