'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useAudioEffects } from '@/hooks/useAudioEffects';
import { useVoice } from '@/context/VoiceContext';
import { X, ChevronRight } from 'lucide-react';

interface Round {
  question: string; // Zora's intro prompt
  statements: string[];
  sillyIndex: number; // which one is the silly lie
}

const ROUNDS: Round[] = [
  {
    question: "Which one is the silly lie?",
    statements: ["Cows say moo. 🐄", "Fish live in water. 🐟", "Apples fly in the sky like birds. 🍎✈️"],
    sillyIndex: 2,
  },
  {
    question: "Can you find the silly one?",
    statements: ["The sun shines in the sky. ☀️", "Elephants use smartphones to call their friends. 🐘📱", "Dogs like to play fetch. 🐕"],
    sillyIndex: 1,
  },
  {
    question: "One of these is super silly — which one?",
    statements: ["Bananas are yellow. 🍌", "Ice cream is cold. 🍦", "Cats drive race cars to the supermarket. 🐱🏎️"],
    sillyIndex: 2,
  },
  {
    question: "Zora is fibbing! Which one is the silly lie?",
    statements: ["Frogs can jump very high. 🐸", "Trees have leaves. 🌳", "Clouds are made of fluffy cotton candy you can eat. ☁️🍭"],
    sillyIndex: 2,
  },
  {
    question: "One of these is totally not true — find it!",
    statements: ["Penguins wear tiny tuxedos to fancy dinner parties. 🐧🍽️", "Birds have wings. 🐦", "Rain falls down from clouds. 🌧️"],
    sillyIndex: 0,
  },
  {
    question: "Which one is the big silly fib?",
    statements: ["Flowers need sunlight to grow. 🌸", "Bees make honey. 🍯", "Lions go to school and do homework every night. 🦁📚"],
    sillyIndex: 2,
  },
  {
    question: "Zora is being sneaky! Which one is the lie?",
    statements: ["Butterflies are colorful. 🦋", "Snowflakes are cold. ❄️", "Pigs build rockets and zoom to the moon on weekends. 🐷🚀"],
    sillyIndex: 2,
  },
  {
    question: "One of these is really really silly — can you find it?",
    statements: ["Giraffes wear scarves around their super long necks every Monday. 🦒🧣", "Stars twinkle at night. ⭐", "Babies love to laugh. 👶"],
    sillyIndex: 0,
  },
  {
    question: "Spot the silly one!",
    statements: ["Lemons taste sour. 🍋", "The ocean is full of water. 🌊", "Dinosaurs still go to the dentist every Tuesday. 🦕🦷"],
    sillyIndex: 2,
  },
  {
    question: "Which one did Zora make up?",
    statements: ["Rabbits hop around. 🐰", "Owls say hoot. 🦉", "Worms go to pizza parties and dance all night long. 🪱🍕"],
    sillyIndex: 2,
  },
];

const CORRECT_REACTIONS = [
  "[JOY][DANCE] Yesss! That was the silly one! You are SO clever! 🎉",
  "[JOY][GIGGLE] Amazing! You found it! Hehe, wasn't that funny? 😄",
  "[SURPRISE][BOUNCE] WOW! You got it! You are really really smart! ⭐",
  "[JOY][DANCE] That's right! Elephants don't use smartphones — or do they? Heehee! 🤔",
];

const WRONG_REACTIONS = [
  '[NEUTRAL][NOD] Ooh, that one is actually true! Look at the other ones — which one sounds really really funny?',
  '[SAD][SHAKE] Hmm, not quite! Think about it — which one could NEVER happen in real life?',
  '[NEUTRAL][NOD] Good try! But that one is real! Which one sounds super silly and impossible?',
];

// Shuffle rounds so they come in a random order each session
function shuffleRounds() {
  return [...ROUNDS].sort(() => Math.random() - 0.5);
}

import { BadgeAward } from './BadgeAward';

export const TruthsGame = () => {
  const { activeActivity, setActiveActivity, setAction, setEmotion, awardBadge } = useStore();
  const { playDing, playPop, playCrunch } = useAudioEffects();
  const { processAndSpeak } = useVoice();

  const [roundQueue, setRoundQueue] = useState<Round[]>(() => shuffleRounds());
  const [roundIndex, setRoundIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const MAX_ROUNDS = 5;
  const currentRound = roundQueue[roundIndex % roundQueue.length];

  // Speak intro when game opens or a new round starts
  useEffect(() => {
    if (activeActivity !== 'truths' || isGameOver) return;
    setTimeout(() => {
      processAndSpeak(
        `[SURPRISE][BOUNCE] Two truths and a silly lie! I will say three things. Two are TRUE, and one is totally SILLY and made up! ${currentRound.question}`
      );
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeActivity, roundIndex, isGameOver]);

  const handleChoice = useCallback((idx: number) => {
    if (chosen !== null) return; // already picked this round
    setChosen(idx);
    setTotal((t) => t + 1);

    const isCorrect = idx === currentRound.sillyIndex;
    if (isCorrect) {
      playDing();
      setFirstTryCorrect((s) => s + 1);
      setAction('dance');
      setEmotion('joy');
      const msg = CORRECT_REACTIONS[Math.floor(Math.random() * CORRECT_REACTIONS.length)];
      processAndSpeak(msg);
    } else {
      playCrunch();
      setAction('shake');
      setEmotion('sad');
      const msg = WRONG_REACTIONS[Math.floor(Math.random() * WRONG_REACTIONS.length)];
      processAndSpeak(msg);
    }
  }, [chosen, currentRound, playDing, playCrunch, setAction, setEmotion, processAndSpeak]);

  const nextRound = () => {
    playPop();
    setChosen(null);
    setAction('idle');
    setEmotion('neutral');
    if (roundIndex + 1 >= MAX_ROUNDS) {
      setIsGameOver(true);
    } else {
      setRoundIndex((i) => i + 1);
    }
  };

  const handleClose = () => {
    playPop();
    setChosen(null);
    setFirstTryCorrect(0);
    setTotal(0);
    setRoundIndex(0);
    setIsGameOver(false);
    setRoundQueue(shuffleRounds());
    setActiveActivity('none');
  };

  const finishGameAndSaveBadge = () => {
    const badge = firstTryCorrect === MAX_ROUNDS ? 'gold' : firstTryCorrect >= 3 ? 'silver' : 'bronze';
    awardBadge('truths', badge);
    handleClose();
  };

  const getButtonStyle = (idx: number) => {
    if (chosen === null) {
      return 'bg-white hover:bg-violet-50 border-violet-300 text-gray-800 hover:-translate-y-1';
    }
    if (idx === currentRound.sillyIndex) {
      // Always reveal the correct answer
      return 'bg-green-400 border-green-600 text-white scale-105';
    }
    if (idx === chosen && chosen !== currentRound.sillyIndex) {
      // Wrong choice — highlight in red
      return 'bg-red-300 border-red-500 text-white';
    }
    return 'bg-white border-gray-200 text-gray-400 opacity-60';
  };

  const getLabelBadge = (idx: number) => {
    if (chosen === null) return null;
    if (idx === currentRound.sillyIndex) {
      return <span className="ml-2 text-sm font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">🎉 Silly Lie!</span>;
    }
    return <span className="ml-2 text-sm font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">✅ True</span>;
  };

  return (
    <AnimatePresence>
      {activeActivity === 'truths' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
        >
          {isGameOver ? (
            <BadgeAward 
              badge={firstTryCorrect === MAX_ROUNDS ? 'gold' : firstTryCorrect >= 3 ? 'silver' : 'bronze'} 
              gameName="Two Truths" 
              onClose={finishGameAndSaveBadge} 
            />
          ) : (
            <>
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              className="bg-gradient-to-br from-violet-100 to-purple-200 p-8 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col gap-6 border-8 border-white relative"
            >
              {/* Header */}
              <div className="flex w-full items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-purple-900">🤔 2 Truths & a Silly Lie!</h2>
                  <p className="text-purple-700 font-semibold mt-0.5">Tap the silly made-up one!</p>
                </div>
                <div className="text-xl font-bold text-purple-700 bg-white/60 rounded-2xl px-4 py-2">
                  Round {roundIndex + 1} / {MAX_ROUNDS}
                </div>
              </div>

              {/* Round tag */}
              <div className="text-center">
                <span className="bg-purple-400 text-white font-bold text-sm px-4 py-1 rounded-full">
                  Score: {firstTryCorrect}
                </span>
              </div>

              {/* Statement buttons */}
              <div className="flex flex-col gap-3 sm:gap-4">
                {currentRound.statements.map((stmt, idx) => (
                  <motion.button
                    key={`${roundIndex}-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={chosen === null ? { scale: 1.02 } : {}}
                    whileTap={chosen === null ? { scale: 0.97 } : {}}
                    disabled={chosen !== null}
                    onClick={() => handleChoice(idx)}
                    className={`w-full text-left text-lg sm:text-xl font-bold py-3 sm:py-5 px-4 sm:px-6 rounded-2xl border-4 shadow-[0_5px_0_rgba(0,0,0,0.12)] transition-all flex items-center justify-between ${getButtonStyle(idx)}`}
                  >
                    <span>
                      <span className="text-xl sm:text-2xl font-black mr-2 sm:mr-3 text-purple-400">{idx + 1}.</span>
                      {stmt}
                      {getLabelBadge(idx)}
                    </span>
                  </motion.button>
                ))}
              </div>

            {/* Result message + Next button */}
            <AnimatePresence>
              {chosen !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className={`text-xl font-extrabold rounded-2xl px-6 py-3 text-center ${
                    chosen === currentRound.sillyIndex
                      ? 'bg-green-400 text-white'
                      : 'bg-orange-300 text-orange-900'
                  }`}>
                    {chosen === currentRound.sillyIndex
                      ? '🎉 You found the silly lie!'
                      : '🔎 Oops! The green one was the silly lie!'}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextRound}
                    className="flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-white text-xl font-extrabold py-4 px-10 rounded-2xl shadow-[0_5px_0_#6b21a8] hover:-translate-y-1 transition-all border-4 border-purple-700"
                  >
                    Next Round <ChevronRight size={24} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-4 bg-white text-gray-800 rounded-full shadow-lg z-40 hover:bg-gray-100 active:scale-95 transition-transform"
            >
              <X size={32} />
            </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
