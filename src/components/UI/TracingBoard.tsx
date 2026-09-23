'use client';

import { useStore } from '@/store/useStore';
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Eraser, Loader2 } from 'lucide-react';
import { useAudioEffects } from '@/hooks/useAudioEffects';
import { useVoice } from '@/context/VoiceContext';
import Tesseract from 'tesseract.js';

export const TracingBoard = () => {
  const { activeActivity, setActiveActivity } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const { playDing, playPop } = useAudioEffects();
  const { processAndSpeak } = useVoice();

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill white background for better OCR
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'black';
  };

  useEffect(() => {
    if (activeActivity !== 'tracing' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Set internal canvas resolution (higher for better OCR)
    canvas.width = 1000;
    canvas.height = 400;
    
    initCanvas();
  }, [activeActivity]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    } else {
      x = ((e as React.MouseEvent).clientX - rect.left) * (canvas.width / rect.width);
      y = ((e as React.MouseEvent).clientY - rect.top) * (canvas.height / rect.height);
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    playPop();
    initCanvas();
  };

  const handleRecognizeAndSpeak = async () => {
    if (!canvasRef.current) return;
    playDing();
    setIsRecognizing(true);
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      
      const text = result.data.text.trim();
      console.log('Recognized text:', text);
      
      if (text.length > 0) {
        processAndSpeak(text);
        setActiveActivity('none'); // Close when done
      } else {
        processAndSpeak("I couldn't quite read that. Can you write it a bit clearer?");
      }
    } catch (error) {
      console.error(error);
      processAndSpeak("Oops! My eyes are a little blurry today.");
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <AnimatePresence>
      {activeActivity === 'tracing' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-amber-100 p-4 sm:p-8 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col gap-4 sm:gap-6 relative border-4 sm:border-8 border-white"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 text-center">Handwrite something!</h2>
            
            <div className="relative rounded-2xl overflow-hidden border-4 sm:border-8 border-gray-400 shadow-inner bg-white">
              <canvas
                ref={canvasRef}
                className="w-full h-auto touch-none cursor-crosshair"
                style={{ aspectRatio: '1000 / 400', cursor: 'url(https://cdn-icons-png.flaticon.com/32/3843/3843070.png) 0 32, crosshair' }}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
              />
            </div>
            
            <div className="flex gap-2 sm:gap-4 justify-center">
              <button 
                onClick={clearCanvas}
                className="bg-rose-500 hover:bg-rose-400 text-white text-lg sm:text-2xl font-bold py-3 px-4 sm:py-4 sm:px-8 rounded-2xl shadow-[0_4px_0_#be123c] sm:shadow-[0_6px_0_#be123c] hover:-translate-y-1 transition-all flex items-center gap-2 sm:gap-3 border-4 border-rose-600"
              >
                Clear <Eraser size={24} className="sm:w-8 sm:h-8" />
              </button>

              <button 
                onClick={handleRecognizeAndSpeak}
                disabled={isRecognizing}
                className="bg-sky-500 hover:bg-sky-400 disabled:bg-sky-400 disabled:cursor-not-allowed text-white text-lg sm:text-2xl font-bold py-3 px-6 sm:py-4 sm:px-12 rounded-2xl shadow-[0_4px_0_#0284c7] sm:shadow-[0_6px_0_#0284c7] hover:-translate-y-1 transition-all flex items-center gap-2 sm:gap-3 border-4 border-sky-600"
              >
                {isRecognizing ? 'Reading...' : 'Speak!'} 
                {isRecognizing ? <Loader2 size={24} className="animate-spin sm:w-8 sm:h-8" /> : <Volume2 size={24} className="sm:w-8 sm:h-8" />}
              </button>
            </div>
          </motion.div>

          <button 
            onClick={() => { playPop(); setActiveActivity('none'); }}
            className="absolute top-6 right-6 p-4 bg-white text-gray-800 rounded-full shadow-lg z-40 hover:bg-gray-100 active:scale-95 transition-transform"
          >
            <X size={32} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
