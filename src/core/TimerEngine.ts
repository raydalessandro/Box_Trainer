/**
 * BOX TRAINER — Timer Engine
 * Core state machine: IDLE → WORK → REST → DONE
 */

import type { TrainingState, WorkoutConfig, TimerIds, PunchNumber } from './types';
import { AudioManager } from '@audio/AudioManager';

type TimerCallback = () => void;
type TimeUpdateCallback = (timeLeft: number) => void;
type StateChangeCallback = (state: TrainingState) => void;
type RoundChangeCallback = (currentRound: number) => void;
type PunchDisplayCallback = (number: PunchNumber) => void;

export class TimerEngine {
  private config: WorkoutConfig;
  private audio: AudioManager;

  // State
  private state: TrainingState = 'idle';
  private currentRound: number = 1;
  private timeLeft: number = 0;
  private restLeft: number = 0;

  // Timer IDs
  private timers: TimerIds = {
    round: null,
    number: null,
    rest: null,
    delay: null,
  };

  // Punch tracking
  private lastPunch: PunchNumber | null = null;
  private punchesShown: number = 0;

  // Callbacks
  private callbacks: {
    onTick?: TimeUpdateCallback;
    onStateChange?: StateChangeCallback;
    onRoundChange?: RoundChangeCallback;
    onPunchDisplay?: PunchDisplayCallback;
    onComplete?: TimerCallback;
  } = {};

  constructor(config: WorkoutConfig) {
    this.config = config;
    this.audio = new AudioManager(config.audio);
    this.timeLeft = config.roundDuration;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Start training session
   */
  start(): void {
    if (this.state !== 'idle') {
      this.stop();
    }

    this.currentRound = 1;
    this.punchesShown = 0;
    this.startRound();
  }

  /**
   * Stop current session
   */
  stop(): void {
    this.clearAllTimers();
    this.audio.stopSpeech();
    this.state = 'idle';
    this.timeLeft = this.config.roundDuration;
    this.callbacks.onStateChange?.(this.state);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.stop();
    this.currentRound = 1;
    this.punchesShown = 0;
    this.lastPunch = null;
    this.callbacks.onRoundChange?.(this.currentRound);
  }

  /**
   * Update configuration
   */
  updateConfig(config: WorkoutConfig): void {
    this.config = config;
    this.audio.updateConfig(config.audio);

    if (this.state === 'idle') {
      this.timeLeft = config.roundDuration;
    }
  }

  /**
   * Get current state
   */
  getState(): {
    state: TrainingState;
    currentRound: number;
    totalRounds: number;
    timeLeft: number;
    punchesShown: number;
  } {
    return {
      state: this.state,
      currentRound: this.currentRound,
      totalRounds: this.config.rounds,
      timeLeft: this.timeLeft,
      punchesShown: this.punchesShown,
    };
  }

  // ==========================================================================
  // CALLBACKS
  // ==========================================================================

  onTick(callback: TimeUpdateCallback): void {
    this.callbacks.onTick = callback;
  }

  onStateChange(callback: StateChangeCallback): void {
    this.callbacks.onStateChange = callback;
  }

  onRoundChange(callback: RoundChangeCallback): void {
    this.callbacks.onRoundChange = callback;
  }

  onPunchDisplay(callback: PunchDisplayCallback): void {
    this.callbacks.onPunchDisplay = callback;
  }

  onComplete(callback: TimerCallback): void {
    this.callbacks.onComplete = callback;
  }

  // ==========================================================================
  // INTERNAL LOGIC
  // ==========================================================================

  /**
   * Start a work round
   */
  private startRound(): void {
    if (this.currentRound > this.config.rounds) {
      this.endWorkout();
      return;
    }

    this.state = 'work';
    this.timeLeft = this.config.roundDuration;

    this.callbacks.onStateChange?.(this.state);
    this.callbacks.onRoundChange?.(this.currentRound);
    this.callbacks.onTick?.(this.timeLeft);

    // Play start bell
    this.audio.playBell();

    // Schedule first punch display after 1.5s
    this.timers.delay = window.setTimeout(() => {
      this.showPunch();

      // Then show punch every numberInterval
      this.timers.number = window.setInterval(() => {
        this.showPunch();
      }, this.config.numberInterval * 1000);
    }, 1500);

    // Start round countdown
    this.timers.round = window.setInterval(() => {
      this.timeLeft--;
      this.callbacks.onTick?.(this.timeLeft);

      // Warning at 10s mark
      if (this.timeLeft === 10) {
        this.callbacks.onStateChange?.('work'); // Trigger "urgent" UI state
      }

      // Warning beeps last 10s
      if (this.timeLeft <= 10 && this.timeLeft > 0) {
        this.audio.playWarnBeep();
      }

      // Round complete
      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  /**
   * End current round
   */
  private endRound(): void {
    this.clearRoundTimers();
    this.audio.playEndBell();

    this.currentRound++;

    if (this.currentRound > this.config.rounds) {
      setTimeout(() => this.endWorkout(), 800);
    } else {
      setTimeout(() => this.startRest(), 700);
    }
  }

  /**
   * Start rest period
   */
  private startRest(): void {
    this.state = 'rest';
    this.restLeft = this.config.restDuration;

    this.callbacks.onStateChange?.(this.state);
    this.callbacks.onTick?.(this.restLeft);

    this.timers.rest = window.setInterval(() => {
      this.restLeft--;
      this.callbacks.onTick?.(this.restLeft);

      // Warning beeps last 3s
      if (this.restLeft <= 3 && this.restLeft > 0) {
        this.audio.playWarnBeep();
      }

      // Rest complete
      if (this.restLeft <= 0) {
        this.clearRestTimers();
        this.startRound();
      }
    }, 1000);
  }

  /**
   * End entire workout
   */
  private endWorkout(): void {
    this.state = 'done';
    this.clearAllTimers();

    this.callbacks.onStateChange?.(this.state);
    this.callbacks.onComplete?.();

    // Victory bells
    this.audio.playBell();
    setTimeout(() => this.audio.playBell(), 350);
    setTimeout(() => this.audio.playBell(), 700);
  }

  /**
   * Display random punch combination
   */
  private showPunch(): void {
    let punch: PunchNumber;

    // Prevent repeat (75% of the time)
    do {
      punch = (Math.floor(Math.random() * 6) + 1) as PunchNumber;
    } while (punch === this.lastPunch && Math.random() > 0.25);

    this.lastPunch = punch;
    this.punchesShown++;

    this.callbacks.onPunchDisplay?.(punch);
    this.audio.playPunchBeep();
    this.audio.speak(punch);
  }

  // ==========================================================================
  // TIMER CLEANUP
  // ==========================================================================

  private clearRoundTimers(): void {
    if (this.timers.round !== null) {
      clearInterval(this.timers.round);
      this.timers.round = null;
    }

    if (this.timers.number !== null) {
      clearInterval(this.timers.number);
      this.timers.number = null;
    }

    if (this.timers.delay !== null) {
      clearTimeout(this.timers.delay);
      this.timers.delay = null;
    }
  }

  private clearRestTimers(): void {
    if (this.timers.rest !== null) {
      clearInterval(this.timers.rest);
      this.timers.rest = null;
    }
  }

  private clearAllTimers(): void {
    this.clearRoundTimers();
    this.clearRestTimers();
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  dispose(): void {
    this.clearAllTimers();
    this.audio.dispose();
  }
}
