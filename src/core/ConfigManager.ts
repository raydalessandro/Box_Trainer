/**
 * BOX TRAINER — Configuration Manager
 * Handles workout settings with localStorage persistence
 */

import type { WorkoutConfig, AudioConfig } from './types';
import { DEFAULT_CONFIG, VALIDATION } from './types';

const STORAGE_KEY = 'boxtrainer_config';

export class ConfigManager {
  private config: WorkoutConfig;

  constructor() {
    this.config = this.load();
  }

  /**
   * Load config from localStorage or return defaults
   */
  load(): WorkoutConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { ...DEFAULT_CONFIG };

      const parsed = JSON.parse(stored);

      // Validate loaded config
      if (this.validate(parsed)) {
        return parsed;
      }

      console.warn('[ConfigManager] Invalid stored config, using defaults');
      return { ...DEFAULT_CONFIG };
    } catch (error) {
      console.error('[ConfigManager] Failed to load config:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save config to localStorage
   */
  save(config: WorkoutConfig): void {
    try {
      if (!this.validate(config)) {
        throw new Error('Invalid config');
      }

      this.config = config;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('[ConfigManager] Failed to save config:', error);
      throw error;
    }
  }

  /**
   * Get current config
   */
  get(): WorkoutConfig {
    return { ...this.config };
  }

  /**
   * Update config (partial update)
   */
  update(partial: Partial<WorkoutConfig>): WorkoutConfig {
    const updated = { ...this.config, ...partial };
    this.save(updated);
    return updated;
  }

  /**
   * Update audio settings
   */
  updateAudio(partial: Partial<AudioConfig>): WorkoutConfig {
    const updated = {
      ...this.config,
      audio: { ...this.config.audio, ...partial },
    };
    this.save(updated);
    return updated;
  }

  /**
   * Reset to defaults
   */
  reset(): WorkoutConfig {
    this.config = { ...DEFAULT_CONFIG };
    localStorage.removeItem(STORAGE_KEY);
    return this.config;
  }

  /**
   * Validate config structure and values
   */
  validate(config: Partial<WorkoutConfig>): boolean {
    if (!config) return false;

    // Check numeric ranges
    if (config.rounds !== undefined) {
      const { min, max } = VALIDATION.rounds;
      if (config.rounds < min || config.rounds > max) return false;
    }

    if (config.roundDuration !== undefined) {
      const { min, max } = VALIDATION.roundDuration;
      if (config.roundDuration < min || config.roundDuration > max) return false;
    }

    if (config.restDuration !== undefined) {
      const { min, max } = VALIDATION.restDuration;
      if (config.restDuration < min || config.restDuration > max) return false;
    }

    if (config.numberInterval !== undefined) {
      const { min, max } = VALIDATION.numberInterval;
      if (config.numberInterval < min || config.numberInterval > max) return false;
    }

    // Check audio config structure
    if (config.audio) {
      const required = ['bell', 'warn', 'endBell', 'punchBeep', 'voice'];
      for (const key of required) {
        if (typeof config.audio[key as keyof AudioConfig] !== 'boolean') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Clamp value to valid range
   */
  clamp(value: number, type: keyof typeof VALIDATION): number {
    const { min, max } = VALIDATION[type];
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Adjust config value with delta (for +/- buttons)
   */
  adjust(
    type: 'rounds' | 'roundDuration' | 'restDuration' | 'numberInterval',
    delta: number
  ): WorkoutConfig {
    const newValue = this.clamp(this.config[type] + delta, type);
    return this.update({ [type]: newValue });
  }

  /**
   * Format seconds to MM:SS
   */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
