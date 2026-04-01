/**
 * BOX TRAINER — Stats Overlay Component
 * Full-screen analytics dashboard with summary, calendar, trends, and records
 */

import { AdvancedStats, CalendarDay } from '@core/types';
import { CalendarHeatmap } from './CalendarHeatmap';

interface StatsOverlayProps {
  isVisible: boolean;
  stats: AdvancedStats | null;
  calendarData: CalendarDay[];
  onClose: () => void;
}

export function StatsOverlay({ isVisible, stats, calendarData, onClose }: StatsOverlayProps) {
  if (!isVisible || !stats) return null;

  // Format time as hours:minutes
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={`stats-overlay ${isVisible ? 'show' : ''}`} onClick={handleBackdropClick}>
      <div className="stats-panel">
        {/* Header */}
        <div className="stats-header">
          <h2 className="stats-title">📊 STATISTICHE</h2>
          <button className="stats-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Summary Cards */}
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">Sessioni</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatTime(stats.totalTimeSeconds)}</div>
            <div className="stat-label">Allenato</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.currentStreak > 0 && '🔥'} {stats.currentStreak}
            </div>
            <div className="stat-label">Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalPunches}</div>
            <div className="stat-label">Colpi</div>
          </div>
        </div>

        {/* Calendar Heatmap */}
        <div className="stats-section">
          <h3 className="stats-section-title">📅 CALENDARIO ATTIVITÀ</h3>
          <CalendarHeatmap data={calendarData} />
        </div>

        {/* Trends */}
        <div className="stats-section">
          <h3 className="stats-section-title">📈 TENDENZE</h3>
          <div className="stats-trends">
            <div className="trend-row">
              <span className="trend-label">Questa settimana</span>
              <span className="trend-value">{stats.thisWeek}</span>
            </div>
            <div className="trend-row">
              <span className="trend-label">Ultimi 7 giorni</span>
              <span className="trend-value">{stats.last7Days}</span>
            </div>
            <div className="trend-row">
              <span className="trend-label">Questo mese</span>
              <span className="trend-value">{stats.thisMonth}</span>
            </div>
            <div className="trend-row">
              <span className="trend-label">Ultimi 30 giorni</span>
              <span className="trend-value">{stats.last30Days}</span>
            </div>
          </div>
        </div>

        {/* Personal Bests */}
        <div className="stats-section">
          <h3 className="stats-section-title">🏆 RECORD PERSONALI</h3>
          <div className="stats-records">
            <div className="record-item">
              <span className="record-label">Streak più lungo</span>
              <span className="record-value">{stats.longestStreak} giorni</span>
            </div>
            <div className="record-item">
              <span className="record-label">Media round/sessione</span>
              <span className="record-value">{stats.avgRoundsPerSession.toFixed(1)}</span>
            </div>
            <div className="record-item">
              <span className="record-label">Media colpi/round</span>
              <span className="record-value">{stats.avgPunchesPerRound.toFixed(1)}</span>
            </div>
            <div className="record-item">
              <span className="record-label">Media durata sessione</span>
              <span className="record-value">{formatTime(stats.avgSessionDuration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
