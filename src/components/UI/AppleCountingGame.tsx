'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useAudioEffects } from '@/hooks/useAudioEffects';
import { useVoice } from '@/context/VoiceContext';
import { X, RefreshCw } from 'lucide-react';

// Generate a random count and 4 answer choices (correct + 3 distractors)
function makeRound() {
  const count = Math.floor(Math.random() * 10) + 1; // 1–10
  const correctIdx = Math.floor(Math.random() * 4);
  const choices: number[] = [];
  while (choices.length < 4) {
    const distractor = Math.floor(Math.random() * 10) + 1;
    if (!choices.includes(distractor) && distractor !== count) {
      choices.push(distractor);
    }
  }
  choices.splice(correctIdx, 0, count); // insert correct answer at random position
  return { count, choices: choices.slice(0, 4), correctIdx };
}

const ENCOURAGEMENTS = [
  '[JOY][DANCE] Yaaaay! You got it! 🎉',
  '[JOY][BOUNCE] Super duper! You are SO smart! ⭐',
  '[JOY][GIGGLE] Woo-hoo! Correct! You counted perfectly! 🍎',
  '[SURPRISE][DANCE] Wow wow wow! You did it! High five! ✋',
];

const WRONG_TRIES = [
  '[NEUTRAL][NOD] Oops! Try again! Count the apples slowly — one by one! 🍎',
  '[SAD][SHAKE] Hmm, not quite! Count each apple with your finger! 👆',
  '[NEUTRAL][NOD] Not that one! Take another look — you can do it! 💪',
];

import { BadgeAward } from './BadgeAward';

export const AppleCountingGame = () => {
  const { activeActivity, setActiveActivity, setAction, setEmotion, awardBadge } = useStore();
  const { playDing, playPop, playCrunch } = useAudioEffects();
  const { processAndSpeak } = useVoice();

  const [round, setRound] = useState(() => makeRound());
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [mistakesThisRound, setMistakesThisRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const MAX_ROUNDS = 5;

  // Speak the question when a new round starts
  useEffect(() => {
    if (activeActivity === 'apples' && !isGameOver) {
      setTimeout(() => {
        processAndSpeak(`[NEUTRAL][NOD] How many apples do you see? Count them!`);
      }, 500);
    }
  }, [activeActivity, round.count, isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextRound = useCallback(() => {
    if (totalRounds + 1 >= MAX_ROUNDS) {
      setIsGameOver(true);
      return;
    }
    setResult(null);
    setMistakesThisRound(0);
    setTotalRounds(t => t + 1);
    setRound(makeRound());
  }, [totalRounds]);

  const handleChoice = useCallback((chosen: number) => {
    const isCorrect = chosen === round.count;
    setResult(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      playDing();
      if (mistakesThisRound === 0) setFirstTryCorrect(s => s + 1);
      setAction('dance');
      setEmotion('joy');
      const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
      processAndSpeak(msg);
      setTimeout(() => {
        setAction('idle');
        setEmotion('neutral');
        nextRound();
      }, 2200);
    } else {
      playCrunch();
      setMistakesThisRound(m => m + 1);
      setAction('shake');
      setEmotion('sad');
      const msg = WRONG_TRIES[Math.floor(Math.random() * WRONG_TRIES.length)];
      processAndSpeak(msg);
      setTimeout(() => {
        setAction('idle');
        setEmotion('neutral');
        setResult(null);
      }, 2000);
    }
  }, [round.count, mistakesThisRound, playDing, playCrunch, setAction, setEmotion, processAndSpeak, nextRound]);

  const handleClose = () => {
    playPop();
    setResult(null);
    setFirstTryCorrect(0);
    setMistakesThisRound(0);
    setTotalRounds(0);
    setIsGameOver(false);
    setRound(makeRound());
    setActiveActivity('none');
  };

  const finishGameAndSaveBadge = () => {
    const badge = firstTryCorrect === MAX_ROUNDS ? 'gold' : firstTryCorrect >= 3 ? 'silver' : 'bronze';
    awardBadge('apples', badge);
    handleClose();
  };

  return (
    <AnimatePresence>
      {activeActivity === 'apples' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
        >
          {isGameOver ? (
            <BadgeAward 
              badge={firstTryCorrect === MAX_ROUNDS ? 'gold' : firstTryCorrect >= 3 ? 'silver' : 'bronze'} 
              gameName="Apple Counting" 
              onClose={finishGameAndSaveBadge} 
            />
          ) : (
            <>
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              className="bg-gradient-to-br from-green-100 to-emerald-200 p-8 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col items-center gap-6 border-8 border-white relative"
            >
              {/* Header */}
              <div className="flex w-full items-center justify-between">
                <h2 className="text-3xl font-extrabold text-emerald-800">🍎 Apple Count!</h2>
                <div className="text-xl font-bold text-emerald-700 bg-white/60 rounded-2xl px-4 py-1">
                  Round {totalRounds + 1} / {MAX_ROUNDS}
                </div>
              </div>

            {/* Apple grid */}
            <motion.div
              key={round.count}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-wrap justify-center gap-3 p-4 bg-white/60 rounded-2xl shadow-inner min-h-[120px] w-full"
            >
              {Array.from({ length: round.count }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.07, type: 'spring', stiffness: 300 }}
                  className="text-5xl select-none"
                >
                  🍎
                </motion.span>
              ))}
            </motion.div>

              {/* Question */}
              <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                How many apples? 👇
              </p>

              {/* Answer buttons */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full">
                {round.choices.map((choice) => {
                  const isCorrect = choice === round.count;
                  let bg = 'bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-900';
                  if (result === 'correct' && isCorrect) bg = 'bg-green-400 border-green-600 text-white';
                  if (result === 'wrong' && isCorrect) bg = 'bg-green-200 border-green-400 text-green-900';

                  return (
                    <motion.button
                      key={choice}
                      whileHover={{ scale: result ? 1 : 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      disabled={result !== null}
                      onClick={() => handleChoice(choice)}
                      className={`text-2xl sm:text-4xl font-extrabold py-3 sm:py-5 rounded-2xl border-4 shadow-[0_5px_0_rgba(0,0,0,0.15)] transition-colors ${bg} disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                      {choice}
                    </motion.button>
                  );
                })}
              </div>

            {/* Result banner */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-2xl font-extrabold rounded-2xl px-8 py-3 ${
                    result === 'correct'
                      ? 'bg-green-400 text-white'
                      : 'bg-orange-300 text-orange-900'
                  }`}
                >
                  {result === 'correct' ? '🎉 Correct! Great counting!' : '🔄 Try again! Count slowly!'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Skip / New round button */}
            <button
              onClick={nextRound}
              className="flex items-center gap-2 text-emerald-700 font-bold text-lg underline underline-offset-4 hover:text-emerald-900 transition-colors"
            >
              <RefreshCw size={20} /> New apples
            </button>
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
