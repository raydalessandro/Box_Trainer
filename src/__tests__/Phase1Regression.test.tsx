/**
 * BOX TRAINER — Phase 1 Regression Tests
 *
 * Tests to prevent Phase 1 bugs from reoccurring:
 * 1. SessionHistory overlay not opening (.show class not applied)
 * 2. SessionManager warning on updateMetrics when no active session
 * 3. ConfirmModal integration (replacing browser confirm)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionHistory } from '@components/SessionHistory';
import { SessionManager } from '@core/SessionManager';
import { ConfirmModal } from '@components/ConfirmModal';
import type { WorkoutSession } from '@core/types';

describe('Phase 1 Regression Tests', () => {
  describe('SessionHistory Overlay Rendering', () => {
    it('should apply .show class when isVisible is true', () => {
      const { container } = render(
        <SessionHistory
          isVisible={true}
          sessions={[]}
          onClose={() => {}}
        />
      );

      const overlay = container.querySelector('.session-history-overlay');
      expect(overlay).toHaveClass('show');
    });

    it('should not render when isVisible is false', () => {
      const { container } = render(
        <SessionHistory
          isVisible={false}
          sessions={[]}
          onClose={() => {}}
        />
      );

      // Component returns null when not visible
      expect(container.firstChild).toBeNull();
    });

    it('should render session list when visible with sessions', () => {
      const mockSessions: WorkoutSession[] = [
        {
          id: 'test-1',
          date: new Date('2026-04-01T10:00:00'),
          completedRounds: 5,
          sessionDuration: 600,
          punchesShown: 42,
          isCompleted: true,
          config: {
            rounds: 5,
            roundDuration: 120,
            restDuration: 30,
            punchInterval: 5,
            playSound: true,
            template: null,
          },
          totalDuration: 600,
          createdAt: Date.now(),
        }
      ];

      render(
        <SessionHistory
          isVisible={true}
          sessions={mockSessions}
          onClose={() => {}}
        />
      );

      // Check for round information
      expect(screen.getByText(/5 round/i)).toBeInTheDocument();

      // Check for completion status
      expect(screen.getByText(/✓ Completato/i)).toBeInTheDocument();
    });

    it('should handle backdrop click to close', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <SessionHistory
          isVisible={true}
          sessions={[]}
          onClose={handleClose}
        />
      );

      const overlay = container.querySelector('.session-history-overlay');
      fireEvent.click(overlay!);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking inside the panel', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <SessionHistory
          isVisible={true}
          sessions={[]}
          onClose={handleClose}
        />
      );

      const panel = container.querySelector('.session-history-panel');
      fireEvent.click(panel!);

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('SessionManager Silent Behavior', () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager();
    });

    it('should not throw or warn when updateMetrics called without active session', () => {
      const consoleSpy = vi.spyOn(console, 'warn');

      // Should not throw
      expect(() => {
        sessionManager.updateMetrics(5, 20);
      }).not.toThrow();

      // Should not log warning
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should silently ignore updateMetrics when session not started', () => {
      sessionManager.updateMetrics(10, 50);

      // Metrics should not be stored (no session active)
      const metrics = sessionManager.getMetrics();
      expect(metrics.completedRounds).toBe(0);
      expect(metrics.punchesShown).toBe(0);
    });

    it('should update metrics correctly when session is active', () => {
      sessionManager.startSession();
      sessionManager.updateMetrics(5, 30);

      const metrics = sessionManager.getMetrics();
      expect(metrics.completedRounds).toBe(5);
      expect(metrics.punchesShown).toBe(30);
    });

    it('should reset metrics to zero after updateMetrics with no active session', () => {
      // Start a session, update metrics, then end it
      sessionManager.startSession();
      sessionManager.updateMetrics(3, 15);

      sessionManager.endSession(
        {
          rounds: 5,
          roundDuration: 120,
          restDuration: 30,
          punchInterval: 5,
          playSound: true,
          template: null,
        },
        {
          currentRound: 3,
          totalRounds: 5,
          timeLeft: 0,
          state: 'done',
        }
      );

      // Now try to update metrics without active session
      sessionManager.updateMetrics(10, 50);

      // Should be reset to zero (not updated)
      const metrics = sessionManager.getMetrics();
      expect(metrics.completedRounds).toBe(0);
      expect(metrics.punchesShown).toBe(0);
    });

    it('should return false for isActive() when updateMetrics is called without session', () => {
      expect(sessionManager.isActive()).toBe(false);

      sessionManager.updateMetrics(5, 20);

      // Still inactive after updateMetrics call
      expect(sessionManager.isActive()).toBe(false);
    });
  });

  describe('ConfirmModal Component', () => {
    it('should render when isVisible is true', () => {
      render(
        <ConfirmModal
          isVisible={true}
          title="Test Title"
          message="Test Message"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      const { container } = render(
        <ConfirmModal
          isVisible={false}
          title="Test Title"
          message="Test Message"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should apply .show class to overlay when visible', () => {
      const { container } = render(
        <ConfirmModal
          isVisible={true}
          title="Confirm"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      const overlay = container.querySelector('.confirm-overlay');
      expect(overlay).toHaveClass('show');
    });

    it('should call onConfirm when confirm button clicked', () => {
      const handleConfirm = vi.fn();

      render(
        <ConfirmModal
          isVisible={true}
          title="Confirm"
          message="Are you sure?"
          confirmText="YES"
          onConfirm={handleConfirm}
          onCancel={() => {}}
        />
      );

      fireEvent.click(screen.getByText('YES'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button clicked', () => {
      const handleCancel = vi.fn();

      render(
        <ConfirmModal
          isVisible={true}
          title="Confirm"
          message="Are you sure?"
          cancelText="NO"
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );

      fireEvent.click(screen.getByText('NO'));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('should use default button text when not provided', () => {
      render(
        <ConfirmModal
          isVisible={true}
          title="Confirm"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      // Default texts from component
      expect(screen.getByText('CONFERMA')).toBeInTheDocument();
      expect(screen.getByText('ANNULLA')).toBeInTheDocument();
    });

    it('should call onCancel when backdrop clicked', () => {
      const handleCancel = vi.fn();

      const { container } = render(
        <ConfirmModal
          isVisible={true}
          title="Confirm"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );

      const overlay = container.querySelector('.confirm-overlay');
      fireEvent.click(overlay!);

      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onCancel when modal box clicked (event propagation stopped)', () => {
      const handleCancel = vi.fn();

      const { container } = render(
        <ConfirmModal
          isVisible={true}
          title="Confirm"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );

      const modalBox = container.querySelector('.confirm-box');
      fireEvent.click(modalBox!);

      expect(handleCancel).not.toHaveBeenCalled();
    });

    it('should render confirm button with btn-stop class', () => {
      const { container } = render(
        <ConfirmModal
          isVisible={true}
          title="Confirm"
          message="Delete this?"
          confirmText="DELETE"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      const confirmButton = screen.getByText('DELETE');
      expect(confirmButton).toHaveClass('btn-stop');
    });

    it('should render cancel button with btn-set class', () => {
      const { container } = render(
        <ConfirmModal
          isVisible={true}
          title="Confirm"
          message="Delete this?"
          cancelText="CANCEL"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      const cancelButton = screen.getByText('CANCEL');
      expect(cancelButton).toHaveClass('btn-set');
    });
  });

  describe('Cross-Component Integration', () => {
    it('should handle ConfirmModal + SessionHistory workflow', () => {
      const mockSessions: WorkoutSession[] = [
        {
          id: 'test-1',
          date: new Date('2026-04-01T10:00:00'),
          completedRounds: 5,
          sessionDuration: 600,
          punchesShown: 42,
          isCompleted: true,
          config: {
            rounds: 5,
            roundDuration: 120,
            restDuration: 30,
            punchInterval: 5,
            playSound: true,
            template: null,
          },
          totalDuration: 600,
          createdAt: Date.now(),
        }
      ];

      // Render both components (simulating real app state)
      const { rerender } = render(
        <>
          <SessionHistory
            isVisible={true}
            sessions={mockSessions}
            onClose={() => {}}
          />
          <ConfirmModal
            isVisible={false}
            title="Delete Session"
            message="Are you sure?"
            onConfirm={() => {}}
            onCancel={() => {}}
          />
        </>
      );

      // Both overlays should coexist without conflicts
      expect(screen.getByText(/STORICO ALLENAMENTI/i)).toBeInTheDocument();

      // Now close history and show confirm
      rerender(
        <>
          <SessionHistory
            isVisible={false}
            sessions={mockSessions}
            onClose={() => {}}
          />
          <ConfirmModal
            isVisible={true}
            title="Delete Session"
            message="Are you sure?"
            onConfirm={() => {}}
            onCancel={() => {}}
          />
        </>
      );

      expect(screen.getByText('Delete Session')).toBeInTheDocument();
      expect(screen.queryByText(/STORICO ALLENAMENTI/i)).not.toBeInTheDocument();
    });
  });
});
