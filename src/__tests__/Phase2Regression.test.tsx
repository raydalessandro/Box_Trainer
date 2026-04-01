/**
 * BOX TRAINER — Phase 2 Regression Tests
 *
 * Critical bug: Timer fails to start on second training session after complete/reset
 *
 * Reproduction:
 * 1. First session: Click "INIZIA ALLENAMENTO" → Timer works ✓
 * 2. Session completes naturally → DoneOverlay appears
 * 3. Click "RESTART" or manually close session
 * 4. Second session: Click "INIZIA ALLENAMENTO" → Timer BLOCKED ✗
 *
 * Root cause: State inconsistency between TimerEngine, SessionManager, and App.tsx
 * after session completion and reset.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App';
import { TimerEngine } from '@core/TimerEngine';
import { SessionManager } from '@core/SessionManager';
import type { WorkoutConfig } from '@core/types';

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

describe('Phase 2 Regression: Timer Restart Bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Critical Bug: Timer Blocked After Second Start', () => {
    it('should start timer successfully on first training session', async () => {
      render(<App />);

      // Click "INIZIA ALLENAMENTO"
      const startButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(startButton);

      // Timer should transition to 'work' state
      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      });

      // Advance timer to show punch
      vi.advanceTimersByTime(1500);

      // Punch number should display
      const punchDisplay = screen.getByText(/— COLPISCI! —/);
      expect(punchDisplay).toBeInTheDocument();
    });

    it('should start timer successfully on second training session after complete', async () => {
      const { rerender } = render(<App />);

      // ========== FIRST SESSION ==========
      const startButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      });

      // Complete first session (fast forward through all rounds)
      // Default config: 3 rounds, 180s each, 60s rest
      const roundDuration = 180 * 1000;
      const restDuration = 60 * 1000;

      for (let i = 0; i < 3; i++) {
        // Work round
        vi.advanceTimersByTime(roundDuration);
        vi.advanceTimersByTime(800); // End delay

        // Rest (except after last round)
        if (i < 2) {
          vi.advanceTimersByTime(restDuration);
        }
      }

      // Session should complete (DoneOverlay visible)
      await waitFor(() => {
        expect(screen.getByText(/FINITO!/)).toBeInTheDocument();
      });

      // Click RESTART button in DoneOverlay
      const restartButton = screen.getByText(/RIPROVA/);
      fireEvent.click(restartButton);

      // Should return to idle state
      await waitFor(() => {
        expect(screen.getByText('INIZIA ALLENAMENTO')).toBeInTheDocument();
      });

      // ========== SECOND SESSION (BUG REPRODUCTION) ==========
      const secondStartButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(secondStartButton);

      // Timer SHOULD transition to 'work' state
      // BUG: Timer remains stuck, no state change
      await waitFor(
        () => {
          expect(screen.getByText('LAVORA!')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Advance timer to show punch
      vi.advanceTimersByTime(1500);

      // Punch should display (this fails in bug scenario)
      expect(screen.getByText(/— COLPISCI! —/)).toBeInTheDocument();
    });

    it('should start timer successfully after manual session close', async () => {
      render(<App />);

      // ========== FIRST SESSION ==========
      const startButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      });

      // Advance a bit
      vi.advanceTimersByTime(5000);

      // Click "CHIUDI ALLENAMENTO"
      const closeButton = screen.getByText('CHIUDI ALLENAMENTO');
      fireEvent.click(closeButton);

      // Confirm modal appears
      await waitFor(() => {
        expect(screen.getByText('CONFERMA CHIUSURA')).toBeInTheDocument();
      });

      // Confirm closure
      const confirmButton = screen.getByText('TERMINA');
      fireEvent.click(confirmButton);

      // Should return to idle
      await waitFor(() => {
        expect(screen.getByText('INIZIA ALLENAMENTO')).toBeInTheDocument();
      });

      // ========== SECOND SESSION ==========
      const secondStartButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(secondStartButton);

      // Timer should work
      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      });

      vi.advanceTimersByTime(1500);
      expect(screen.getByText(/— COLPISCI! —/)).toBeInTheDocument();
    });

    it('should handle multiple complete-restart cycles', async () => {
      render(<App />);

      const roundDuration = 180 * 1000;
      const restDuration = 60 * 1000;

      // Run 3 complete sessions
      for (let session = 1; session <= 3; session++) {
        const startButton = screen.getByText('INIZIA ALLENAMENTO');
        fireEvent.click(startButton);

        await waitFor(() => {
          expect(screen.getByText('LAVORA!')).toBeInTheDocument();
        });

        // Complete session
        for (let i = 0; i < 3; i++) {
          vi.advanceTimersByTime(roundDuration);
          vi.advanceTimersByTime(800);
          if (i < 2) {
            vi.advanceTimersByTime(restDuration);
          }
        }

        await waitFor(() => {
          expect(screen.getByText(/FINITO!/)).toBeInTheDocument();
        });

        const restartButton = screen.getByText(/RIPROVA/);
        fireEvent.click(restartButton);

        await waitFor(() => {
          expect(screen.getByText('INIZIA ALLENAMENTO')).toBeInTheDocument();
        });
      }

      // Fourth session should still work
      const finalStartButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(finalStartButton);

      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      });
    });
  });

  describe('Unit: TimerEngine State Consistency', () => {
    let engine: TimerEngine;
    let config: WorkoutConfig;

    beforeEach(() => {
      config = {
        rounds: 3,
        roundDuration: 10,
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

      engine = new TimerEngine(config);
    });

    afterEach(() => {
      engine.dispose();
    });

    it('should transition from done to idle on reset', () => {
      const onStateChange = vi.fn();
      engine.onStateChange(onStateChange);

      // Start and complete workout
      engine.start();
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(10 * 1000);
        vi.advanceTimersByTime(800);
        if (i < 2) {
          vi.advanceTimersByTime(5 * 1000);
        }
      }

      expect(engine.getState().state).toBe('done');

      // Reset
      onStateChange.mockClear();
      engine.reset();

      expect(engine.getState().state).toBe('idle');
      expect(onStateChange).toHaveBeenCalledWith('idle');
    });

    it('should allow start after done state', () => {
      const onStateChange = vi.fn();
      engine.onStateChange(onStateChange);

      // Complete first workout
      engine.start();
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(10 * 1000);
        vi.advanceTimersByTime(800);
        if (i < 2) {
          vi.advanceTimersByTime(5 * 1000);
        }
      }

      expect(engine.getState().state).toBe('done');

      // Start again WITHOUT reset (should auto-reset)
      onStateChange.mockClear();
      engine.start();

      expect(onStateChange).toHaveBeenCalledWith('idle'); // stop() call
      expect(onStateChange).toHaveBeenCalledWith('work'); // start() call
      expect(engine.getState().state).toBe('work');
      expect(engine.getState().currentRound).toBe(1);
    });

    it('should clear punch count on reset', () => {
      engine.start();
      vi.advanceTimersByTime(1500);
      vi.advanceTimersByTime(2000 * 3); // Show a few punches

      expect(engine.getState().punchesShown).toBeGreaterThan(0);

      engine.reset();

      expect(engine.getState().punchesShown).toBe(0);
    });
  });

  describe('Unit: SessionManager State Consistency', () => {
    let sessionManager: SessionManager;
    let config: WorkoutConfig;

    beforeEach(() => {
      sessionManager = new SessionManager();
      config = {
        rounds: 3,
        roundDuration: 180,
        restDuration: 60,
        numberInterval: 5,
        audio: {
          bell: true,
          warn: true,
          endBell: true,
          punchBeep: true,
          voice: true,
        },
      };
    });

    it('should allow starting new session after endSession', () => {
      // First session
      const sessionId1 = sessionManager.startSession();
      expect(sessionManager.isActive()).toBe(true);

      const session1 = sessionManager.endSession(config, {
        currentRound: 3,
        totalRounds: 3,
        timeLeft: 0,
        state: 'done',
      });

      expect(session1.id).toBe(sessionId1);
      expect(sessionManager.isActive()).toBe(false);

      // Second session (should work)
      const sessionId2 = sessionManager.startSession();
      expect(sessionManager.isActive()).toBe(true);
      expect(sessionId2).not.toBe(sessionId1); // Different UUID
    });

    it('should reset metrics after endSession', () => {
      sessionManager.startSession();
      sessionManager.updateMetrics(3, 50);

      sessionManager.endSession(config, {
        currentRound: 3,
        totalRounds: 3,
        timeLeft: 0,
        state: 'done',
      });

      const metrics = sessionManager.getMetrics();
      expect(metrics.completedRounds).toBe(0);
      expect(metrics.punchesShown).toBe(0);
    });

    it('should handle multiple session cycles', () => {
      for (let i = 0; i < 5; i++) {
        const sessionId = sessionManager.startSession();
        expect(sessionManager.isActive()).toBe(true);

        sessionManager.updateMetrics(i + 1, (i + 1) * 10);

        const session = sessionManager.endSession(config, {
          currentRound: i + 1,
          totalRounds: 3,
          timeLeft: 0,
          state: 'done',
        });

        expect(session.id).toBe(sessionId);
        expect(sessionManager.isActive()).toBe(false);
      }
    });
  });
});
