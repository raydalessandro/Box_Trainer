/**
 * BOX TRAINER — Storage Service
 * IndexedDB wrapper for workout history using idb library
 * Pattern based on StreetMark StorageService
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { WorkoutSession } from '@core/types';

// Database Schema
interface BoxTrainerDB extends DBSchema {
  sessions: {
    key: string;
    value: WorkoutSession;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'boxtrainer-db';
const DB_VERSION = 1;

export class StorageService {
  private db: IDBPDatabase<BoxTrainerDB> | null = null;

  /**
   * Initialize database connection
   * Opens database and creates object stores if needed
   */
  async init(): Promise<void> {
    try {
      this.db = await openDB<BoxTrainerDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create sessions store if it doesn't exist
          if (!db.objectStoreNames.contains('sessions')) {
            const store = db.createObjectStore('sessions', { keyPath: 'id' });
            store.createIndex('by-date', 'createdAt');
          }
        },
      });
    } catch (error) {
      console.error('[StorageService] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBPDatabase<BoxTrainerDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database initialization failed');
    }
    return this.db;
  }

  /**
   * Save workout session
   * @param session - Complete workout session data
   */
  async addSession(session: WorkoutSession): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.add('sessions', session);
      console.log('[StorageService] Session saved:', session.id);
    } catch (error) {
      console.error('[StorageService] Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Get all workout sessions
   * @returns Array of all sessions sorted by date (newest first)
   */
  async getAllSessions(): Promise<WorkoutSession[]> {
    try {
      const db = await this.ensureDB();
      const sessions = await db.getAll('sessions');
      return sessions.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('[StorageService] Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Get recent workout sessions
   * @param limit - Maximum number of sessions to return
   * @returns Array of most recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<WorkoutSession[]> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('sessions', 'readonly');
      const index = tx.store.index('by-date');

      // Get all sessions sorted by date (newest first)
      const sessions: WorkoutSession[] = [];
      let cursor = await index.openCursor(null, 'prev');

      while (cursor && sessions.length < limit) {
        sessions.push(cursor.value);
        cursor = await cursor.continue();
      }

      return sessions;
    } catch (error) {
      console.error('[StorageService] Failed to get recent sessions:', error);
      return [];
    }
  }

  /**
   * Get specific session by ID
   * @param id - Session ID
   * @returns Session data or undefined if not found
   */
  async getSession(id: string): Promise<WorkoutSession | undefined> {
    try {
      const db = await this.ensureDB();
      return await db.get('sessions', id);
    } catch (error) {
      console.error('[StorageService] Failed to get session:', error);
      return undefined;
    }
  }

  /**
   * Delete specific session
   * @param id - Session ID to delete
   */
  async deleteSession(id: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.delete('sessions', id);
      console.log('[StorageService] Session deleted:', id);
    } catch (error) {
      console.error('[StorageService] Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Clear all workout history
   * Use with caution - this is irreversible
   */
  async clearAllSessions(): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.clear('sessions');
      console.log('[StorageService] All sessions cleared');
    } catch (error) {
      console.error('[StorageService] Failed to clear sessions:', error);
      throw error;
    }
  }

  /**
   * Get workout statistics
   * @returns Summary statistics from all sessions
   */
  async getStats(): Promise<{
    totalSessions: number;
    totalRounds: number;
    totalDuration: number;
    totalPunches: number;
    averageRounds: number;
    averageDuration: number;
  }> {
    try {
      const sessions = await this.getAllSessions();

      const totalSessions = sessions.length;
      const totalRounds = sessions.reduce((sum, s) => sum + s.completedRounds, 0);
      const totalDuration = sessions.reduce((sum, s) => sum + s.totalDuration, 0);
      const totalPunches = sessions.reduce((sum, s) => sum + s.punchesShown, 0);

      return {
        totalSessions,
        totalRounds,
        totalDuration,
        totalPunches,
        averageRounds: totalSessions > 0 ? totalRounds / totalSessions : 0,
        averageDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
      };
    } catch (error) {
      console.error('[StorageService] Failed to get stats:', error);
      return {
        totalSessions: 0,
        totalRounds: 0,
        totalDuration: 0,
        totalPunches: 0,
        averageRounds: 0,
        averageDuration: 0,
      };
    }
  }

  /**
   * Close database connection
   */
  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[StorageService] Database closed');
    }
  }
}
