/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useStore, Emotion, Action } from '@/store/useStore';

// Prevent double-init in React StrictMode or dual component mounts
let globalRecognitionStarted = false;

export const useVoiceAgent = () => {
  const {
    setEmotion,
    setAction,
    setIsSpeaking,
    setSpeechText,
    isSpeaking,
  } = useStore();

  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<{ role: string; content: string }[]>([]);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  // Holds the boosted MediaStream so we can keep it alive
  const boostedStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ─── Audio Input Booster ─────────────────────────────────────────────────
  // Gets a noise-suppressed, echo-cancelled mic stream and amplifies it
  // via a GainNode so SpeechRecognition hears the loudest voice in the room.
  const getBoostedStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      // Ask for best-quality, processed audio from the browser
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,     // Filter out background hiss/hum
          echoCancellation: true,     // Don't hear Zora's own voice
          autoGainControl: true,      // Let browser normalise input level
          channelCount: 1,            // Mono is all we need
          sampleRate: 16000,          // Good for speech recognition
        },
      });

      // Create AudioContext + gain node to further amplify the voice
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(rawStream);

      // Amplify input by ~3× so a voice across a noisy room still registers
      const gainNode = ctx.createGain();
      gainNode.gain.value = 3.0;

      // Destination that produces a new processed MediaStream
      const destination = ctx.createMediaStreamDestination();

      source.connect(gainNode);
      gainNode.connect(destination);

      boostedStreamRef.current = destination.stream;
      return destination.stream;
    } catch (err) {
      console.warn('Could not get boosted audio stream, falling back to default:', err);
      return null;
    }
  }, []);

  // ─── Mirror speaking state into ref (used inside closures) ───────────────
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    if (isSpeaking) {
      safePause();
    } else {
      safeStart();
    }
  }, [isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeStart = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current || isSpeakingRef.current) return;
    try {
      // Pass the boosted stream if available (Chrome supports this)
      if (boostedStreamRef.current) {
        recognitionRef.current.start(boostedStreamRef.current);
      } else {
        recognitionRef.current.start();
      }
    } catch {
      // Already started — ignore
    }
  }, []);

  const safePause = useCallback(() => {
    if (!recognitionRef.current || !isListeningRef.current) return;
    try {
      recognitionRef.current.abort();
    } catch { /* ignore */ }
  }, []);

  const workerRef = useRef<Worker | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    try {
      // Initialize Web Worker for AI Voice
      workerRef.current = new Worker(new URL('../workers/ttsWorker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        if (e.data.status === 'complete') {
          playAIAudio(e.data.audio, e.data.sampling_rate);
        } else if (e.data.status === 'error') {
          console.error('TTS Worker Error:', e.data.error);
          setIsSpeaking(false);
        }
      };
    } catch (err) {
      console.warn('Could not initialize TTS Web Worker (Turbopack limitation). Falling back.', err);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const playAIAudio = useCallback((audioData: Float32Array, sampleRate: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate });
    }
    const ctx = audioCtxRef.current;

    const buffer = ctx.createBuffer(1, audioData.length, sampleRate);
    buffer.copyToChannel(new Float32Array(audioData), 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Playback rate 1.25 makes the standard female embedding sound like a young child
    source.playbackRate.value = 1.25; 
    
    source.connect(ctx.destination);
    
    source.onended = () => {
      setIsSpeaking(false);
      setAction('idle');
      setEmotion('neutral');
    };

    if (playbackSourceRef.current) {
      playbackSourceRef.current.stop();
    }
    
    playbackSourceRef.current = source;
    source.start(0);
  }, [setIsSpeaking, setAction, setEmotion]);

  // ─── Text-to-Speech ───────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!text) return;
    
    // AI Worker Voice
    if (workerRef.current) {
      if (playbackSourceRef.current) {
        playbackSourceRef.current.stop();
      }
      setIsSpeaking(true);
      workerRef.current.postMessage({ text });
      return;
    }

    // Fallback: OS Voice
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Try to find a naturally higher-pitched or childlike voice first, fallback to standard female
    const preferredVoice = voices.find(
      (v) => v.name.includes('Zira') || v.name.includes('Tessa') || v.name.includes('Samantha') || v.name.includes('Female') || v.name.includes('Girl')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    // A high pitch (1.8 - 2.0) with a slightly faster rate makes it sound like a cheerful young child
    utterance.pitch = 1.9;
    utterance.rate = 1.15;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setAction('idle');
      setEmotion('neutral');
    };
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [setIsSpeaking, setAction, setEmotion]);

  // ─── Parse LLM response tags + speak ─────────────────────────────────────
  const processAndSpeak = useCallback((text: string) => {
    let emotion: Emotion = 'neutral';
    let action: Action = 'idle';
    let cleanText = text;

    const emotionMatch = cleanText.match(/\[(.*?)\]/);
    if (emotionMatch) {
      const e = emotionMatch[1].toLowerCase();
      if (['neutral', 'joy', 'surprise', 'sad', 'eating', 'sleeping'].includes(e)) {
        emotion = e as Emotion;
      }
      cleanText = cleanText.replace(`[${emotionMatch[1]}]`, '');
    }

    const actionMatch = cleanText.match(/\[(.*?)\]/);
    if (actionMatch) {
      const a = actionMatch[1].toLowerCase();
      if (['idle', 'dance', 'giggle', 'nod', 'shake', 'bounce'].includes(a)) {
        action = a as Action;
      }
      cleanText = cleanText.replace(`[${actionMatch[1]}]`, '');
    }

    cleanText = cleanText.trim();
    setEmotion(emotion);
    setAction(action);
    setSpeechText(cleanText);
    speak(cleanText);
  }, [setEmotion, setAction, setSpeechText, speak]);

  // ─── Send transcript to LLM ───────────────────────────────────────────────
  const handleSpeechInput = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    setSpeechText(transcript);

    const newMessages = [...messagesRef.current, { role: 'user', content: transcript }];
    messagesRef.current = newMessages;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      let responseText = '';

      // Streaming plain-text response
      if (res.headers.get('content-type')?.includes('text/plain')) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            responseText += decoder.decode(value, { stream: true });
          }
        }
      } else {
        const data = await res.json();
        responseText = data.text ?? '';
      }

      if (responseText) {
        messagesRef.current = [...messagesRef.current, { role: 'assistant', content: responseText }];
        processAndSpeak(responseText);
      }
    } catch (error) {
      console.warn('Chat API error:', error);
      processAndSpeak('[SAD][SHAKE] Oops! I had a little trouble thinking. Can you say that again?');
    }
  }, [setSpeechText, processAndSpeak]);

  // ─── Init SpeechRecognition ────────────────────────────────────────────────
  const initRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('SpeechRecognition not supported.');
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => { isListeningRef.current = true; };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript.trim()) handleSpeechInput(transcript);
    };

    recognition.onerror = (event: any) => {
      isListeningRef.current = false;
      if (event.error === 'not-allowed') {
        // Mic permission denied — stop trying entirely, don't loop
        console.warn('Microphone permission denied. Voice input disabled.');
        recognition.onend = null; // Prevent restart
        return;
      }
      if (event.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', event.error);
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      // Always-on: restart automatically unless Zora is speaking
      if (!isSpeakingRef.current) {
        setTimeout(() => safeStart(), 300);
      }
    };
  }, [handleSpeechInput, safeStart]);

  // ─── Mount: start the boosted always-on mic loop ──────────────────────────
  useEffect(() => {
    if (globalRecognitionStarted) return;
    globalRecognitionStarted = true;

    initRecognition();

    const tryStart = async () => {
      // Get the boosted stream first, then start recognition
      await getBoostedStream();
      safeStart();
    };

    // Try immediately (works if page already has mic permission)
    tryStart();
    // Also hook into first user click as a permission fallback
    window.addEventListener('click', tryStart, { once: true });

    return () => {
      globalRecognitionStarted = false;
      window.removeEventListener('click', tryStart);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
      // Clean up AudioContext
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { processAndSpeak };
};
