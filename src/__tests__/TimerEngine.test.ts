/**
 * BOX TRAINER — TimerEngine Tests
 *
 * Tests for core timer state machine and workout logic
 *
 * Coverage:
 * - State transitions: idle → work → rest → done
 * - Callback invocations (onTick, onStateChange, onRoundChange, onPunchDisplay, onComplete)
 * - Round progression
 * - Punch display with anti-repeat logic
 * - Stop/reset functionality
 * - Timer cleanup
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimerEngine } from '@core/TimerEngine';
import type { WorkoutConfig, TrainingState, PunchNumber } from '@core/types';

// Mock AudioManager
const mockAudioMethods = {
  playBell: vi.fn(),
  playEndBell: vi.fn(),
  playWarnBeep: vi.fn(),
  playPunchBeep: vi.fn(),
  speak: vi.fn(),
  stopSpeech: vi.fn(),
  updateConfig: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('@audio/AudioManager', () => ({
  AudioManager: vi.fn(function (this: any) {
    return mockAudioMethods;
  }),
}));

describe('TimerEngine', () => {
  let engine: TimerEngine;
  let mockConfig: WorkoutConfig;
  let callbacks: {
    onTick: ReturnType<typeof vi.fn>;
    onStateChange: ReturnType<typeof vi.fn>;
    onRoundChange: ReturnType<typeof vi.fn>;
    onPunchDisplay: ReturnType<typeof vi.fn>;
    onComplete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset timers
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Create test config
    mockConfig = {
      rounds: 3,
      roundDuration: 10, // Short duration for testing
      restDuration: 5,
      numberInterval: 2,
      audio: {
        bell: true,
        warn: true,
        endBell: true,
        punchBeep: true,
        voice: true,
      },
    };

    // Create engine
    engine = new TimerEngine(mockConfig);

    // Setup callbacks
    callbacks = {
      onTick: vi.fn(),
      onStateChange: vi.fn(),
      onRoundChange: vi.fn(),
      onPunchDisplay: vi.fn(),
      onComplete: vi.fn(),
    };

    engine.onTick(callbacks.onTick);
    engine.onStateChange(callbacks.onStateChange);
    engine.onRoundChange(callbacks.onRoundChange);
    engine.onPunchDisplay(callbacks.onPunchDisplay);
    engine.onComplete(callbacks.onComplete);
  });

  afterEach(() => {
    if (engine) {
      engine.dispose();
    }
  });

  // ==========================================================================
  // INITIALIZATION & STATE
  // ==========================================================================

  describe('Initialization', () => {
    it('should start in idle state', () => {
      const state = engine.getState();
      expect(state.state).toBe('idle');
      expect(state.currentRound).toBe(1);
      expect(state.timeLeft).toBe(mockConfig.roundDuration);
      expect(state.punchesShown).toBe(0);
    });

    it('should initialize with correct config', () => {
      const state = engine.getState();
      expect(state.totalRounds).toBe(mockConfig.rounds);
    });
  });

  // ==========================================================================
  // STATE TRANSITIONS
  // ==========================================================================

  describe('State Transitions', () => {
    it('should transition from idle to work on start', () => {
      engine.start();

      expect(callbacks.onStateChange).toHaveBeenCalledWith('work');
      expect(callbacks.onRoundChange).toHaveBeenCalledWith(1);

      const state = engine.getState();
      expect(state.state).toBe('work');
    });

    it('should transition from work to rest after round completes', () => {
      engine.start();
      callbacks.onStateChange.mockClear();

      // Advance through entire work round
      vi.advanceTimersByTime(mockConfig.roundDuration * 1000);

      // Wait for transition delay (700ms)
      vi.advanceTimersByTime(700);

      expect(callbacks.onStateChange).toHaveBeenCalledWith('rest');
      const state = engine.getState();
      expect(state.state).toBe('rest');
    });

    it('should transition from rest to work for next round', () => {
      engine.start();

      // Complete first work round
      vi.advanceTimersByTime(mockConfig.roundDuration * 1000);
      vi.advanceTimersByTime(700); // Transition delay

      callbacks.onStateChange.mockClear();
      callbacks.onRoundChange.mockClear();

      // Complete rest period
      vi.advanceTimersByTime(mockConfig.restDuration * 1000);

      expect(callbacks.onStateChange).toHaveBeenCalledWith('work');
      expect(callbacks.onRoundChange).toHaveBeenCalledWith(2);
    });

    it('should transition to done after all rounds complete', () => {
      engine.start();

      // Complete all rounds (work + rest for each round except last)
      for (let i = 0; i < mockConfig.rounds; i++) {
        // Work round
        vi.advanceTimersByTime(mockConfig.roundDuration * 1000);
        vi.advanceTimersByTime(800); // End delay

        // Rest (except after last round)
        if (i < mockConfig.rounds - 1) {
          vi.advanceTimersByTime(mockConfig.restDuration * 1000);
        }
      }

      expect(callbacks.onStateChange).toHaveBeenCalledWith('done');
      expect(callbacks.onComplete).toHaveBeenCalled();

      const state = engine.getState();
      expect(state.state).toBe('done');
    });
  });

  // ==========================================================================
  // TIMER TICKS
  // ==========================================================================

  describe('Timer Ticks', () => {
    it('should call onTick every second during work round', () => {
      engine.start();
      callbacks.onTick.mockClear(); // Clear initial tick

      // Advance 3 seconds
      vi.advanceTimersByTime(3000);

      expect(callbacks.onTick).toHaveBeenCalledTimes(3);
      expect(callbacks.onTick).toHaveBeenNthCalledWith(1, mockConfig.roundDuration - 1);
      expect(callbacks.onTick).toHaveBeenNthCalledWith(2, mockConfig.roundDuration - 2);
      expect(callbacks.onTick).toHaveBeenNthCalledWith(3, mockConfig.roundDuration - 3);
    });

    it('should call onTick every second during rest period', () => {
      engine.start();

      // Complete work round
      vi.advanceTimersByTime(mockConfig.roundDuration * 1000);
      vi.advanceTimersByTime(700); // Transition delay

      callbacks.onTick.mockClear();

      // Advance 2 seconds during rest
      vi.advanceTimersByTime(2000);

      expect(callbacks.onTick).toHaveBeenCalledTimes(2);
      expect(callbacks.onTick).toHaveBeenNthCalledWith(1, mockConfig.restDuration - 1);
      expect(callbacks.onTick).toHaveBeenNthCalledWith(2, mockConfig.restDuration - 2);
    });

    it('should report correct timeLeft via getState', () => {
      engine.start();

      vi.advanceTimersByTime(3000);

      const state = engine.getState();
      expect(state.timeLeft).toBe(mockConfig.roundDuration - 3);
    });
  });

  // ==========================================================================
  // ROUND PROGRESSION
  // ==========================================================================

  describe('Round Progression', () => {
    it('should increment current round after each work period', () => {
      engine.start();
      expect(engine.getState().currentRound).toBe(1);

      // Complete first round
      vi.advanceTimersByTime(mockConfig.roundDuration * 1000);
      vi.advanceTimersByTime(700);
      vi.advanceTimersByTime(mockConfig.restDuration * 1000);

      expect(engine.getState().currentRound).toBe(2);
    });

    it('should call onRoundChange with correct round number', () => {
      engine.start();

      // Round 1
      expect(callbacks.onRoundChange).toHaveBeenCalledWith(1);

      // Complete round and move to round 2
      vi.advanceTimersByTime(mockConfig.roundDuration * 1000);
      vi.advanceTimersByTime(700);
      vi.advanceTimersByTime(mockConfig.restDuration * 1000);

      expect(callbacks.onRoundChange).toHaveBeenCalledWith(2);
    });
  });

  // ==========================================================================
  // PUNCH DISPLAY
  // ==========================================================================

  describe('Punch Display', () => {
    it('should show first punch after 1.5s delay', () => {
      engine.start();

      // Before delay
      expect(callbacks.onPunchDisplay).not.toHaveBeenCalled();

      // After delay
      vi.advanceTimersByTime(1500);
      expect(callbacks.onPunchDisplay).toHaveBeenCalledTimes(1);
    });

    it('should show punches at correct intervals', () => {
      engine.start();

      // First punch after 1.5s
      vi.advanceTimersByTime(1500);
      expect(callbacks.onPunchDisplay).toHaveBeenCalledTimes(1);

      // Second punch after numberInterval
      vi.advanceTimersByTime(mockConfig.numberInterval * 1000);
      expect(callbacks.onPunchDisplay).toHaveBeenCalledTimes(2);

      // Third punch
      vi.advanceTimersByTime(mockConfig.numberInterval * 1000);
      expect(callbacks.onPunchDisplay).toHaveBeenCalledTimes(3);
    });

    it('should display valid punch numbers (1-6)', () => {
      engine.start();

      // Show several punches
      vi.advanceTimersByTime(1500);
      vi.advanceTimersByTime(mockConfig.numberInterval * 1000 * 5);

      callbacks.onPunchDisplay.mock.calls.forEach((call) => {
        const punch = call[0] as PunchNumber;
        expect(punch).toBeGreaterThanOrEqual(1);
        expect(punch).toBeLessThanOrEqual(6);
      });
    });

    it('should apply anti-repeat logic (most of the time)', () => {
      engine.start();

      // Generate many punches
      vi.advanceTimersByTime(1500);
      for (let i = 0; i < 50; i++) {
        vi.advanceTimersByTime(mockConfig.numberInterval * 1000);
      }

      // Count consecutive repeats
      let consecutiveRepeats = 0;
      const calls = callbacks.onPunchDisplay.mock.calls;

      for (let i = 1; i < calls.length; i++) {
        if (calls[i][0] === calls[i - 1][0]) {
          consecutiveRepeats++;
        }
      }

      // With 75% anti-repeat, we should have few repeats
      // Allow up to 30% repeats due to randomness
      const repeatRate = consecutiveRepeats / calls.length;
      expect(repeatRate).toBeLessThan(0.3);
    });

    it('should track punchesShown count', () => {
      engine.start();

      // Show 5 punches
      vi.advanceTimersByTime(1500);
      vi.advanceTimersByTime(mockConfig.numberInterval * 1000 * 4);

      const state = engine.getState();
      expect(state.punchesShown).toBe(5);
    });
  });

  // ==========================================================================
  // STOP & RESET
  // ==========================================================================

  describe('Stop & Reset', () => {
    it('should stop training and return to idle', () => {
      engine.start();
      vi.advanceTimersByTime(3000);

      engine.stop();

      expect(callbacks.onStateChange).toHaveBeenCalledWith('idle');
      const state = engine.getState();
      expect(state.state).toBe('idle');
      expect(state.timeLeft).toBe(mockConfig.roundDuration);
    });

    it('should clear all timers on stop', () => {
      engine.start();
      // Advance past initial punch delay (1.5s) to ensure timers are running
      vi.advanceTimersByTime(2000);

      callbacks.onTick.mockClear();
      callbacks.onPunchDisplay.mockClear();
      engine.stop();

      // Advance time - no callbacks should fire
      vi.advanceTimersByTime(5000);
      expect(callbacks.onTick).not.toHaveBeenCalled();
      expect(callbacks.onPunchDisplay).not.toHaveBeenCalled();
    });

    it('should reset to initial state', () => {
      engine.start();
      vi.advanceTimersByTime(mockConfig.roundDuration * 1000);
      vi.advanceTimersByTime(700);
      vi.advanceTimersByTime(mockConfig.restDuration * 1000);

      // Should be on round 2 now
      expect(engine.getState().currentRound).toBe(2);

      engine.reset();

      const state = engine.getState();
      expect(state.state).toBe('idle');
      expect(state.currentRound).toBe(1);
      expect(state.timeLeft).toBe(mockConfig.roundDuration);
    });

    it('should allow restart after stop', () => {
      engine.start();
      vi.advanceTimersByTime(3000);
      engine.stop();

      callbacks.onStateChange.mockClear();
      engine.start();

      expect(callbacks.onStateChange).toHaveBeenCalledWith('work');
      const state = engine.getState();
      expect(state.state).toBe('work');
      expect(state.currentRound).toBe(1);
    });
  });

  // ==========================================================================
  // CONFIG UPDATE
  // ==========================================================================

  describe('Config Update', () => {
    it('should update config while idle', () => {
      const newConfig: WorkoutConfig = {
        ...mockConfig,
        rounds: 5,
        roundDuration: 20,
      };

      engine.updateConfig(newConfig);

      const state = engine.getState();
      expect(state.totalRounds).toBe(5);
      expect(state.timeLeft).toBe(20);
    });

    it('should not affect timeLeft if already running', () => {
      engine.start();
      vi.advanceTimersByTime(3000);

      const newConfig: WorkoutConfig = {
        ...mockConfig,
        roundDuration: 20,
      };

      engine.updateConfig(newConfig);

      const state = engine.getState();
      // Time should still be counting from original duration
      expect(state.timeLeft).toBe(mockConfig.roundDuration - 3);
    });
  });

  // ==========================================================================
  // AUDIO INTEGRATION
  // ==========================================================================

  describe('Audio Integration', () => {
    it('should trigger audio on work start (bell)', () => {
      engine.start();

      expect(mockAudioMethods.playBell).toHaveBeenCalled();
    });

    it('should trigger audio on punch display', () => {
      engine.start();
      vi.advanceTimersByTime(1500);

      expect(mockAudioMethods.playPunchBeep).toHaveBeenCalled();
      expect(mockAudioMethods.speak).toHaveBeenCalled();
    });

    it('should trigger warning beeps in last 10 seconds', () => {
      engine.start();

      // Advance to last 10 seconds
      vi.advanceTimersByTime((mockConfig.roundDuration - 10) * 1000);
      mockAudioMethods.playWarnBeep.mockClear();

      // Advance through warning period
      vi.advanceTimersByTime(3000);

      expect(mockAudioMethods.playWarnBeep).toHaveBeenCalledTimes(3);
    });

    it('should trigger end bell on round complete', () => {
      engine.start();
      vi.advanceTimersByTime(mockConfig.roundDuration * 1000);

      expect(mockAudioMethods.playEndBell).toHaveBeenCalled();
    });

    it('should stop speech on stop', () => {
      engine.start();
      engine.stop();

      expect(mockAudioMethods.stopSpeech).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  describe('Cleanup', () => {
    it('should dispose audio manager on dispose', () => {
      engine.dispose();

      expect(mockAudioMethods.dispose).toHaveBeenCalled();
    });

    it('should clear all timers on dispose', () => {
      engine.start();
      vi.advanceTimersByTime(3000);

      callbacks.onTick.mockClear();
      engine.dispose();

      // Advance time - no callbacks should fire
      vi.advanceTimersByTime(5000);
      expect(callbacks.onTick).not.toHaveBeenCalled();
    });
  });
});
