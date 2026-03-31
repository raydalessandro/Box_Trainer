/**
 * BOX TRAINER — Session Manager
 * Phase 1: Explicit session tracking with wall clock duration
 */

import { WorkoutConfig, WorkoutSession, TrainingState } from '@core/types';

interface TimerState {
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  state: TrainingState;
}

interface SessionMetrics {
  completedRounds: number;
  punchesShown: number;
}

export class SessionManager {
  private activeSessionId: string | null = null;
  private sessionStartTime: number | null = null;
  private sessionMetrics: SessionMetrics = {
    completedRounds: 0,
    punchesShown: 0,
  };

  /**
   * Start a new training session
   * @returns Session UUID
   * @throws Error if session already active
   */
  startSession(): string {
    if (this.activeSessionId !== null) {
      throw new Error('Cannot start session: a session is already active');
    }

    // Generate UUID using Web Crypto API
    this.activeSessionId = crypto.randomUUID();
    this.sessionStartTime = Date.now();
    this.sessionMetrics = {
      completedRounds: 0,
      punchesShown: 0,
    };

    return this.activeSessionId;
  }

  /**
   * End the active session and create WorkoutSession object
   * @param config Workout configuration used
   * @param timerState Current timer state
   * @returns Complete workout session object
   * @throws Error if no active session
   */
  endSession(config: WorkoutConfig, timerState: TimerState): WorkoutSession {
    if (this.activeSessionId === null || this.sessionStartTime === null) {
      throw new Error('Cannot end session: no active session');
    }

    const endTime = Date.now();
    const sessionDuration = Math.floor((endTime - this.sessionStartTime) / 1000); // Convert to seconds

    // Session is completed if timer reached 'done' state
    const isCompleted = timerState.state === 'done';

    // Session stopped early if not completed and at least one round was started
    const stoppedEarly = !isCompleted && timerState.currentRound > 0;

    const session: WorkoutSession = {
      id: this.activeSessionId,
      date: new Date(this.sessionStartTime),
      config: config,
      completedRounds: this.sessionMetrics.completedRounds,
      totalDuration: this.calculateTotalTrainingDuration(config, this.sessionMetrics.completedRounds),
      punchesShown: this.sessionMetrics.punchesShown,
      createdAt: this.sessionStartTime,
      // Phase 1 new fields
      startedAt: this.sessionStartTime,
      endedAt: endTime,
      sessionDuration: sessionDuration,
      isCompleted: isCompleted,
      stoppedEarly: stoppedEarly,
    };

    // Reset state
    this.reset();

    return session;
  }

  /**
   * Check if a session is currently active
   */
  isActive(): boolean {
    return this.activeSessionId !== null;
  }

  /**
   * Get the active session ID
   * @returns Session UUID or null if no active session
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  /**
   * Get the session start time
   * @returns Unix timestamp or null if no active session
   */
  getSessionStartTime(): number | null {
    return this.sessionStartTime;
  }

  /**
   * Get current session metrics
   * @returns Current metrics snapshot
   */
  getMetrics(): SessionMetrics {
    return { ...this.sessionMetrics };
  }

  /**
   * Get elapsed session time in seconds
   * @returns Elapsed seconds or null if no active session
   */
  getElapsedTime(): number | null {
    if (this.sessionStartTime === null) {
      return null;
    }
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Update session metrics during workout
   * @param rounds Number of completed rounds
   * @param punches Number of punches shown
   */
  updateMetrics(rounds: number, punches: number): void {
    if (!this.isActive()) {
      console.warn('SessionManager: Cannot update metrics - no active session');
      return;
    }

    this.sessionMetrics.completedRounds = rounds;
    this.sessionMetrics.punchesShown = punches;
  }

  /**
   * Reset session state (used internally after endSession)
   */
  reset(): void {
    this.activeSessionId = null;
    this.sessionStartTime = null;
    this.sessionMetrics = {
      completedRounds: 0,
      punchesShown: 0,
    };
  }

  /**
   * Calculate total training duration (work + rest time)
   * @param config Workout configuration
   * @param completedRounds Number of rounds completed
   * @returns Total seconds spent in work/rest periods
   */
  private calculateTotalTrainingDuration(config: WorkoutConfig, completedRounds: number): number {
    if (completedRounds === 0) {
      return 0;
    }

    // Each round = work duration + rest duration (except last round has no rest)
    const fullRounds = completedRounds - 1;
    const fullRoundDuration = config.roundDuration + config.restDuration;

    // Last round only has work duration
    const totalDuration = (fullRounds * fullRoundDuration) + config.roundDuration;

    return totalDuration;
  }
}
