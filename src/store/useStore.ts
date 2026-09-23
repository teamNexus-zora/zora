import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Emotion = 'neutral' | 'joy' | 'surprise' | 'sad' | 'eating' | 'sleeping';
export type Action = 'idle' | 'dance' | 'giggle' | 'nod' | 'shake' | 'bounce';
export type Activity = 'none' | 'snack' | 'tracing' | 'music' | 'counter' | 'apples' | 'truths' | 'shapes';
export type BadgeType = 'none' | 'bronze' | 'silver' | 'gold';

interface Badges {
  apples: BadgeType;
  truths: BadgeType;
  shapes: BadgeType;
}

interface AppState {
  emotion: Emotion;
  action: Action;
  isSpeaking: boolean;
  isDancing: boolean;
  activeActivity: Activity;
  speechText: string;
  badges: Badges;
  setEmotion: (emotion: Emotion) => void;
  setAction: (action: Action) => void;
  setIsSpeaking: (isSpeaking: boolean) => void;
  setIsDancing: (isDancing: boolean) => void;
  setActiveActivity: (activity: Activity) => void;
  setSpeechText: (text: string) => void;
  awardBadge: (game: keyof Badges, badge: BadgeType) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      emotion: 'neutral',
      action: 'idle',
      isSpeaking: false,
      isDancing: false,
      activeActivity: 'none',
      speechText: '',
      badges: { apples: 'none', truths: 'none', shapes: 'none' },
      setEmotion: (emotion) => set({ emotion }),
      setAction: (action) => set({ action }),
      setIsSpeaking: (isSpeaking) => set({ isSpeaking }),
      setIsDancing: (isDancing) => set({ isDancing }),
      setActiveActivity: (activeActivity) => set({ activeActivity }),
      setSpeechText: (speechText) => set({ speechText }),
      awardBadge: (game, badge) => set((state) => {
        const rank = { none: 0, bronze: 1, silver: 2, gold: 3 };
        if (rank[badge] > rank[state.badges[game]]) {
          return { badges: { ...state.badges, [game]: badge } };
        }
        return state;
      }),
    }),
    {
      name: 'zora-storage',
      partialize: (state) => ({ activeActivity: state.activeActivity, badges: state.badges }),
    }
  )
);
