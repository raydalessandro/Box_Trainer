/**
 * BOX TRAINER — Main App Component (Demo Minimalista)
 */

import { useState, useEffect, useMemo } from 'react';
import { TimerEngine } from '@core/TimerEngine';
import { ConfigManager } from '@core/ConfigManager';
import { StorageService } from '@storage/StorageService';
import type { TrainingState, PunchNumber, WorkoutConfig, WorkoutSession } from '@core/types';
import { PUNCH_COMBOS, TIMER_CIRCLE_CIRCUMFERENCE } from '@core/types';
import { RestOverlay } from '@components/RestOverlay';
import { DoneOverlay } from '@components/DoneOverlay';
import { SettingsModal } from '@components/SettingsModal';

function App() {
  // Config & Engine (memoized to prevent recreation)
  const configManager = useMemo(() => new ConfigManager(), []);
  const [config, setConfig] = useState<WorkoutConfig>(configManager.get());
  const timerEngine = useMemo(() => new TimerEngine(config), []);
  const storageService = useMemo(() => new StorageService(), []);

  // Training State
  const [state, setState] = useState<TrainingState>('idle');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(config.roundDuration);
  const [restLeft, setRestLeft] = useState(config.restDuration);
  const [currentPunch, setCurrentPunch] = useState<PunchNumber | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize storage service
  useEffect(() => {
    storageService.init().catch((error) => {
      console.error('[App] Failed to initialize storage:', error);
    });
  }, [storageService]);

  // Setup engine callbacks
  useEffect(() => {
    timerEngine.onStateChange((newState) => {
      setState(newState);
      // Clear punch display when entering rest or done states
      if (newState === 'rest' || newState === 'done') {
        setCurrentPunch(null);
      }
    });
    timerEngine.onRoundChange((round) => setCurrentRound(round));
    timerEngine.onTick((time) => {
      // Update appropriate time based on current state
      const currentState = timerEngine.getState().state;
      if (currentState === 'rest') {
        setRestLeft(time);
      } else {
        setTimeLeft(time);
      }
    });
    timerEngine.onPunchDisplay((punch) => {
      setCurrentPunch(punch);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 110);
    });

    // Save session when workout completes
    timerEngine.onComplete(() => {
      const state = timerEngine.getState();
      const session: WorkoutSession = {
        id: `session-${Date.now()}`,
        date: new Date(),
        createdAt: Date.now(),
        completedRounds: state.currentRound - 1, // -1 because currentRound increments after last round
        totalDuration: state.totalRounds * config.roundDuration + (state.totalRounds - 1) * config.restDuration,
        punchesShown: state.punchesShown,
        config: { ...config },
      };

      storageService.addSession(session).catch((error) => {
        console.error('[App] Failed to save session:', error);
      });
    });

    return () => {
      timerEngine.dispose();
      storageService.dispose();
    };
  }, [timerEngine, storageService, config]);

  // Update engine when config changes
  useEffect(() => {
    timerEngine.updateConfig(config);
  }, [config, timerEngine]);

  // Timer Controls
  const handleStart = () => timerEngine.start();
  const handleStop = () => timerEngine.stop();

  // Settings Handler
  const handleSaveSettings = (newConfig: WorkoutConfig) => {
    configManager.save(newConfig);
    setConfig(newConfig);
    timerEngine.updateConfig(newConfig);
    setIsSettingsOpen(false);
  };

  // Calculate progress ring
  const totalTime = state === 'rest' ? config.restDuration : config.roundDuration;
  const progress = TIMER_CIRCLE_CIRCUMFERENCE * (1 - Math.max(0, timeLeft / totalTime));

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Body state class
  const bodyClass = state === 'work' ? 'state-work' : state === 'rest' ? 'state-rest' : '';

  useEffect(() => {
    document.body.className = bodyClass;
  }, [bodyClass]);

  return (
    <>
      {/* Ambient Background */}
      <div id="ambientBg"></div>

      {/* Corner Brackets */}
      <div className="corner corner-tl"></div>
      <div className="corner corner-tr"></div>
      <div className="corner corner-bl"></div>
      <div className="corner corner-br"></div>

      {/* Flash Effect */}
      <div className={`flash-bg ${showFlash ? 'show' : ''}`}></div>

      {/* Rest Overlay */}
      <RestOverlay
        isVisible={state === 'rest'}
        timeLeft={restLeft}
        nextRound={currentRound}
      />

      {/* Done Overlay */}
      <DoneOverlay
        isVisible={state === 'done'}
        totalRounds={config.rounds}
        onRestart={() => timerEngine.reset()}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* Main Container */}
      <div className="container">
        {/* Title */}
        <div className="title">
          <span>⚡ Allenamento</span>
          BOX TRAINER
        </div>

        {/* Round Badge */}
        <div className="round-badge">
          <div className="r-cell">
            <div className="r-cell-lbl">Round</div>
            <div className="r-cell-val">{currentRound}</div>
          </div>
          <div className="r-cell">
            <div className="r-cell-lbl">di</div>
            <div className="r-cell-val">{config.rounds}</div>
          </div>
          <div className="r-cell">
            <div className="r-cell-lbl">Durata</div>
            <div className="r-cell-val">{formatTime(config.roundDuration)}</div>
          </div>
          <div className="r-cell">
            <div className="r-cell-lbl">Riposo</div>
            <div className="r-cell-val">{formatTime(config.restDuration)}</div>
          </div>
        </div>

        {/* Timer Circle */}
        <div className="timer-wrap">
          <svg className="timer-svg" viewBox="0 0 270 270">
            <circle className="t-glow" cx="135" cy="135" r="115" />
            <circle className="t-track" cx="135" cy="135" r="115" />
            <circle className="t-inner-fill" cx="135" cy="135" r="107" />
            <circle
              className="t-prog"
              cx="135"
              cy="135"
              r="115"
              style={{
                strokeDasharray: TIMER_CIRCLE_CIRCUMFERENCE,
                strokeDashoffset: progress,
              }}
            />
          </svg>
          <div className="timer-inner">
            <div className="t-phase">
              {state === 'idle' && 'PRONTO'}
              {state === 'work' && (timeLeft <= 10 ? '⚠ ULTIMI 10s' : 'LAVORA!')}
              {state === 'rest' && 'RIPOSO'}
              {state === 'done' && 'FINITO!'}
            </div>
            <div className={`t-time ${timeLeft <= 10 && state === 'work' ? 'urgent' : ''}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="t-rlabel">
              {state === 'work' && `Round ${currentRound}`}
              {state === 'rest' && `Round ${currentRound} in arrivo`}
            </div>
          </div>
        </div>

        {/* Punch Number Display */}
        <div className="number-display">
          <div className="combo-label">
            {state === 'idle' && '— Premi INIZIA —'}
            {state === 'work' && '— COLPISCI! —'}
            {state === 'rest' && '— Riposa —'}
            {state === 'done' && '— Completo! —'}
          </div>
          <div className="big-number">
            {currentPunch !== null ? currentPunch : '—'}
          </div>
          <div className="combo-name">
            {currentPunch !== null ? PUNCH_COMBOS[currentPunch].name : ''}
          </div>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-left">Int: {config.numberInterval}s</div>
          <div className="status-dot">
            ● {state === 'idle' ? 'STOP' : state === 'work' ? 'LIVE' : state === 'rest' ? 'RIPOSO' : 'DONE'}
          </div>
        </div>

        {/* Buttons */}
        <div className="btn-group">
          <button
            className="btn btn-start"
            onClick={handleStart}
            disabled={state !== 'idle' && state !== 'done'}
          >
            INIZIA
          </button>
          <button
            className="btn btn-stop"
            onClick={handleStop}
            disabled={state === 'idle' || state === 'done'}
          >
            STOP
          </button>
          <button
            className="btn btn-set"
            onClick={() => setIsSettingsOpen(true)}
            disabled={state === 'work' || state === 'rest'}
          >
            ⚙ SET
          </button>
        </div>

        {/* Legend */}
        <div className="legend">
          <div className="legend-item">
            <b>1</b> Jab
          </div>
          <div className="legend-item">
            <b>2</b> J · Diretto
          </div>
          <div className="legend-item">
            <b>3</b> J · Dir · G.Sx
          </div>
          <div className="legend-item">
            <b>4</b> J · Dir · G.Sx · G.Dx
          </div>
          <div className="legend-item">
            <b>5</b> Dir · G.Sx · G.Dx · Fegato Sx
          </div>
          <div className="legend-item">
            <b>6</b> Jab · Jab
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
