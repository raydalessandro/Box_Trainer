/**
 * BOX TRAINER — Rest Overlay Component
 * Full-screen overlay displayed during rest periods between rounds
 */

interface RestOverlayProps {
  isVisible: boolean;
  timeLeft: number;
  nextRound: number;
}

export function RestOverlay({ isVisible, timeLeft, nextRound }: RestOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="rest-card show">
      <div className="rest-inner">
        <div className="rest-heading">⏸ RIPOSO</div>
        <div className="rest-big">{timeLeft}</div>
        <div className="rest-next">
          Prossimo: Round <b>{nextRound}</b>
        </div>
      </div>
    </div>
  );
}
