import React from 'react';
import { WorkoutSession } from '@core/types';

interface SessionHistoryProps {
  isVisible: boolean;
  sessions: WorkoutSession[];
  onClose: () => void;
}

// Format date as "31 Mar 2026 - 23:15"
function formatDate(date: Date): string {
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} - ${hours}:${minutes}`;
}

// Format duration as "MM:SS" or "HH:MM:SS"
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function SessionHistory({ isVisible, sessions, onClose }: SessionHistoryProps) {
  if (!isVisible) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={`session-history-overlay ${isVisible ? 'show' : ''}`} onClick={handleBackdropClick}>
      <div className="session-history-panel">
        <div className="session-history-header">
          <h2 className="session-history-title">📊 STORICO ALLENAMENTI</h2>
          <button className="session-history-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="session-list">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-text">Nessun allenamento registrato</div>
              <div className="empty-hint">Completa il tuo primo allenamento per vedere lo storico</div>
            </div>
          ) : (
            sessions.map((session, index) => (
              <div key={index} className="session-item">
                <div className="session-header">
                  <span className="session-icon">🥊</span>
                  <span className="session-date">{formatDate(session.date)}</span>
                </div>
                <div className="session-details">
                  {session.completedRounds} round · {formatDuration(session.sessionDuration || session.totalDuration)} · {session.punchesShown} colpi
                </div>
                <div className="session-status">
                  {session.isCompleted ? '✓ Completato' : '⚠ Interrotto'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
