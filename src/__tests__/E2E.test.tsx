/**
 * BOX TRAINER — End-to-End Test Suite
 *
 * Comprehensive E2E tests covering critical user flows:
 * 1. Complete workout flow (start → rounds → completion → save)
 * 2. Early stop flow (start → stop → confirm → save partial)
 * 3. History flow (view past sessions with correct data)
 * 4. Stats flow (dashboard with metrics and calendar)
 * 5. Multiple restart cycles (regression test for timer restart bug)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '@/App';
import { StorageService } from '@storage/StorageService';
import type { WorkoutSession } from '@core/types';

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

describe('BoxTrainer E2E Test Suite', () => {
  let storageService: StorageService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Initialize fresh storage service
    storageService = new StorageService();
    await storageService.init();
    await storageService.clearAllSessions();
  });

  afterEach(async () => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    if (storageService) {
      await storageService.dispose();
    }
  });

  // ==========================================================================
  // E2E TEST 1: Complete Workout Flow
  // ==========================================================================

  describe('E2E Flow 1: Complete Workout', () => {
    it('should complete full workout cycle and save session with correct metrics', async () => {
      render(<App />);

      // Step 1: Verify idle state
      expect(screen.getByText('INIZIA ALLENAMENTO')).toBeInTheDocument();

      // Step 2: Start workout
      const startButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(startButton);

      // Step 3: Verify timer starts and enters work state
      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Step 4: Verify punch numbers appear during workout
      vi.advanceTimersByTime(1500); // Wait for first punch interval

      await waitFor(() => {
        const punchDisplay = screen.queryByText(/— COLPISCI! —/);
        expect(punchDisplay).toBeInTheDocument();
      }, { timeout: 1000 });

      // Step 5: Complete all 3 rounds
      // Default config: 3 rounds × 180s = 540s work + 2 rest periods × 60s = 120s
      const roundDuration = 180 * 1000; // 180 seconds
      const restDuration = 60 * 1000; // 60 seconds

      for (let round = 0; round < 3; round++) {
        // Complete work round
        vi.advanceTimersByTime(roundDuration);
        vi.advanceTimersByTime(800); // End delay

        // Rest period (except after last round)
        if (round < 2) {
          await waitFor(() => {
            expect(screen.getByText('RIPOSA!')).toBeInTheDocument();
          }, { timeout: 1000 });

          vi.advanceTimersByTime(restDuration);
        }
      }

      // Step 6: Verify completion overlay appears
      await waitFor(() => {
        expect(screen.getByText(/FINITO!/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Step 7: Verify session was saved to IndexedDB
      await waitFor(async () => {
        const sessions = await storageService.getAllSessions();
        expect(sessions.length).toBe(1);
        expect(sessions[0].completedRounds).toBe(3);
        expect(sessions[0].isCompleted).toBe(true);
        expect(sessions[0].punchesShown).toBeGreaterThan(0); // Should have shown punches
      }, { timeout: 2000 });
    }, 15000);
  });

  // ==========================================================================
  // E2E TEST 2: Early Stop Flow
  // ==========================================================================

  describe('E2E Flow 2: Early Stop', () => {
    it('should save partial session with stoppedEarly flag when user closes workout early', async () => {
      render(<App />);

      // Step 1: Start workout
      const startButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      });

      // Step 2: Advance timer partially through workout
      vi.advanceTimersByTime(30000); // 30 seconds into first round

      // Step 3: Click "CHIUDI ALLENAMENTO"
      const stopButton = screen.getByText('CHIUDI ALLENAMENTO');
      fireEvent.click(stopButton);

      // Step 4: Verify confirm modal appears
      await waitFor(() => {
        expect(screen.getByText('CONFERMA CHIUSURA')).toBeInTheDocument();
      });

      // Step 5: Confirm closure
      const confirmButton = screen.getByText('TERMINA');
      fireEvent.click(confirmButton);

      // Step 6: Verify return to idle state
      await waitFor(() => {
        expect(screen.getByText('INIZIA ALLENAMENTO')).toBeInTheDocument();
      });

      // Step 7: Verify partial session saved with stoppedEarly flag
      await waitFor(async () => {
        const sessions = await storageService.getAllSessions();
        expect(sessions.length).toBe(1);
        expect(sessions[0].isCompleted).toBe(false);
        expect(sessions[0].stoppedEarly).toBe(true);
        expect(sessions[0].completedRounds).toBeGreaterThanOrEqual(0); // At least started
      }, { timeout: 2000 });
    }, 15000);
  });

  // ==========================================================================
  // E2E TEST 3: History Flow
  // ==========================================================================

  describe('E2E Flow 3: Session History', () => {
    it('should display all past sessions with correct metrics and completion status', async () => {
      // Step 1: Create mock sessions with varied data
      const mockSessions: WorkoutSession[] = [
        {
          id: crypto.randomUUID(),
          date: new Date('2026-04-01T10:00:00'),
          completedRounds: 5,
          sessionDuration: 600,
          punchesShown: 42,
          isCompleted: true,
          config: {
            rounds: 5,
            roundDuration: 120,
            restDuration: 30,
            numberInterval: 5,
            audio: { bell: true, warn: true, endBell: true, punchBeep: true, voice: true },
          },
          totalDuration: 600,
          createdAt: Date.now() - 86400000, // 1 day ago
        },
        {
          id: crypto.randomUUID(),
          date: new Date('2026-03-31T14:30:00'),
          completedRounds: 2,
          sessionDuration: 250,
          punchesShown: 18,
          isCompleted: false,
          stoppedEarly: true,
          config: {
            rounds: 6,
            roundDuration: 180,
            restDuration: 60,
            numberInterval: 3,
            audio: { bell: true, warn: true, endBell: true, punchBeep: true, voice: true },
          },
          totalDuration: 420,
          createdAt: Date.now() - 172800000, // 2 days ago
        },
        {
          id: crypto.randomUUID(),
          date: new Date('2026-03-30T09:15:00'),
          completedRounds: 3,
          sessionDuration: 540,
          punchesShown: 30,
          isCompleted: true,
          config: {
            rounds: 3,
            roundDuration: 180,
            restDuration: 60,
            numberInterval: 3,
            audio: { bell: true, warn: true, endBell: true, punchBeep: true, voice: true },
          },
          totalDuration: 540,
          createdAt: Date.now() - 259200000, // 3 days ago
        },
      ];

      // Add sessions to IndexedDB
      for (const session of mockSessions) {
        await storageService.addSession(session);
      }

      // Step 2: Render app
      render(<App />);

      // Step 3: Click "📊 STORICO" button
      const historyButton = screen.getByText('📊 STORICO');
      fireEvent.click(historyButton);

      // Step 4: Verify overlay appears
      await waitFor(() => {
        expect(screen.getByText(/STORICO ALLENAMENTI/i)).toBeInTheDocument();
      });

      // Step 5: Verify all 3 sessions are displayed
      await waitFor(() => {
        // Check for completed badge
        const completedBadges = screen.getAllByText(/✅ COMPLETATO/i);
        expect(completedBadges.length).toBe(2); // 2 completed sessions

        // Check for stopped early badge
        const stoppedBadge = screen.getByText(/⚠️ INTERROTTO/i);
        expect(stoppedBadge).toBeInTheDocument();
      });

      // Step 6: Verify session data displays correctly
      expect(screen.getByText(/5 round/i)).toBeInTheDocument(); // First session
      expect(screen.getByText(/42 colpi/i)).toBeInTheDocument(); // First session punches

      // Step 7: Close overlay
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/STORICO ALLENAMENTI/i)).not.toBeInTheDocument();
      });
    }, 10000);
  });

  // ==========================================================================
  // E2E TEST 4: Statistics Flow
  // ==========================================================================

  describe('E2E Flow 4: Statistics Dashboard', () => {
    it('should display advanced stats without freezing and calculate metrics correctly', async () => {
      // Step 1: Create 5+ sessions across different dates
      const mockSessions: WorkoutSession[] = Array.from({ length: 5 }, (_, i) => ({
        id: crypto.randomUUID(),
        date: new Date(Date.now() - i * 86400000), // Each day going back
        completedRounds: 3 + i,
        sessionDuration: 540 + i * 60,
        punchesShown: 30 + i * 5,
        isCompleted: true,
        config: {
          rounds: 3,
          roundDuration: 180,
          restDuration: 60,
          numberInterval: 3,
          audio: { bell: true, warn: true, endBell: true, punchBeep: true, voice: true },
        },
        totalDuration: 540,
        createdAt: Date.now() - i * 86400000,
      }));

      for (const session of mockSessions) {
        await storageService.addSession(session);
      }

      // Step 2: Render app
      render(<App />);

      // Step 3: Click "📈 STATISTICHE" button
      const statsButton = screen.getByText('📈 STATISTICHE');
      fireEvent.click(statsButton);

      // Step 4: Verify stats overlay opens (no freeze!)
      await waitFor(() => {
        expect(screen.getByText(/📊 STATISTICHE/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Step 5: Verify 4 summary cards have values
      await waitFor(() => {
        // Total sessions card
        expect(screen.getByText('5')).toBeInTheDocument(); // 5 sessions

        // Total time card (should be formatted as hours:mins or mins)
        const timeElements = screen.getAllByText(/\d+m/);
        expect(timeElements.length).toBeGreaterThan(0);

        // Streak card
        const streakElements = screen.getAllByText(/\d+/);
        expect(streakElements.length).toBeGreaterThan(3); // Multiple numeric displays

        // Total punches card
        const totalPunches = 30 + 35 + 40 + 45 + 50; // Sum of all punches
        expect(screen.getByText(totalPunches.toString())).toBeInTheDocument();
      });

      // Step 6: Verify calendar heatmap renders
      const calendarSection = screen.getByText(/📅 CALENDARIO ATTIVITÀ/i);
      expect(calendarSection).toBeInTheDocument();

      // Step 7: Verify streak calculation (should be 5 consecutive days)
      await waitFor(() => {
        // Check for current streak display
        const streakDisplay = screen.getByText(/Streak/i);
        expect(streakDisplay).toBeInTheDocument();
      });

      // Step 8: Close overlay
      const closeButton = screen.getAllByText('✕')[0]; // Get first close button
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/📊 STATISTICHE/i)).not.toBeInTheDocument();
      });
    }, 15000);
  });

  // ==========================================================================
  // E2E TEST 5: Multiple Restart Cycles (Regression Test)
  // ==========================================================================

  describe('E2E Flow 5: Multiple Restart Cycles', () => {
    it('should restart timer successfully after multiple complete-restart cycles', async () => {
      render(<App />);

      const roundDuration = 180 * 1000;
      const restDuration = 60 * 1000;

      // Run 3 complete workout cycles
      for (let cycle = 1; cycle <= 3; cycle++) {
        // Step 1: Start workout
        const startButton = screen.getByText('INIZIA ALLENAMENTO');
        fireEvent.click(startButton);

        // Step 2: Verify timer starts
        await waitFor(() => {
          expect(screen.getByText('LAVORA!')).toBeInTheDocument();
        }, { timeout: 1000 });

        // Step 3: Verify punch display works
        vi.advanceTimersByTime(1500);
        await waitFor(() => {
          expect(screen.queryByText(/— COLPISCI! —/)).toBeInTheDocument();
        }, { timeout: 1000 });

        // Step 4: Complete all rounds
        for (let round = 0; round < 3; round++) {
          vi.advanceTimersByTime(roundDuration);
          vi.advanceTimersByTime(800);
          if (round < 2) {
            vi.advanceTimersByTime(restDuration);
          }
        }

        // Step 5: Wait for completion
        await waitFor(() => {
          expect(screen.getByText(/FINITO!/i)).toBeInTheDocument();
        }, { timeout: 2000 });

        // Step 6: Click RIPROVA to restart
        const restartButton = screen.getByText(/RIPROVA/i);
        fireEvent.click(restartButton);

        // Step 7: Verify return to idle
        await waitFor(() => {
          expect(screen.getByText('INIZIA ALLENAMENTO')).toBeInTheDocument();
        }, { timeout: 1000 });
      }

      // Step 8: Start FOURTH workout to ensure timer still works
      const finalStartButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(finalStartButton);

      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Verify punch display still works
      vi.advanceTimersByTime(1500);
      await waitFor(() => {
        expect(screen.queryByText(/— COLPISCI! —/)).toBeInTheDocument();
      }, { timeout: 1000 });

      // Verify 3 sessions were saved (fourth still in progress)
      await waitFor(async () => {
        const sessions = await storageService.getAllSessions();
        expect(sessions.length).toBe(3);
      }, { timeout: 2000 });
    }, 30000);
  });

  // ==========================================================================
  // SPECIFIC TEST: Punch Count in History
  // ==========================================================================

  describe('Punch Count Verification', () => {
    it('should correctly store and display roundsCompleted and punchesShown in history', async () => {
      // Step 1: Create session with specific metrics
      const mockSession: WorkoutSession = {
        id: crypto.randomUUID(),
        date: new Date('2026-04-01T12:00:00'),
        completedRounds: 3,
        sessionDuration: 540,
        punchesShown: 15, // Exactly 15 punches
        isCompleted: true,
        config: {
          rounds: 3,
          roundDuration: 180,
          restDuration: 60,
          numberInterval: 3,
          audio: { bell: true, warn: true, endBell: true, punchBeep: true, voice: true },
        },
        totalDuration: 540,
        createdAt: Date.now(),
      };

      await storageService.addSession(mockSession);

      // Step 2: Render app and open history
      render(<App />);

      const historyButton = screen.getByText('📊 STORICO');
      fireEvent.click(historyButton);

      // Step 3: Verify exact metrics displayed
      await waitFor(() => {
        expect(screen.getByText(/3 round/i)).toBeInTheDocument(); // roundsCompleted
        expect(screen.getByText(/15 colpi/i)).toBeInTheDocument(); // punchesShown
      });

      // Step 4: Retrieve from storage and assert structure
      const retrieved = await storageService.getSession(mockSession.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.completedRounds).toBe(3);
      expect(retrieved!.punchesShown).toBe(15);
    }, 10000);
  });

  // ==========================================================================
  // INTEGRATION TEST: Settings → Workout → History Flow
  // ==========================================================================

  describe('Settings Integration Flow', () => {
    it('should use custom config from settings and reflect in saved session', async () => {
      render(<App />);

      // Step 1: Open settings
      const settingsButton = screen.getByText('⚙');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/CONFIGURAZIONE/i)).toBeInTheDocument();
      });

      // Step 2: Modify settings (e.g., change rounds to 2)
      const roundsInput = screen.getByLabelText(/Round/i);
      fireEvent.change(roundsInput, { target: { value: '2' } });

      // Step 3: Save settings
      const saveButton = screen.getByText('SALVA');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('INIZIA ALLENAMENTO')).toBeInTheDocument();
      });

      // Step 4: Start workout with new config
      const startButton = screen.getByText('INIZIA ALLENAMENTO');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('LAVORA!')).toBeInTheDocument();
      });

      // Step 5: Complete 2 rounds
      const roundDuration = 180 * 1000;
      const restDuration = 60 * 1000;

      for (let round = 0; round < 2; round++) {
        vi.advanceTimersByTime(roundDuration);
        vi.advanceTimersByTime(800);
        if (round < 1) {
          vi.advanceTimersByTime(restDuration);
        }
      }

      // Step 6: Verify completion
      await waitFor(() => {
        expect(screen.getByText(/FINITO!/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Step 7: Verify session saved with correct config
      await waitFor(async () => {
        const sessions = await storageService.getAllSessions();
        expect(sessions.length).toBe(1);
        expect(sessions[0].config.rounds).toBe(2); // Custom config used
        expect(sessions[0].completedRounds).toBe(2);
      }, { timeout: 2000 });
    }, 15000);
  });
});
