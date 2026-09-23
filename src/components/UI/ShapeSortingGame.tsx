'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useAudioEffects } from '@/hooks/useAudioEffects';
import { useVoice } from '@/context/VoiceContext';
import { X } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
type ShapeType = 'circle' | 'triangle' | 'square' | 'star';

interface ShapeItem {
  id: number;
  type: ShapeType;
  color: string;
  posX: number; // % from left
  posY: number; // % from top
  sorted: boolean;
  wrongKey: number; // incrementing remounts the draggable → resets position
}

interface LevelConfig {
  target: ShapeType;
  targetLabel: string;
  targetEmoji: string;
  previewColor: string;
  shapes: { type: ShapeType; color: string }[];
}

// ─── Palette ───────────────────────────────────────────────────────────────
const C = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  yellow: '#eab308',
  green:  '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  pink:   '#ec4899',
  cyan:   '#06b6d4',
};

// Well-spaced scatter grid (% left, % top within play area)
const GRID: [number, number][] = [
  [5, 12], [24, 8],  [44, 14], [64, 10],
  [5, 45], [24, 50], [44, 46], [64, 48],
  [12,76], [32, 72], [52, 78], [72, 72],
];

// ─── Level data ────────────────────────────────────────────────────────────
const LEVELS: LevelConfig[] = [
  {
    target: 'circle', targetLabel: 'circles', targetEmoji: '⭕', previewColor: C.blue,
    shapes: [
      { type: 'circle',   color: C.blue   },
      { type: 'circle',   color: C.red    },
      { type: 'triangle', color: C.yellow },
      { type: 'square',   color: C.green  },
      { type: 'triangle', color: C.orange },
      { type: 'square',   color: C.purple },
    ],
  },
  {
    target: 'triangle', targetLabel: 'triangles', targetEmoji: '🔺', previewColor: C.orange,
    shapes: [
      { type: 'triangle', color: C.red    },
      { type: 'triangle', color: C.orange },
      { type: 'triangle', color: C.yellow },
      { type: 'circle',   color: C.blue   },
      { type: 'square',   color: C.green  },
      { type: 'star',     color: C.purple },
      { type: 'circle',   color: C.pink   },
    ],
  },
  {
    target: 'square', targetLabel: 'squares', targetEmoji: '🟦', previewColor: C.green,
    shapes: [
      { type: 'square',   color: C.blue   },
      { type: 'square',   color: C.green  },
      { type: 'square',   color: C.purple },
      { type: 'circle',   color: C.yellow },
      { type: 'triangle', color: C.orange },
      { type: 'star',     color: C.red    },
      { type: 'circle',   color: C.cyan   },
      { type: 'triangle', color: C.pink   },
    ],
  },
  {
    target: 'star', targetLabel: 'stars', targetEmoji: '⭐', previewColor: C.yellow,
    shapes: [
      { type: 'star',     color: C.yellow },
      { type: 'star',     color: C.orange },
      { type: 'star',     color: C.pink   },
      { type: 'circle',   color: C.blue   },
      { type: 'square',   color: C.green  },
      { type: 'triangle', color: C.purple },
      { type: 'circle',   color: C.cyan   },
      { type: 'triangle', color: C.red    },
    ],
  },
];

// ─── SVG Shape Renderer ────────────────────────────────────────────────────
const ShapeSVG = ({
  type,
  color,
  size = 72,
}: {
  type: ShapeType;
  color: string;
  size?: number;
}) => {
  const h = size;
  const hh = size / 2;

  if (type === 'circle') {
    return (
      <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`}>
        <circle cx={hh} cy={hh} r={hh - 5} fill={color} stroke="white" strokeWidth="5" />
      </svg>
    );
  }

  if (type === 'square') {
    return (
      <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`}>
        <rect
          x="6" y="6"
          width={h - 12} height={h - 12}
          rx="10"
          fill={color} stroke="white" strokeWidth="5"
        />
      </svg>
    );
  }

  if (type === 'triangle') {
    return (
      <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`}>
        <polygon
          points={`${hh},6 ${h - 6},${h - 6} 6,${h - 6}`}
          fill={color} stroke="white" strokeWidth="5" strokeLinejoin="round"
        />
      </svg>
    );
  }

  // star
  const r1 = hh - 5;
  const r2 = hh * 0.4;
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    return `${(hh + r * Math.cos(a)).toFixed(2)},${(hh + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

  return (
    <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`}>
      <polygon
        points={pts}
        fill={color} stroke="white" strokeWidth="5" strokeLinejoin="round"
      />
    </svg>
  );
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function buildShapes(level: LevelConfig): ShapeItem[] {
  const shuffledPos = [...GRID].sort(() => Math.random() - 0.5);
  return level.shapes.map((s, i) => ({
    id: i,
    type: s.type,
    color: s.color,
    posX: shuffledPos[i][0],
    posY: shuffledPos[i][1],
    sorted: false,
    wrongKey: 0,
  }));
}

// ─── Dialogue ──────────────────────────────────────────────────────────────
const CORRECT_MSGS = [
  "[JOY][BOUNCE] Yes! That shape goes in! Great sorting! 🎉",
  "[JOY][GIGGLE] Perfect match! You found it! ⭐",
  "[SURPRISE][BOUNCE] Whoosh! In it goes! Wonderful! 🌟",
  "[JOY][DANCE] Nice! Keep going — you're amazing! 💫",
];

const WRONG_MSGS = [
  "[NEUTRAL][NOD] Oops! That's not the right shape! Look for the matching ones!",
  "[NEUTRAL][SHAKE] Not quite! We need a different shape — look carefully!",
  "[SAD][NOD] Try again! Only the matching shapes go in the box!",
];

const LEVEL_COMPLETE_MSGS = [
  "[JOY][DANCE] Amazing! You sorted them ALL! You are a SUPER sorter! 🏆",
  "[SURPRISE][DANCE] WOW! Level complete! You did it so fast! ⭐⭐⭐",
  "[JOY][BOUNCE] YIPPEE! All done! Ready for the next challenge? 🎊",
];

// ─── Component ─────────────────────────────────────────────────────────────
import { BadgeAward } from './BadgeAward';

export const ShapeSortingGame = () => {
  const { activeActivity, setActiveActivity, setAction, setEmotion, awardBadge } = useStore();
  const { playDing, playPop, playCrunch } = useAudioEffects();
  const { processAndSpeak } = useVoice();

  const [levelIndex, setLevelIndex] = useState(0);
  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [levelComplete, setLevelComplete] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const dropZoneRef = useRef<HTMLDivElement>(null);
  // Ref so onDragEnd closures always see fresh shape data
  const shapesRef = useRef<ShapeItem[]>([]);
  const currentLevelRef = useRef<LevelConfig>(LEVELS[0]);

  const currentLevel = LEVELS[levelIndex % LEVELS.length];
  const targetCount = currentLevel.shapes.filter(s => s.type === currentLevel.target).length;
  const sortedCount = shapes.filter(s => s.sorted && s.type === currentLevel.target).length;

  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { currentLevelRef.current = currentLevel; }, [currentLevel]);

  // ── Start / reset a level ──────────────────────────────────────────────
  useEffect(() => {
    if (activeActivity !== 'shapes' || isGameOver) return;
    const lv = LEVELS[levelIndex % LEVELS.length];
    setShapes(buildShapes(lv));
    setLevelComplete(false);
    setTimeout(() => {
      processAndSpeak(
        `[SURPRISE][NOD] Shape sorting time! ${lv.targetEmoji} Drag all the ${lv.targetLabel} into the box! Let's go!`
      );
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeActivity, levelIndex, isGameOver]);

  // ── Check for level completion ─────────────────────────────────────────
  useEffect(() => {
    if (shapes.length === 0 || levelComplete) return;
    const sorted = shapes.filter(s => s.sorted && s.type === currentLevelRef.current.target).length;
    const total  = currentLevelRef.current.shapes.filter(s => s.type === currentLevelRef.current.target).length;
    if (total > 0 && sorted === total) {
      setLevelComplete(true);
      setAction('dance');
      setEmotion('joy');
      playDing();
      processAndSpeak(LEVEL_COMPLETE_MSGS[Math.floor(Math.random() * LEVEL_COMPLETE_MSGS.length)]);
      setTimeout(() => { setAction('idle'); setEmotion('neutral'); }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes]);

  // ── Drag end handler ───────────────────────────────────────────────────
  const handleDragEnd = useCallback((
    shapeId: number,
    event: MouseEvent | TouchEvent | PointerEvent,
    _info: PanInfo,
  ) => {
    const dz = dropZoneRef.current;
    if (!dz) return;
    const rect = dz.getBoundingClientRect();

    // Robust client-coordinate extraction for mouse / pointer / touch
    let cx = 0, cy = 0;
    if ('clientX' in event) {
      cx = (event as MouseEvent).clientX;
      cy = (event as MouseEvent).clientY;
    } else {
      const touch = (event as TouchEvent).changedTouches?.[0];
      if (touch) { cx = touch.clientX; cy = touch.clientY; }
    }

    const inZone =
      cx >= rect.left && cx <= rect.right &&
      cy >= rect.top  && cy <= rect.bottom;

    const shape = shapesRef.current.find(s => s.id === shapeId);
    if (!shape || shape.sorted) return;

    if (!inZone) return; // dropped outside drop zone — do nothing

    const lv = currentLevelRef.current;
    if (shape.type === lv.target) {
      // ✅ Correct shape
      playDing();
      setTotalScore(sc => sc + 1);
      setShapes(prev => prev.map(s => s.id === shapeId ? { ...s, sorted: true } : s));
      processAndSpeak(CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)]);
    } else {
      // ❌ Wrong shape — increment wrongKey to remount draggable at origin
      playCrunch();
      setTotalMistakes(m => m + 1);
      setShapes(prev => prev.map(s => s.id === shapeId ? { ...s, wrongKey: s.wrongKey + 1 } : s));
      processAndSpeak(WRONG_MSGS[Math.floor(Math.random() * WRONG_MSGS.length)]);
    }
  }, [playDing, playCrunch, processAndSpeak]);

  const nextLevel = () => {
    playPop();
    if (levelIndex + 1 >= LEVELS.length) {
      setIsGameOver(true);
    } else {
      setLevelIndex(i => i + 1);
    }
  };

  const handleClose = () => {
    playPop();
    setLevelIndex(0);
    setTotalScore(0);
    setTotalMistakes(0);
    setIsGameOver(false);
    setLevelComplete(false);
    setShapes([]);
    setAction('idle');
    setEmotion('neutral');
    setActiveActivity('none');
  };

  const finishGameAndSaveBadge = () => {
    // gold = 0-2 mistakes, silver = 3-6 mistakes, bronze = 7+ mistakes
    const badge = totalMistakes <= 2 ? 'gold' : totalMistakes <= 6 ? 'silver' : 'bronze';
    awardBadge('shapes', badge);
    handleClose();
  };

  return (
    <AnimatePresence>
      {activeActivity === 'shapes' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 55%, #f3e8ff 100%)',
          }}
        >
          {isGameOver ? (
            <BadgeAward 
              badge={totalMistakes <= 2 ? 'gold' : totalMistakes <= 6 ? 'silver' : 'bronze'} 
              gameName="Shape Sorting" 
              onClose={finishGameAndSaveBadge} 
            />
          ) : (
            <>
              {/* ── Instruction Banner ── */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-white/90 rounded-3xl px-8 py-3 shadow-lg border-4 border-indigo-300 text-center">
              <p className="text-xl font-extrabold text-indigo-800 whitespace-nowrap">
                {currentLevel.targetEmoji} Drag all{' '}
                <span className="text-indigo-600 capitalize">{currentLevel.targetLabel}</span>{' '}
                into the box!
              </p>
              <p className="text-sm font-bold text-indigo-400 mt-0.5">
                {sortedCount} / {targetCount} sorted &nbsp;·&nbsp; ⭐ {totalScore} points
              </p>
            </div>
          </div>

          {/* ── Level badge ── */}
          <div className="absolute top-3 left-4 z-20 bg-indigo-500 text-white font-extrabold text-sm px-4 py-2 rounded-2xl shadow">
            Level {levelIndex + 1}
          </div>

          {/* ── Drop Zone ── */}
          <motion.div
            ref={dropZoneRef}
            animate={{ boxShadow: sortedCount > 0 ? '0 0 0 4px #818cf8, inset 0 0 20px rgba(129,140,248,0.3)' : 'none' }}
            className="absolute top-24 right-2 sm:right-5 w-32 sm:w-48 h-40 sm:h-52 z-20 rounded-3xl flex flex-col items-center justify-start pt-3 gap-1"
            style={{
              background: 'rgba(255,255,255,0.75)',
              border: '5px dashed #818cf8',
              backdropFilter: 'blur(4px)',
            }}
          >
            <p className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest text-center">
              Drop here
            </p>
            <div className="scale-75 sm:scale-100 origin-top">
              <ShapeSVG type={currentLevel.target} color={currentLevel.previewColor} size={42} />
            </div>
            <p className="text-[10px] font-bold text-indigo-300 text-center">{currentLevel.targetLabel} only!</p>
            {/* Mini sorted shapes collected inside box */}
            <div className="flex flex-wrap gap-0.5 justify-center px-2 mt-1">
              {shapes.filter(s => s.sorted).map(s => (
                <motion.div
                  key={s.id}
                  initial={{ scale: 0, rotate: 20 }}
                  animate={{ scale: 0.35, rotate: 0 }}
                  className="origin-center"
                >
                  <ShapeSVG type={s.type} color={s.color} size={56} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Shape play area ── */}
          {shapes.map(shape =>
            !shape.sorted && (
              <motion.div
                /*
                 * Changing wrongKey forces React to UNMOUNT + REMOUNT this node,
                 * which resets Framer Motion's internal drag transform → shape
                 * snaps back to its absolute CSS position instantly.
                 */
                key={`${shape.id}-${shape.wrongKey}`}
                drag
                dragMomentum={false}
                initial={{
                  scale: shape.wrongKey > 0 ? 1 : 0,
                  rotate: shape.wrongKey > 0 ? 0 : Math.random() * 24 - 12,
                }}
                animate={{ scale: 1, rotate: 0 }}
                whileDrag={{ scale: 1.3, zIndex: 100, cursor: 'grabbing' }}
                whileHover={{ scale: 1.12 }}
                onDragEnd={(e, info) =>
                  handleDragEnd(
                    shape.id,
                    e as unknown as MouseEvent | TouchEvent | PointerEvent,
                    info,
                  )
                }
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                style={{
                  position: 'absolute',
                  left: `${shape.posX}%`,
                  top: `${shape.posY + 12}%`, // nudge down so shapes clear the header
                  touchAction: 'none',
                  userSelect: 'none',
                  zIndex: 10,
                  cursor: 'grab',
                }}
                className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.22)]"
              >
                <div className="scale-[0.8] sm:scale-100 origin-center">
                  <ShapeSVG type={shape.type} color={shape.color} size={76} />
                </div>
              </motion.div>
            )
          )}

          {/* ── Level Complete overlay ── */}
          <AnimatePresence>
            {levelComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white rounded-3xl p-10 flex flex-col items-center gap-5 border-8 border-yellow-400 shadow-2xl max-w-sm w-full mx-4"
                >
                  <p className="text-7xl">🏆</p>
                  <h2 className="text-4xl font-extrabold text-indigo-800 text-center">
                    Level {levelIndex + 1} Done!
                  </h2>
                  <p className="text-lg font-bold text-indigo-600 text-center">
                    You sorted all the {currentLevel.targetLabel}!<br />
                    ⭐ Total score: {totalScore}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextLevel}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white text-xl font-extrabold py-4 px-10 rounded-2xl shadow-[0_6px_0_#3730a3] hover:-translate-y-1 transition-all border-4 border-indigo-700"
                  >
                    Next Level →
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

              {/* ── Close ── */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-4 p-3 bg-white text-gray-800 rounded-full shadow-lg z-50 hover:bg-gray-100 active:scale-95 transition-transform"
              >
                <X size={26} />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
