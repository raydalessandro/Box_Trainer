/**
 * BOX TRAINER — Done Overlay Component
 * Full-screen overlay displayed when workout is complete
 */

interface DoneOverlayProps {
  isVisible: boolean;
  totalRounds: number;
  onRestart: () => void;
}

export function DoneOverlay({ isVisible, totalRounds, onRestart }: DoneOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="done-overlay show">
      <div className="done-emoji">🥊</div>
      <div className="done-title">Ottimo Lavoro!</div>
      <div className="done-sub">{totalRounds} round completati 💪</div>
      <button className="btn btn-start" onClick={onRestart}>
        RICOMINCIA
      </button>
    </div>
  );
}
