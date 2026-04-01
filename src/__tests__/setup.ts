/**
 * BOX TRAINER — Vitest Global Setup
 * Mocks for localStorage, AudioContext, speechSynthesis, and IndexedDB
 */

import { beforeAll, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

// ==========================================================================
// LOCALSTORAGE MOCK
// ==========================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ==========================================================================
// WEB AUDIO API MOCK
// ==========================================================================

class MockAudioContext {
  currentTime = 0;
  destination = {};
  state = 'running';

  createOscillator() {
    const oscillator = {
      type: 'sine' as OscillatorType,
      frequency: { value: 440 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
    return oscillator;
  }

  createGain() {
    const gain = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    return gain;
  }

  close() {
    return Promise.resolve();
  }

  resume() {
    return Promise.resolve();
  }

  suspend() {
    return Promise.resolve();
  }
}

// @ts-ignore
global.AudioContext = MockAudioContext;
// @ts-ignore
global.webkitAudioContext = MockAudioContext;

// ==========================================================================
// SPEECH SYNTHESIS MOCK
// ==========================================================================

const mockVoices = [
  {
    voiceURI: 'it-IT-Standard-A',
    name: 'Italian',
    lang: 'it-IT',
    localService: true,
    default: true,
  },
  {
    voiceURI: 'en-US-Standard-A',
    name: 'English',
    lang: 'en-US',
    localService: true,
    default: false,
  },
];

const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => mockVoices),
  speaking: false,
  pending: false,
  paused: false,
  onvoiceschanged: null,
};

Object.defineProperty(global, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

// @ts-ignore
global.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  text: string;
  lang = 'en-US';
  voice = null;
  volume = 1;
  rate = 1;
  pitch = 1;

  constructor(text: string) {
    this.text = text;
  }
};

// ==========================================================================
// TEST LIFECYCLE HOOKS
// ==========================================================================

beforeAll(() => {
  // Global setup
  vi.useFakeTimers();
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  localStorage.clear();
  mockSpeechSynthesis.speak.mockClear();
  mockSpeechSynthesis.cancel.mockClear();
});

afterEach(() => {
  // Clean up timers
  vi.clearAllTimers();
});

// ==========================================================================
// HELPER UTILITIES FOR TESTS
// ==========================================================================

/**
 * Advance timers and flush microtasks
 * Useful for timer-based tests
 */
export const advanceTimersAndFlush = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await Promise.resolve(); // Flush microtasks
};

/**
 * Wait for next tick
 */
export const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mock localStorage data
 */
export const mockLocalStorageData = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

/**
 * Get mock speech synthesis for assertions
 */
export const getMockSpeechSynthesis = () => mockSpeechSynthesis;
