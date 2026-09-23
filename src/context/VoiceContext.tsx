'use client';

import React, { createContext, useContext } from 'react';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';

interface VoiceContextValue {
  processAndSpeak: (text: string) => void;
}

const VoiceContext = createContext<VoiceContextValue>({
  processAndSpeak: () => {},
});

export const VoiceProvider = ({ children }: { children: React.ReactNode }) => {
  // Single instance of the voice agent for the whole app
  const { processAndSpeak } = useVoiceAgent();

  return (
    <VoiceContext.Provider value={{ processAndSpeak }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
