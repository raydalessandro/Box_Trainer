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
const DB_VERSION = 2;

export class StorageService {
  private db: IDBPDatabase<BoxTrainerDB> | null = null;

  /**
   * Initialize database connection
   * Opens database and creates object stores if needed
   */
  async init(): Promise<void> {
    try {
      this.db = await openDB<BoxTrainerDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          // Create sessions store if it doesn't exist (v1)
          if (!db.objectStoreNames.contains('sessions')) {
            const store = db.createObjectStore('sessions', { keyPath: 'id' });
            store.createIndex('by-date', 'createdAt');
          }

          // Phase 1 migration: Add new fields to existing sessions (v1 → v2)
          if (oldVersion < 2) {
            // Mark all existing sessions as completed (they were saved on completion)
            // No need to manually iterate - new fields will be undefined for old sessions
            // which is acceptable (isCompleted will be checked with ?? true fallback)
            console.log('[StorageService] Migrated to DB v2: Added session tracking fields');
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

      // Ensure backward compatibility: mark sessions without isCompleted as completed
      return sessions
        .map(session => ({
          ...session,
          isCompleted: session.isCompleted ?? true,  // Old sessions are completed
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
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
   * Get sessions within date range
   */
  async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<WorkoutSession[]> {
    try {
      const db = await this.ensureDB();
      const allSessions = await db.getAll('sessions');

      return allSessions
        .filter(session => {
          const sessionDate = new Date(session.date);
          return sessionDate >= startDate && sessionDate <= endDate;
        })
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('[StorageService] Failed to get sessions by date range:', error);
      return [];
    }
  }

  /**
   * Calculate current and longest streak
   */
  async calculateStreak(): Promise<import('@core/types').StreakData> {
    try {
      const db = await this.ensureDB();
      const sessions = await db.getAll('sessions');

      if (sessions.length === 0) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastWorkoutDate: null,
          streakDates: [],
        };
      }

      // Sort by date (newest first)
      const sortedSessions = sessions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Get unique dates (YYYY-MM-DD format)
      const workoutDates = Array.from(
        new Set(
          sortedSessions.map(s =>
            new Date(s.date).toISOString().split('T')[0]
          )
        )
      ).sort().reverse(); // Newest first

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const streakDates: string[] = [];
      let checkDate = new Date(today);
      let workoutIdx = 0;

      // Safety limit to prevent infinite loops
      const MAX_ITERATIONS = workoutDates.length * 2;
      let iterations = 0;

      while (workoutIdx < workoutDates.length && iterations < MAX_ITERATIONS) {
        iterations++;
        const workoutDate = workoutDates[workoutIdx];
        const checkDateStr = checkDate.toISOString().split('T')[0];

        if (workoutDate === checkDateStr) {
          currentStreak++;
          streakDates.push(workoutDate);
          checkDate.setDate(checkDate.getDate() - 1);
          workoutIdx++; // Move to next workout date
        } else {
          // Check if we missed a day
          const daysDiff = Math.floor(
            (new Date(checkDateStr).getTime() - new Date(workoutDate).getTime()) /
            (1000 * 60 * 60 * 24)
          );

          if (daysDiff > 1) {
            break; // Streak broken
          }

          // Move back one day and try again
          checkDate.setDate(checkDate.getDate() - 1);
          // Don't increment workoutIdx - check same workout against new date
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 1;

      for (let i = 1; i < workoutDates.length; i++) {
        const prevDate = new Date(workoutDates[i - 1]);
        const currDate = new Date(workoutDates[i]);
        const daysDiff = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

      return {
        currentStreak,
        longestStreak,
        lastWorkoutDate: sortedSessions.length > 0 ? new Date(sortedSessions[0].date) : null,
        streakDates,
      };
    } catch (error) {
      console.error('[StorageService] Failed to calculate streak:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        streakDates: [],
      };
    }
  }

  /**
   * Get advanced statistics with filtering
   */
  async getStatsAdvanced(filter: 'week' | 'month' | 'year' | 'all' = 'all'): Promise<import('@core/types').AdvancedStats> {
    try {
      const db = await this.ensureDB();
      let sessions = await db.getAll('sessions');

      // Apply date filter
      const now = new Date();
      if (filter !== 'all') {
        const filterDate = new Date();
        switch (filter) {
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            filterDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        sessions = sessions.filter(s => new Date(s.date) >= filterDate);
      }

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.isCompleted ?? true).length;
      const incompleteSessions = totalSessions - completedSessions;

      const totalTimeSeconds = sessions.reduce((sum, s) =>
        sum + (s.sessionDuration || s.totalDuration || 0), 0
      );
      const totalRounds = sessions.reduce((sum, s) => sum + s.completedRounds, 0);
      const totalPunches = sessions.reduce((sum, s) => sum + s.punchesShown, 0);

      const avgSessionDuration = totalSessions > 0 ? totalTimeSeconds / totalSessions : 0;
      const avgRoundsPerSession = totalSessions > 0 ? totalRounds / totalSessions : 0;
      const avgPunchesPerRound = totalRounds > 0 ? totalPunches / totalRounds : 0;

      // Streak calculation
      const streakData = await this.calculateStreak();

      // Recent trends
      const last7DaysDate = new Date();
      last7DaysDate.setDate(now.getDate() - 7);
      const last7Days = sessions.filter(s => new Date(s.date) >= last7DaysDate).length;

      const last30DaysDate = new Date();
      last30DaysDate.setDate(now.getDate() - 30);
      const last30Days = sessions.filter(s => new Date(s.date) >= last30DaysDate).length;

      // This week (Monday to Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      startOfWeek.setHours(0, 0, 0, 0);
      const thisWeek = sessions.filter(s => new Date(s.date) >= startOfWeek).length;

      // This month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = sessions.filter(s => new Date(s.date) >= startOfMonth).length;

      return {
        totalSessions,
        completedSessions,
        incompleteSessions,
        totalTimeSeconds,
        totalRounds,
        totalPunches,
        avgSessionDuration,
        avgRoundsPerSession,
        avgPunchesPerRound,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        lastWorkoutDate: streakData.lastWorkoutDate,
        last7Days,
        last30Days,
        thisWeek,
        thisMonth,
      };
    } catch (error) {
      console.error('[StorageService] Failed to get advanced stats:', error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        incompleteSessions: 0,
        totalTimeSeconds: 0,
        totalRounds: 0,
        totalPunches: 0,
        avgSessionDuration: 0,
        avgRoundsPerSession: 0,
        avgPunchesPerRound: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        last7Days: 0,
        last30Days: 0,
        thisWeek: 0,
        thisMonth: 0,
      };
    }
  }

  /**
   * Get calendar data for heatmap (last 90 days)
   */
  async getCalendarData(days: number = 90): Promise<import('@core/types').CalendarDay[]> {
    try {
      const sessions = await this.getAllSessions();

      // Create map of date -> sessions
      const dateMap = new Map<string, WorkoutSession[]>();

      sessions.forEach(session => {
        const dateStr = new Date(session.date).toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, []);
        }
        dateMap.get(dateStr)!.push(session);
      });

      // Generate calendar data for last N days
      const calendarDays: import('@core/types').CalendarDay[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const daySessions = dateMap.get(dateStr) || [];
        const sessionCount = daySessions.length;
        const totalDuration = daySessions.reduce((sum, s) =>
          sum + (s.sessionDuration || s.totalDuration || 0), 0
        );

        // Determine intensity based on session count
        let intensity: import('@core/types').CalendarDay['intensity'];
        if (sessionCount === 0) intensity = 'none';
        else if (sessionCount === 1) intensity = 'low';
        else if (sessionCount === 2) intensity = 'medium';
        else intensity = 'high';

        calendarDays.push({
          date: dateStr,
          sessionCount,
          totalDuration,
          intensity,
        });
      }

      return calendarDays;
    } catch (error) {
      console.error('[StorageService] Failed to get calendar data:', error);
      return [];
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
