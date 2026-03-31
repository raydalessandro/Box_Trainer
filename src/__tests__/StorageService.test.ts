/**
 * BOX TRAINER — StorageService Tests
 *
 * Tests for IndexedDB wrapper using fake-indexeddb
 *
 * Coverage:
 * - Database initialization and migration
 * - CRUD operations (addSession, getSession, deleteSession)
 * - Query operations (getAllSessions, getRecentSessions)
 * - Stats aggregation
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from '@storage/StorageService';
import type { WorkoutSession } from '@core/types';
import { DEFAULT_CONFIG } from '@core/types';

// fake-indexeddb is loaded globally in setup.ts

describe('StorageService', () => {
  let service: StorageService;

  // Helper to create mock session
  const createMockSession = (overrides?: Partial<WorkoutSession>): WorkoutSession => ({
    id: `session-${Date.now()}-${Math.random()}`,
    date: new Date(),
    config: DEFAULT_CONFIG,
    completedRounds: 6,
    totalDuration: 1080, // 18 minutes
    punchesShown: 120,
    createdAt: Date.now(),
    ...overrides,
  });

  beforeEach(async () => {
    service = new StorageService();
    await service.init();
  });

  afterEach(async () => {
    // Clean up database
    await service.clearAllSessions();
    service.dispose();
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize database successfully', async () => {
      const newService = new StorageService();
      await expect(newService.init()).resolves.not.toThrow();
      newService.dispose();
    });

    it('should create sessions store on first init', async () => {
      const newService = new StorageService();
      await newService.init();

      // Should be able to add session without error
      const session = createMockSession();
      await expect(newService.addSession(session)).resolves.not.toThrow();

      newService.dispose();
    });

    it('should auto-initialize on first operation', async () => {
      const newService = new StorageService();
      // Don't call init() manually

      const session = createMockSession();
      await expect(newService.addSession(session)).resolves.not.toThrow();

      newService.dispose();
    });
  });

  // ==========================================================================
  // ADD SESSION
  // ==========================================================================

  describe('Add Session', () => {
    it('should add session successfully', async () => {
      const session = createMockSession();

      await service.addSession(session);

      const retrieved = await service.getSession(session.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });

    it('should store all session properties', async () => {
      const session = createMockSession({
        completedRounds: 8,
        totalDuration: 1440,
        punchesShown: 160,
      });

      await service.addSession(session);

      const retrieved = await service.getSession(session.id);
      expect(retrieved?.completedRounds).toBe(8);
      expect(retrieved?.totalDuration).toBe(1440);
      expect(retrieved?.punchesShown).toBe(160);
    });

    it('should store session config', async () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        rounds: 10,
        roundDuration: 120,
      };

      const session = createMockSession({ config: customConfig });

      await service.addSession(session);

      const retrieved = await service.getSession(session.id);
      expect(retrieved?.config.rounds).toBe(10);
      expect(retrieved?.config.roundDuration).toBe(120);
    });

    it('should add multiple sessions', async () => {
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });
      const session3 = createMockSession({ id: 'session-3' });

      await service.addSession(session1);
      await service.addSession(session2);
      await service.addSession(session3);

      const allSessions = await service.getAllSessions();
      expect(allSessions.length).toBe(3);
    });

    it('should reject duplicate session IDs', async () => {
      const session = createMockSession({ id: 'duplicate-id' });

      await service.addSession(session);

      // Adding same ID should throw
      await expect(service.addSession(session)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // GET SESSION
  // ==========================================================================

  describe('Get Session', () => {
    it('should retrieve session by ID', async () => {
      const session = createMockSession({ id: 'test-session' });
      await service.addSession(session);

      const retrieved = await service.getSession('test-session');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-session');
    });

    it('should return undefined for non-existent session', async () => {
      const retrieved = await service.getSession('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve correct session among multiple', async () => {
      await service.addSession(createMockSession({ id: 'session-1' }));
      await service.addSession(createMockSession({ id: 'session-2' }));
      await service.addSession(createMockSession({ id: 'session-3' }));

      const retrieved = await service.getSession('session-2');
      expect(retrieved?.id).toBe('session-2');
    });
  });

  // ==========================================================================
  // GET ALL SESSIONS
  // ==========================================================================

  describe('Get All Sessions', () => {
    it('should return empty array when no sessions', async () => {
      const sessions = await service.getAllSessions();
      expect(sessions).toEqual([]);
    });

    it('should return all sessions', async () => {
      await service.addSession(createMockSession());
      await service.addSession(createMockSession());
      await service.addSession(createMockSession());

      const sessions = await service.getAllSessions();
      expect(sessions.length).toBe(3);
    });

    it('should sort sessions by date (newest first)', async () => {
      const now = Date.now();

      const oldSession = createMockSession({
        id: 'old',
        createdAt: now - 10000,
      });

      const midSession = createMockSession({
        id: 'mid',
        createdAt: now - 5000,
      });

      const newSession = createMockSession({
        id: 'new',
        createdAt: now,
      });

      // Add in random order
      await service.addSession(midSession);
      await service.addSession(newSession);
      await service.addSession(oldSession);

      const sessions = await service.getAllSessions();

      expect(sessions[0].id).toBe('new');
      expect(sessions[1].id).toBe('mid');
      expect(sessions[2].id).toBe('old');
    });
  });

  // ==========================================================================
  // GET RECENT SESSIONS
  // ==========================================================================

  describe('Get Recent Sessions', () => {
    it('should return limited number of sessions', async () => {
      // Add 15 sessions
      for (let i = 0; i < 15; i++) {
        await service.addSession(
          createMockSession({
            id: `session-${i}`,
            createdAt: Date.now() + i,
          })
        );
      }

      const recent = await service.getRecentSessions(10);
      expect(recent.length).toBe(10);
    });

    it('should return newest sessions first', async () => {
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        await service.addSession(
          createMockSession({
            id: `session-${i}`,
            createdAt: now + i * 1000,
          })
        );
      }

      const recent = await service.getRecentSessions(3);

      expect(recent.length).toBe(3);
      expect(recent[0].id).toBe('session-4');
      expect(recent[1].id).toBe('session-3');
      expect(recent[2].id).toBe('session-2');
    });

    it('should use default limit of 10', async () => {
      for (let i = 0; i < 15; i++) {
        await service.addSession(createMockSession({ id: `session-${i}` }));
      }

      const recent = await service.getRecentSessions();
      expect(recent.length).toBe(10);
    });

    it('should return all sessions if count is less than limit', async () => {
      await service.addSession(createMockSession());
      await service.addSession(createMockSession());

      const recent = await service.getRecentSessions(10);
      expect(recent.length).toBe(2);
    });

    it('should return empty array when no sessions', async () => {
      const recent = await service.getRecentSessions(5);
      expect(recent).toEqual([]);
    });
  });

  // ==========================================================================
  // DELETE SESSION
  // ==========================================================================

  describe('Delete Session', () => {
    it('should delete session by ID', async () => {
      const session = createMockSession({ id: 'to-delete' });
      await service.addSession(session);

      await service.deleteSession('to-delete');

      const retrieved = await service.getSession('to-delete');
      expect(retrieved).toBeUndefined();
    });

    it('should not affect other sessions', async () => {
      await service.addSession(createMockSession({ id: 'session-1' }));
      await service.addSession(createMockSession({ id: 'session-2' }));
      await service.addSession(createMockSession({ id: 'session-3' }));

      await service.deleteSession('session-2');

      const sessions = await service.getAllSessions();
      expect(sessions.length).toBe(2);
      expect(sessions.find((s) => s.id === 'session-1')).toBeDefined();
      expect(sessions.find((s) => s.id === 'session-3')).toBeDefined();
    });

    it('should handle deleting non-existent session', async () => {
      await expect(service.deleteSession('non-existent')).resolves.not.toThrow();
    });

    it('should handle multiple deletes', async () => {
      await service.addSession(createMockSession({ id: 'session-1' }));
      await service.addSession(createMockSession({ id: 'session-2' }));

      await service.deleteSession('session-1');
      await service.deleteSession('session-2');

      const sessions = await service.getAllSessions();
      expect(sessions.length).toBe(0);
    });
  });

  // ==========================================================================
  // CLEAR ALL SESSIONS
  // ==========================================================================

  describe('Clear All Sessions', () => {
    it('should clear all sessions', async () => {
      await service.addSession(createMockSession());
      await service.addSession(createMockSession());
      await service.addSession(createMockSession());

      await service.clearAllSessions();

      const sessions = await service.getAllSessions();
      expect(sessions.length).toBe(0);
    });

    it('should handle clearing when no sessions exist', async () => {
      await expect(service.clearAllSessions()).resolves.not.toThrow();
    });

    it('should allow adding sessions after clear', async () => {
      await service.addSession(createMockSession());
      await service.clearAllSessions();

      const newSession = createMockSession({ id: 'after-clear' });
      await service.addSession(newSession);

      const retrieved = await service.getSession('after-clear');
      expect(retrieved).toBeDefined();
    });
  });

  // ==========================================================================
  // STATS AGGREGATION
  // ==========================================================================

  describe('Get Stats', () => {
    it('should return zero stats when no sessions', async () => {
      const stats = await service.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalRounds).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.totalPunches).toBe(0);
      expect(stats.averageRounds).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });

    it('should calculate total sessions', async () => {
      await service.addSession(createMockSession());
      await service.addSession(createMockSession());
      await service.addSession(createMockSession());

      const stats = await service.getStats();
      expect(stats.totalSessions).toBe(3);
    });

    it('should calculate total rounds', async () => {
      await service.addSession(createMockSession({ completedRounds: 6 }));
      await service.addSession(createMockSession({ completedRounds: 8 }));
      await service.addSession(createMockSession({ completedRounds: 4 }));

      const stats = await service.getStats();
      expect(stats.totalRounds).toBe(18);
    });

    it('should calculate total duration', async () => {
      await service.addSession(createMockSession({ totalDuration: 1080 }));
      await service.addSession(createMockSession({ totalDuration: 900 }));
      await service.addSession(createMockSession({ totalDuration: 720 }));

      const stats = await service.getStats();
      expect(stats.totalDuration).toBe(2700);
    });

    it('should calculate total punches', async () => {
      await service.addSession(createMockSession({ punchesShown: 120 }));
      await service.addSession(createMockSession({ punchesShown: 100 }));
      await service.addSession(createMockSession({ punchesShown: 80 }));

      const stats = await service.getStats();
      expect(stats.totalPunches).toBe(300);
    });

    it('should calculate average rounds', async () => {
      await service.addSession(createMockSession({ completedRounds: 6 }));
      await service.addSession(createMockSession({ completedRounds: 8 }));
      await service.addSession(createMockSession({ completedRounds: 4 }));

      const stats = await service.getStats();
      expect(stats.averageRounds).toBeCloseTo(6, 1);
    });

    it('should calculate average duration', async () => {
      await service.addSession(createMockSession({ totalDuration: 1200 }));
      await service.addSession(createMockSession({ totalDuration: 900 }));
      await service.addSession(createMockSession({ totalDuration: 900 }));

      const stats = await service.getStats();
      expect(stats.averageDuration).toBeCloseTo(1000, 1);
    });

    it('should handle mixed session data', async () => {
      await service.addSession(
        createMockSession({
          completedRounds: 6,
          totalDuration: 1080,
          punchesShown: 120,
        })
      );

      await service.addSession(
        createMockSession({
          completedRounds: 3,
          totalDuration: 540,
          punchesShown: 60,
        })
      );

      const stats = await service.getStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.totalRounds).toBe(9);
      expect(stats.totalDuration).toBe(1620);
      expect(stats.totalPunches).toBe(180);
      expect(stats.averageRounds).toBeCloseTo(4.5, 1);
      expect(stats.averageDuration).toBeCloseTo(810, 1);
    });
  });

  // ==========================================================================
  // DATABASE PERSISTENCE
  // ==========================================================================

  describe('Database Persistence', () => {
    it('should persist data across service instances', async () => {
      const session = createMockSession({ id: 'persistent' });
      await service.addSession(session);
      service.dispose();

      // Create new service instance
      const newService = new StorageService();
      await newService.init();

      const retrieved = await newService.getSession('persistent');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('persistent');

      newService.dispose();
    });

    it('should maintain data after dispose and reinit', async () => {
      await service.addSession(createMockSession({ id: 'session-1' }));
      await service.addSession(createMockSession({ id: 'session-2' }));

      service.dispose();
      await service.init();

      const sessions = await service.getAllSessions();
      expect(sessions.length).toBe(2);
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle errors gracefully in getAllSessions', async () => {
      // Dispose to close DB, then try to get sessions
      service.dispose();

      // Should not throw, should return empty array
      const sessions = await service.getAllSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should handle errors gracefully in getStats', async () => {
      service.dispose();

      // Should not throw, should return zero stats
      const stats = await service.getStats();
      expect(stats.totalSessions).toBe(0);
    });

    it('should throw on addSession failure', async () => {
      service.dispose();

      const session = createMockSession();
      await expect(service.addSession(session)).rejects.toThrow();
    });

    it('should throw on deleteSession failure', async () => {
      service.dispose();

      await expect(service.deleteSession('any-id')).rejects.toThrow();
    });
  });

  // ==========================================================================
  // DISPOSAL
  // ==========================================================================

  describe('Disposal', () => {
    it('should close database connection', () => {
      expect(() => service.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls', () => {
      service.dispose();
      expect(() => service.dispose()).not.toThrow();
    });

    it('should allow reinit after dispose', async () => {
      service.dispose();
      await expect(service.init()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // INDEXING
  // ==========================================================================

  describe('Indexing', () => {
    it('should use by-date index for efficient queries', async () => {
      // Add many sessions
      for (let i = 0; i < 20; i++) {
        await service.addSession(
          createMockSession({
            id: `session-${i}`,
            createdAt: Date.now() + i * 1000,
          })
        );
      }

      // Get recent should use index (no way to test directly, but verify behavior)
      const recent = await service.getRecentSessions(5);
      expect(recent.length).toBe(5);

      // Verify correct order (newest first)
      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i].createdAt).toBeGreaterThan(recent[i + 1].createdAt);
      }
    });
  });

  // ==========================================================================
  // INTEGRATION
  // ==========================================================================

  describe('Integration', () => {
    it('should handle complete workout lifecycle', async () => {
      // Add session
      const session = createMockSession({
        id: 'workout-1',
        completedRounds: 6,
        totalDuration: 1080,
        punchesShown: 120,
      });

      await service.addSession(session);

      // Retrieve session
      const retrieved = await service.getSession('workout-1');
      expect(retrieved).toBeDefined();

      // Check stats
      let stats = await service.getStats();
      expect(stats.totalSessions).toBe(1);
      expect(stats.totalRounds).toBe(6);

      // Add another session
      await service.addSession(
        createMockSession({
          id: 'workout-2',
          completedRounds: 8,
          totalDuration: 1440,
          punchesShown: 160,
        })
      );

      // Check updated stats
      stats = await service.getStats();
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalRounds).toBe(14);

      // Get all sessions
      const allSessions = await service.getAllSessions();
      expect(allSessions.length).toBe(2);

      // Delete one session
      await service.deleteSession('workout-1');

      // Verify deletion
      stats = await service.getStats();
      expect(stats.totalSessions).toBe(1);
      expect(stats.totalRounds).toBe(8);
    });
  });
});
