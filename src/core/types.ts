/**
 * BOX TRAINER — Core Type Definitions
 * Extracted from BoxTrainer_ORIGINAL.html
 */

// ============================================================================
// WORKOUT CONFIGURATION
// ============================================================================

export interface AudioConfig {
  bell: boolean;       // Start of round bell
  warn: boolean;       // Warning beeps (last 10s work, last 3s rest)
  endBell: boolean;    // End round/workout bells
  punchBeep: boolean;  // Punch number beep
  voice: boolean;      // Speech synthesis of combo names
}

export interface WorkoutConfig {
  rounds: number;          // Total rounds (1-20)
  roundDuration: number;   // Seconds per round (30-600)
  restDuration: number;    // Rest between rounds (10-300)
  numberInterval: number;  // Interval between combos in seconds (1-10)
  audio: AudioConfig;
}

// ============================================================================
// TRAINING STATE
// ============================================================================

export type TrainingState = 'idle' | 'work' | 'rest' | 'done';

export interface TrainingSession {
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  state: TrainingState;
  config: WorkoutConfig;
}

// ============================================================================
// WORKOUT HISTORY
// ============================================================================

export interface WorkoutSession {
  id: string;                 // UUID
  date: Date;                 // Session date
  config: WorkoutConfig;      // Config used
  completedRounds: number;    // Rounds completed
  totalDuration: number;      // Total seconds trained
  punchesShown: number;       // Total punch combos displayed
  createdAt: number;          // Unix timestamp
}

// ============================================================================
// PUNCH COMBINATIONS
// ============================================================================

export type PunchNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface PunchCombo {
  number: PunchNumber;
  name: string;
  voiceText: string;
}

export const PUNCH_COMBOS: Record<PunchNumber, PunchCombo> = {
  1: {
    number: 1,
    name: 'JAB',
    voiceText: 'Jab',
  },
  2: {
    number: 2,
    name: 'JAB · DIRETTO',
    voiceText: 'Jab, diretto',
  },
  3: {
    number: 3,
    name: 'JAB · DIRETTO · GANCIO SX',
    voiceText: 'Jab, diretto, gancio sinistro',
  },
  4: {
    number: 4,
    name: 'JAB · DIRETTO · GANCIO SX · GANCIO DX',
    voiceText: 'Jab, diretto, gancio sinistro, gancio destro',
  },
  5: {
    number: 5,
    name: 'DIRETTO · GANCIO SX · GANCIO DX · FEGATO BASSO SX',
    voiceText: 'Diretto, gancio sinistro, gancio destro, gancio basso al fegato',
  },
  6: {
    number: 6,
    name: 'JAB · JAB',
    voiceText: 'Doppio Jab',
  },
};

// ============================================================================
// TIMER IDS (for cleanup)
// ============================================================================

export interface TimerIds {
  round: number | null;
  number: number | null;
  rest: number | null;
  delay: number | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const TIMER_CIRCLE_CIRCUMFERENCE = 723; // SVG circle circumference for progress ring

export const DEFAULT_CONFIG: WorkoutConfig = {
  rounds: 6,
  roundDuration: 180,  // 3 minutes
  restDuration: 60,    // 1 minute
  numberInterval: 3,   // 3 seconds
  audio: {
    bell: true,
    warn: true,
    endBell: true,
    punchBeep: true,
    voice: true,
  },
};

// ============================================================================
// VALIDATION CONSTRAINTS
// ============================================================================

export const VALIDATION = {
  rounds: { min: 1, max: 20 },
  roundDuration: { min: 30, max: 600 },
  restDuration: { min: 10, max: 300 },
  numberInterval: { min: 1, max: 10 },
} as const;
