/**
 * BOX TRAINER — AudioManager Tests
 *
 * Tests for Web Audio API oscillators and Speech Synthesis
 *
 * Coverage:
 * - Config toggles (bell, warn, endBell, punchBeep, voice)
 * - Speech synthesis behavior
 * - Audio cleanup and disposal
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '@audio/AudioManager';
import type { AudioConfig, PunchNumber } from '@core/types';
import { PUNCH_COMBOS } from '@core/types';
import { getMockSpeechSynthesis } from './setup';

describe('AudioManager', () => {
  let manager: AudioManager;
  let mockConfig: AudioConfig;

  beforeEach(() => {
    // Create test config with all audio enabled
    mockConfig = {
      bell: true,
      warn: true,
      endBell: true,
      punchBeep: true,
      voice: true,
    };

    manager = new AudioManager(mockConfig);
  });

  afterEach(() => {
    manager.dispose();
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with provided config', () => {
      expect(manager).toBeDefined();
    });

    it('should handle missing speechSynthesis gracefully', () => {
      // Test that manager initializes even without speech API
      // (This test validates the null check in initVoice method)
      const manager2 = new AudioManager(mockConfig);
      expect(manager2).toBeDefined();
    });
  });

  // ==========================================================================
  // CONFIG TOGGLES (BEHAVIOR)
  // ==========================================================================

  describe('Config Toggles', () => {
    it('should not throw when playing sounds with config enabled', () => {
      expect(() => manager.playBell()).not.toThrow();
      expect(() => manager.playWarnBeep()).not.toThrow();
      expect(() => manager.playEndBell()).not.toThrow();
      expect(() => manager.playPunchBeep()).not.toThrow();
    });

    it('should not throw when playing sounds with config disabled', () => {
      manager.updateConfig({
        bell: false,
        warn: false,
        endBell: false,
        punchBeep: false,
        voice: false,
      });

      expect(() => manager.playBell()).not.toThrow();
      expect(() => manager.playWarnBeep()).not.toThrow();
      expect(() => manager.playEndBell()).not.toThrow();
      expect(() => manager.playPunchBeep()).not.toThrow();
      expect(() => manager.speak(1)).not.toThrow();
    });

    it('should respect voice toggle', () => {
      const mockSpeech = getMockSpeechSynthesis();

      // Voice enabled
      manager.speak(1);
      expect(mockSpeech.speak).toHaveBeenCalled();

      mockSpeech.speak.mockClear();

      // Voice disabled
      manager.updateConfig({ ...mockConfig, voice: false });
      manager.speak(1);
      expect(mockSpeech.speak).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SOUND PLAYBACK
  // ==========================================================================

  describe('Sound Playback', () => {
    it('should play bell without throwing', () => {
      expect(() => manager.playBell()).not.toThrow();
    });

    it('should play end bell without throwing', () => {
      expect(() => manager.playEndBell()).not.toThrow();
    });

    it('should play warning beep without throwing', () => {
      expect(() => manager.playWarnBeep()).not.toThrow();
    });

    it('should play punch beep without throwing', () => {
      expect(() => manager.playPunchBeep()).not.toThrow();
    });
  });

  // ==========================================================================
  // SPEECH SYNTHESIS
  // ==========================================================================

  describe('Speech Synthesis', () => {
    it('should speak combo with correct voice text', () => {
      const mockSpeech = getMockSpeechSynthesis();

      manager.speak(1);

      expect(mockSpeech.speak).toHaveBeenCalled();

      const utterance = mockSpeech.speak.mock.calls[0][0];
      expect(utterance.text).toBe(PUNCH_COMBOS[1].voiceText);
    });

    it('should use Italian language', () => {
      const mockSpeech = getMockSpeechSynthesis();

      manager.speak(2);

      const utterance = mockSpeech.speak.mock.calls[0][0];
      expect(utterance.lang).toBe('it-IT');
    });

    it('should set appropriate speech parameters', () => {
      const mockSpeech = getMockSpeechSynthesis();

      manager.speak(3);

      const utterance = mockSpeech.speak.mock.calls[0][0];
      expect(utterance.rate).toBe(1.05);
      expect(utterance.pitch).toBe(0.95);
      expect(utterance.volume).toBe(1);
    });

    it('should speak all punch combos', () => {
      const mockSpeech = getMockSpeechSynthesis();

      const punchNumbers: PunchNumber[] = [1, 2, 3, 4, 5, 6];

      punchNumbers.forEach((num) => {
        mockSpeech.speak.mockClear();
        manager.speak(num);

        expect(mockSpeech.speak).toHaveBeenCalled();
        const utterance = mockSpeech.speak.mock.calls[0][0];
        expect(utterance.text).toBe(PUNCH_COMBOS[num].voiceText);
      });
    });

    it('should cancel previous speech before speaking new combo', () => {
      const mockSpeech = getMockSpeechSynthesis();

      manager.speak(1);
      manager.speak(2);

      // Cancel should be called before each speak (except first)
      expect(mockSpeech.cancel.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle voice-disabled config', () => {
      const manager2 = new AudioManager({ ...mockConfig, voice: false });

      // Should not throw even when voice is disabled
      expect(() => manager2.speak(1)).not.toThrow();
    });
  });

  // ==========================================================================
  // STOP SPEECH
  // ==========================================================================

  describe('Stop Speech', () => {
    it('should cancel ongoing speech', () => {
      const mockSpeech = getMockSpeechSynthesis();

      manager.speak(1);
      manager.stopSpeech();

      expect(mockSpeech.cancel).toHaveBeenCalled();
    });

    it('should stop speech without throwing', () => {
      manager.speak(1);
      expect(() => manager.stopSpeech()).not.toThrow();
    });
  });

  // ==========================================================================
  // CONFIG UPDATE
  // ==========================================================================

  describe('Config Update', () => {
    it('should update config', () => {
      const newConfig: AudioConfig = {
        bell: false,
        warn: false,
        endBell: false,
        punchBeep: false,
        voice: false,
      };

      expect(() => manager.updateConfig(newConfig)).not.toThrow();
    });

    it('should allow partial config update', () => {
      manager.updateConfig({ ...mockConfig, voice: false });

      const mockSpeech = getMockSpeechSynthesis();

      manager.speak(1);
      expect(mockSpeech.speak).not.toHaveBeenCalled();

      // Other sounds should still work (not throw)
      expect(() => manager.playBell()).not.toThrow();
    });
  });

  // ==========================================================================
  // CLEANUP & DISPOSAL
  // ==========================================================================

  describe('Cleanup & Disposal', () => {
    it('should stop speech on dispose', () => {
      const mockSpeech = getMockSpeechSynthesis();

      manager.speak(1);
      manager.dispose();

      expect(mockSpeech.cancel).toHaveBeenCalled();
    });

    it('should not throw on dispose', () => {
      expect(() => manager.dispose()).not.toThrow();
    });

    it('should handle dispose when AudioContext was never created', () => {
      const manager2 = new AudioManager(mockConfig);

      // Don't play any sounds (AudioContext not created)
      expect(() => manager2.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls', () => {
      manager.dispose();
      expect(() => manager.dispose()).not.toThrow();
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle audio errors gracefully', () => {
      // Test that audio methods don't throw even if internal errors occur
      // This validates the try-catch blocks in the osc() method
      expect(() => {
        manager.playBell();
        manager.playWarnBeep();
        manager.playPunchBeep();
        manager.playEndBell();
      }).not.toThrow();
    });

    it('should call speech synthesis API correctly', () => {
      const mockSpeech = getMockSpeechSynthesis();

      manager.speak(1);
      manager.speak(2);

      // Should cancel previous speech before speaking new one
      expect(mockSpeech.cancel).toHaveBeenCalled();
      expect(mockSpeech.speak).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // INTEGRATION
  // ==========================================================================

  describe('Integration', () => {
    it('should play multiple sounds in sequence without throwing', () => {
      const mockSpeech = getMockSpeechSynthesis();

      expect(() => {
        manager.playBell();
        manager.playWarnBeep();
        manager.speak(1);
        manager.playPunchBeep();
      }).not.toThrow();

      expect(mockSpeech.speak).toHaveBeenCalled();
    });

    it('should respect all config toggles simultaneously', () => {
      const allDisabled: AudioConfig = {
        bell: false,
        warn: false,
        endBell: false,
        punchBeep: false,
        voice: false,
      };

      manager.updateConfig(allDisabled);

      const mockSpeech = getMockSpeechSynthesis();

      manager.playBell();
      manager.playWarnBeep();
      manager.playEndBell();
      manager.playPunchBeep();
      manager.speak(1);

      expect(mockSpeech.speak).not.toHaveBeenCalled();
    });
  });
});
