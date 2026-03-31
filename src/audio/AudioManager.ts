/**
 * BOX TRAINER — Audio Manager
 * Handles Web Audio API (bell, beeps) + Speech Synthesis (combo voice)
 */

import type { AudioConfig, PunchNumber } from '@core/types';
import { PUNCH_COMBOS } from '@core/types';

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private italianVoice: SpeechSynthesisVoice | null = null;
  private config: AudioConfig;

  constructor(config: AudioConfig) {
    this.config = config;
    this.initVoice();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize AudioContext (lazy-loaded on first sound)
   */
  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioCtx;
  }

  /**
   * Initialize Speech Synthesis voices
   */
  private initVoice(): void {
    if (!window.speechSynthesis) {
      console.warn('[AudioManager] SpeechSynthesis not supported');
      return;
    }

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      // Prefer Italian, fallback to English or first available
      this.italianVoice =
        voices.find((v) => v.lang.startsWith('it')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0] ||
        null;
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  /**
   * Update audio config
   */
  updateConfig(config: AudioConfig): void {
    this.config = config;
  }

  // ==========================================================================
  // CORE OSCILLATOR (Web Audio API)
  // ==========================================================================

  /**
   * Create single oscillator tone
   */
  private osc(
    freq: number,
    duration: number,
    volume: number = 0.4,
    type: OscillatorType = 'sine',
    delay: number = 0
  ): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + delay;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (error) {
      console.error('[AudioManager] Oscillator error:', error);
    }
  }

  // ==========================================================================
  // SOUND EFFECTS
  // ==========================================================================

  /**
   * Boxing bell (metallic ring with harmonics)
   */
  playBell(): void {
    if (!this.config.bell) return;

    // Layer 1: Rich harmonic mix
    const layer1: [number, number, number][] = [
      [880, 0.5, 2.0],    // A5
      [1320, 0.3, 1.3],   // E6
      [1760, 0.18, 0.9],  // A6
      [440, 0.35, 2.5],   // A4
      [2640, 0.1, 0.6],   // E7
    ];

    layer1.forEach(([freq, vol, dur]) => {
      this.osc(freq, dur, vol);
    });

    // Layer 2: Delayed ring (190ms)
    setTimeout(() => {
      const layer2: [number, number, number][] = [
        [880, 0.35, 1.6],
        [1320, 0.22, 1.0],
        [440, 0.25, 2.0],
      ];

      layer2.forEach(([freq, vol, dur]) => {
        this.osc(freq, dur, vol);
      });
    }, 190);
  }

  /**
   * End bell (triple ring)
   */
  playEndBell(): void {
    if (!this.config.endBell) return;

    this.playBell();
    setTimeout(() => this.playBell(), 360);
    setTimeout(() => this.playBell(), 720);
  }

  /**
   * Warning beep (square wave, urgent tone)
   */
  playWarnBeep(): void {
    if (!this.config.warn) return;
    this.osc(660, 0.09, 0.28, 'square');
  }

  /**
   * Punch number beep (clean sine)
   */
  playPunchBeep(): void {
    if (!this.config.punchBeep) return;
    this.osc(1500, 0.07, 0.18, 'sine');
  }

  // ==========================================================================
  // SPEECH SYNTHESIS
  // ==========================================================================

  /**
   * Speak combo name via TTS
   */
  speak(number: PunchNumber): void {
    if (!this.config.voice || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const combo = PUNCH_COMBOS[number];
    const utterance = new SpeechSynthesisUtterance(combo.voiceText);

    utterance.lang = 'it-IT';
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.volume = 1;

    if (this.italianVoice) {
      utterance.voice = this.italianVoice;
    }

    speechSynthesis.speak(utterance);
  }

  /**
   * Stop all ongoing speech
   */
  stopSpeech(): void {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clean up audio resources
   */
  dispose(): void {
    this.stopSpeech();

    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
