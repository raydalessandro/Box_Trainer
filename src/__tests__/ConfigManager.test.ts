/**
 * BOX TRAINER — ConfigManager Tests
 *
 * Tests for configuration management with localStorage persistence
 *
 * Coverage:
 * - Load/save to localStorage
 * - Validation with VALIDATION constraints
 * - Clamp utility
 * - Partial updates (config and audio)
 * - Reset to defaults
 * - formatTime utility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '@core/ConfigManager';
import type { WorkoutConfig, AudioConfig } from '@core/types';
import { DEFAULT_CONFIG, VALIDATION } from '@core/types';

const STORAGE_KEY = 'boxtrainer_config';

describe('ConfigManager', () => {
  let manager: ConfigManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    manager = new ConfigManager();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ==========================================================================
  // INITIALIZATION & LOAD
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default config when localStorage is empty', () => {
      const config = manager.get();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load valid config from localStorage', () => {
      const customConfig: WorkoutConfig = {
        rounds: 8,
        roundDuration: 120,
        restDuration: 45,
        numberInterval: 4,
        audio: {
          bell: true,
          warn: false,
          endBell: true,
          punchBeep: false,
          voice: true,
        },
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(customConfig));
      const newManager = new ConfigManager();
      const loadedConfig = newManager.get();

      expect(loadedConfig).toEqual(customConfig);
    });

    it('should return defaults if localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json{{{');
      const newManager = new ConfigManager();
      const config = newManager.get();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should return defaults if loaded config fails validation', () => {
      const invalidConfig = {
        rounds: 100, // Exceeds max
        roundDuration: 1000, // Exceeds max
        restDuration: 5, // Below min
        numberInterval: 2,
        audio: DEFAULT_CONFIG.audio,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidConfig));
      const newManager = new ConfigManager();
      const config = newManager.get();

      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  // ==========================================================================
  // SAVE & GET
  // ==========================================================================

  describe('Save & Get', () => {
    it('should save valid config to localStorage', () => {
      const customConfig: WorkoutConfig = {
        rounds: 5,
        roundDuration: 150,
        restDuration: 30,
        numberInterval: 3,
        audio: DEFAULT_CONFIG.audio,
      };

      manager.save(customConfig);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(customConfig);
    });

    it('should get current config', () => {
      const customConfig: WorkoutConfig = {
        ...DEFAULT_CONFIG,
        rounds: 10,
      };

      manager.save(customConfig);
      const retrieved = manager.get();

      expect(retrieved).toEqual(customConfig);
    });

    it('should throw error when saving invalid config', () => {
      const invalidConfig = {
        rounds: -5, // Invalid
        roundDuration: 100,
        restDuration: 30,
        numberInterval: 3,
        audio: DEFAULT_CONFIG.audio,
      } as WorkoutConfig;

      expect(() => manager.save(invalidConfig)).toThrow('Invalid config');
    });

    it('should return a copy of config (not reference)', () => {
      const config1 = manager.get();
      const config2 = manager.get();

      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same values
    });
  });

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  describe('Validation', () => {
    it('should validate rounds within range', () => {
      expect(manager.validate({ rounds: 1 })).toBe(true);
      expect(manager.validate({ rounds: 10 })).toBe(true);
      expect(manager.validate({ rounds: 20 })).toBe(true);

      expect(manager.validate({ rounds: 0 })).toBe(false);
      expect(manager.validate({ rounds: 21 })).toBe(false);
      expect(manager.validate({ rounds: -5 })).toBe(false);
    });

    it('should validate roundDuration within range', () => {
      expect(manager.validate({ roundDuration: 30 })).toBe(true);
      expect(manager.validate({ roundDuration: 300 })).toBe(true);
      expect(manager.validate({ roundDuration: 600 })).toBe(true);

      expect(manager.validate({ roundDuration: 29 })).toBe(false);
      expect(manager.validate({ roundDuration: 601 })).toBe(false);
    });

    it('should validate restDuration within range', () => {
      expect(manager.validate({ restDuration: 10 })).toBe(true);
      expect(manager.validate({ restDuration: 150 })).toBe(true);
      expect(manager.validate({ restDuration: 300 })).toBe(true);

      expect(manager.validate({ restDuration: 9 })).toBe(false);
      expect(manager.validate({ restDuration: 301 })).toBe(false);
    });

    it('should validate numberInterval within range', () => {
      expect(manager.validate({ numberInterval: 1 })).toBe(true);
      expect(manager.validate({ numberInterval: 5 })).toBe(true);
      expect(manager.validate({ numberInterval: 10 })).toBe(true);

      expect(manager.validate({ numberInterval: 0 })).toBe(false);
      expect(manager.validate({ numberInterval: 11 })).toBe(false);
    });

    it('should validate audio config structure', () => {
      const validAudio: AudioConfig = {
        bell: true,
        warn: false,
        endBell: true,
        punchBeep: false,
        voice: true,
      };

      expect(manager.validate({ audio: validAudio })).toBe(true);

      // Missing field
      const invalidAudio1 = {
        bell: true,
        warn: false,
        // missing endBell
        punchBeep: false,
        voice: true,
      } as any;

      expect(manager.validate({ audio: invalidAudio1 })).toBe(false);

      // Wrong type
      const invalidAudio2 = {
        bell: 'yes', // Should be boolean
        warn: false,
        endBell: true,
        punchBeep: false,
        voice: true,
      } as any;

      expect(manager.validate({ audio: invalidAudio2 })).toBe(false);
    });

    it('should return false for null/undefined config', () => {
      expect(manager.validate(null as any)).toBe(false);
      expect(manager.validate(undefined as any)).toBe(false);
    });

    it('should validate complete config', () => {
      const validConfig: WorkoutConfig = {
        rounds: 6,
        roundDuration: 180,
        restDuration: 60,
        numberInterval: 3,
        audio: {
          bell: true,
          warn: true,
          endBell: true,
          punchBeep: true,
          voice: true,
        },
      };

      expect(manager.validate(validConfig)).toBe(true);
    });
  });

  // ==========================================================================
  // CLAMP UTILITY
  // ==========================================================================

  describe('Clamp', () => {
    it('should clamp rounds to valid range', () => {
      expect(manager.clamp(0, 'rounds')).toBe(VALIDATION.rounds.min);
      expect(manager.clamp(25, 'rounds')).toBe(VALIDATION.rounds.max);
      expect(manager.clamp(10, 'rounds')).toBe(10);
    });

    it('should clamp roundDuration to valid range', () => {
      expect(manager.clamp(20, 'roundDuration')).toBe(VALIDATION.roundDuration.min);
      expect(manager.clamp(700, 'roundDuration')).toBe(VALIDATION.roundDuration.max);
      expect(manager.clamp(180, 'roundDuration')).toBe(180);
    });

    it('should clamp restDuration to valid range', () => {
      expect(manager.clamp(5, 'restDuration')).toBe(VALIDATION.restDuration.min);
      expect(manager.clamp(400, 'restDuration')).toBe(VALIDATION.restDuration.max);
      expect(manager.clamp(60, 'restDuration')).toBe(60);
    });

    it('should clamp numberInterval to valid range', () => {
      expect(manager.clamp(0, 'numberInterval')).toBe(VALIDATION.numberInterval.min);
      expect(manager.clamp(15, 'numberInterval')).toBe(VALIDATION.numberInterval.max);
      expect(manager.clamp(3, 'numberInterval')).toBe(3);
    });
  });

  // ==========================================================================
  // UPDATE & PARTIAL UPDATE
  // ==========================================================================

  describe('Update', () => {
    it('should update config partially', () => {
      const original = manager.get();
      const updated = manager.update({ rounds: 10 });

      expect(updated.rounds).toBe(10);
      expect(updated.roundDuration).toBe(original.roundDuration);
      expect(updated.restDuration).toBe(original.restDuration);
    });

    it('should persist partial updates to localStorage', () => {
      manager.update({ rounds: 12, numberInterval: 5 });

      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);

      expect(parsed.rounds).toBe(12);
      expect(parsed.numberInterval).toBe(5);
    });

    it('should return updated config', () => {
      const updated = manager.update({ restDuration: 90 });

      expect(updated.restDuration).toBe(90);
      expect(manager.get().restDuration).toBe(90);
    });
  });

  describe('Update Audio', () => {
    it('should update audio config partially', () => {
      const original = manager.get();
      const updated = manager.updateAudio({ bell: false, voice: false });

      expect(updated.audio.bell).toBe(false);
      expect(updated.audio.voice).toBe(false);
      expect(updated.audio.warn).toBe(original.audio.warn);
      expect(updated.audio.endBell).toBe(original.audio.endBell);
    });

    it('should persist audio updates to localStorage', () => {
      manager.updateAudio({ punchBeep: false });

      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);

      expect(parsed.audio.punchBeep).toBe(false);
    });

    it('should not affect non-audio config', () => {
      const original = manager.get();
      const updated = manager.updateAudio({ bell: false });

      expect(updated.rounds).toBe(original.rounds);
      expect(updated.roundDuration).toBe(original.roundDuration);
    });
  });

  // ==========================================================================
  // ADJUST (DELTA)
  // ==========================================================================

  describe('Adjust', () => {
    it('should adjust rounds by delta', () => {
      manager.save({ ...DEFAULT_CONFIG, rounds: 5 });

      const increased = manager.adjust('rounds', 3);
      expect(increased.rounds).toBe(8);

      const decreased = manager.adjust('rounds', -2);
      expect(decreased.rounds).toBe(6);
    });

    it('should clamp adjusted values to valid range', () => {
      manager.save({ ...DEFAULT_CONFIG, rounds: 2 });

      // Try to go below min
      const clamped = manager.adjust('rounds', -5);
      expect(clamped.rounds).toBe(VALIDATION.rounds.min);
    });

    it('should adjust roundDuration by delta', () => {
      manager.save({ ...DEFAULT_CONFIG, roundDuration: 180 });

      const increased = manager.adjust('roundDuration', 30);
      expect(increased.roundDuration).toBe(210);
    });

    it('should adjust restDuration by delta', () => {
      manager.save({ ...DEFAULT_CONFIG, restDuration: 60 });

      const decreased = manager.adjust('restDuration', -10);
      expect(decreased.restDuration).toBe(50);
    });

    it('should adjust numberInterval by delta', () => {
      manager.save({ ...DEFAULT_CONFIG, numberInterval: 3 });

      const increased = manager.adjust('numberInterval', 2);
      expect(increased.numberInterval).toBe(5);
    });

    it('should persist adjusted values', () => {
      manager.adjust('rounds', 5);

      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);

      expect(parsed.rounds).toBe(DEFAULT_CONFIG.rounds + 5);
    });
  });

  // ==========================================================================
  // RESET
  // ==========================================================================

  describe('Reset', () => {
    it('should reset to default config', () => {
      manager.save({
        rounds: 15,
        roundDuration: 240,
        restDuration: 90,
        numberInterval: 5,
        audio: {
          bell: false,
          warn: false,
          endBell: false,
          punchBeep: false,
          voice: false,
        },
      });

      const reset = manager.reset();

      expect(reset).toEqual(DEFAULT_CONFIG);
      expect(manager.get()).toEqual(DEFAULT_CONFIG);
    });

    it('should remove config from localStorage', () => {
      manager.save({ ...DEFAULT_CONFIG, rounds: 10 });
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();

      manager.reset();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // ==========================================================================
  // FORMAT TIME UTILITY
  // ==========================================================================

  describe('formatTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(ConfigManager.formatTime(0)).toBe('0:00');
      expect(ConfigManager.formatTime(59)).toBe('0:59');
      expect(ConfigManager.formatTime(60)).toBe('1:00');
      expect(ConfigManager.formatTime(65)).toBe('1:05');
      expect(ConfigManager.formatTime(180)).toBe('3:00');
      expect(ConfigManager.formatTime(195)).toBe('3:15');
      expect(ConfigManager.formatTime(599)).toBe('9:59');
      expect(ConfigManager.formatTime(600)).toBe('10:00');
    });

    it('should handle large values', () => {
      expect(ConfigManager.formatTime(3600)).toBe('60:00');
      expect(ConfigManager.formatTime(3661)).toBe('61:01');
    });

    it('should pad seconds with leading zero', () => {
      expect(ConfigManager.formatTime(5)).toBe('0:05');
      expect(ConfigManager.formatTime(125)).toBe('2:05');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded', () => {
      // Mock localStorage.setItem to throw quota error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      expect(() => manager.save(DEFAULT_CONFIG)).toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(STORAGE_KEY, '{"rounds":');
      const newManager = new ConfigManager();

      expect(newManager.get()).toEqual(DEFAULT_CONFIG);
    });
  });

  // ==========================================================================
  // INTEGRATION
  // ==========================================================================

  describe('Integration', () => {
    it('should persist config across multiple manager instances', () => {
      const manager1 = new ConfigManager();
      manager1.save({ ...DEFAULT_CONFIG, rounds: 12, restDuration: 45 });

      const manager2 = new ConfigManager();
      const config = manager2.get();

      expect(config.rounds).toBe(12);
      expect(config.restDuration).toBe(45);
    });

    it('should handle complete workflow', () => {
      // Start with defaults
      expect(manager.get()).toEqual(DEFAULT_CONFIG);

      // Update rounds
      manager.update({ rounds: 8 });
      expect(manager.get().rounds).toBe(8);

      // Adjust via delta
      manager.adjust('rounds', 2);
      expect(manager.get().rounds).toBe(10);

      // Update audio
      manager.updateAudio({ bell: false });
      expect(manager.get().audio.bell).toBe(false);

      // Reset
      manager.reset();
      expect(manager.get()).toEqual(DEFAULT_CONFIG);
    });
  });
});
