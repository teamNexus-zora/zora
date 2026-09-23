'use client';

import { useCallback, useRef, useEffect } from 'react';

export const useAudioEffects = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize lazily to respect browser autoplay policies
    const initAudio = () => {
      if (!audioCtx.current) {
        const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
        audioCtx.current = new AudioContext();
      }
    };
    
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playPop = useCallback(() => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(1.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  const playDing = useCallback(() => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6

    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  const playCrunch = useCallback(() => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }, []);

  const playDrum = useCallback(() => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(2.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  // ── Cheerful dance music — synthesized glockenspiel melody ────────────────
  // Plays a looping "Happy" style tune for exactly `duration` seconds using
  // the Web Audio API. Returns a stop() function to cut it early if needed.
  const playDanceMusic = useCallback((duration = 12) => {
    if (!audioCtx.current) return () => {};
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    // C-major pentatonic notes (Hz): C5 D5 E5 G5 A5 C6
    const NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    // A cheerful repeating melody pattern (indices into NOTES)
    const MELODY = [0, 2, 4, 5, 4, 2, 1, 0, 2, 4, 3, 2, 0, 1, 2, 0];
    const BPM = 160;
    const BEAT = 60 / BPM;            // seconds per beat
    const NOTE_LEN = BEAT * 0.45;     // note duration (staccato)

    const allNodes: AudioScheduledSourceNode[] = [];
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.55, ctx.currentTime);
    // Fade out in last 0.8 s
    masterGain.gain.setValueAtTime(0.55, ctx.currentTime + duration - 0.8);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    masterGain.connect(ctx.destination);

    // Schedule notes for the whole duration
    const totalBeats = Math.floor(duration / BEAT);
    for (let i = 0; i < totalBeats; i++) {
      const noteIndex = MELODY[i % MELODY.length];
      const freq = NOTES[noteIndex];
      const t = ctx.currentTime + i * BEAT;

      // Main tone (triangle = soft, bell-like)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      // Harmonic overtone for sparkle
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, t);

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, t);
      noteGain.gain.linearRampToValueAtTime(1, t + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + NOTE_LEN);

      const noteGain2 = ctx.createGain();
      noteGain2.gain.setValueAtTime(0, t);
      noteGain2.gain.linearRampToValueAtTime(0.3, t + 0.01);
      noteGain2.gain.exponentialRampToValueAtTime(0.001, t + NOTE_LEN * 0.6);

      osc.connect(noteGain);
      osc2.connect(noteGain2);
      noteGain.connect(masterGain);
      noteGain2.connect(masterGain);

      osc.start(t);
      osc.stop(t + NOTE_LEN);
      osc2.start(t);
      osc2.stop(t + NOTE_LEN * 0.6);

      allNodes.push(osc, osc2);

      // Add a light kick on every 4th beat for rhythm
      if (i % 4 === 0) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(120, t);
        kick.frequency.exponentialRampToValueAtTime(0.01, t + 0.18);

        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.7, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        kick.connect(kickGain);
        kickGain.connect(masterGain);
        kick.start(t);
        kick.stop(t + 0.18);
        allNodes.push(kick);
      }
    }

    // Return a stop function
    return () => {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      allNodes.forEach((n) => { try { n.stop(ctx.currentTime + 0.1); } catch { /* already stopped */ } });
    };
  }, []);

  return { playPop, playDing, playCrunch, playDrum, playDanceMusic };
};
