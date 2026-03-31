/**
 * BOX TRAINER — Settings Modal Component
 * Full-screen overlay for configuring workout settings
 */

import React, { useState } from 'react';
import type { WorkoutConfig } from '../core/types';
import { VALIDATION } from '../core/types';
import { ConfigManager } from '../core/ConfigManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WorkoutConfig;
  onSave: (config: WorkoutConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  // Local state for form controls (initialized from prop)
  const [localConfig, setLocalConfig] = useState<WorkoutConfig>(config);

  // Update local state when config prop changes
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Helper: Clamp value to valid range
  const clamp = (value: number, type: keyof typeof VALIDATION): number => {
    const { min, max } = VALIDATION[type];
    return Math.max(min, Math.min(max, value));
  };

  // Adjust numeric value with validation
  const adjust = (
    field: 'rounds' | 'roundDuration' | 'restDuration' | 'numberInterval',
    delta: number
  ) => {
    const newValue = clamp(localConfig[field] + delta, field);
    setLocalConfig({ ...localConfig, [field]: newValue });
  };

  // Toggle audio setting
  const toggleAudio = (key: keyof typeof localConfig.audio) => {
    setLocalConfig({
      ...localConfig,
      audio: {
        ...localConfig.audio,
        [key]: !localConfig.audio[key],
      },
    });
  };

  // Handle save
  const handleSave = () => {
    onSave(localConfig);
  };

  // Handle cancel (reset local state and close)
  const handleCancel = () => {
    setLocalConfig(config);
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-panel show" onClick={handleBackdropClick}>
      <div className="settings-box">
        {/* Title */}
        <h2 className="settings-title">
          IMPOSTAZIONI <span>ALLENAMENTO</span>
        </h2>

        {/* Rounds */}
        <div className="setting-row">
          <div className="setting-label">ROUND TOTALI</div>
          <div className="setting-controls">
            <button
              className="s-btn"
              onClick={() => adjust('rounds', -1)}
              disabled={localConfig.rounds <= VALIDATION.rounds.min}
            >
              −
            </button>
            <div className="s-val-wrap">
              <span className="s-val">{localConfig.rounds}</span>
              <span className="s-sub">ROUND TOTALI</span>
            </div>
            <button
              className="s-btn"
              onClick={() => adjust('rounds', 1)}
              disabled={localConfig.rounds >= VALIDATION.rounds.max}
            >
              +
            </button>
          </div>
        </div>

        {/* Round Duration */}
        <div className="setting-row">
          <div className="setting-label">DURATA ROUND</div>
          <div className="setting-controls">
            <button
              className="s-btn"
              onClick={() => adjust('roundDuration', -30)}
              disabled={localConfig.roundDuration <= VALIDATION.roundDuration.min}
            >
              −
            </button>
            <div className="s-val-wrap">
              <span className="s-val">
                {ConfigManager.formatTime(localConfig.roundDuration)}
              </span>
              <span className="s-sub">MIN (STEP 30S)</span>
            </div>
            <button
              className="s-btn"
              onClick={() => adjust('roundDuration', 30)}
              disabled={localConfig.roundDuration >= VALIDATION.roundDuration.max}
            >
              +
            </button>
          </div>
        </div>

        {/* Rest Duration */}
        <div className="setting-row">
          <div className="setting-label">DURATA RIPOSO</div>
          <div className="setting-controls">
            <button
              className="s-btn"
              onClick={() => adjust('restDuration', -10)}
              disabled={localConfig.restDuration <= VALIDATION.restDuration.min}
            >
              −
            </button>
            <div className="s-val-wrap">
              <span className="s-val">
                {ConfigManager.formatTime(localConfig.restDuration)}
              </span>
              <span className="s-sub">SECONDI (STEP 10S)</span>
            </div>
            <button
              className="s-btn"
              onClick={() => adjust('restDuration', 10)}
              disabled={localConfig.restDuration >= VALIDATION.restDuration.max}
            >
              +
            </button>
          </div>
        </div>

        {/* Number Interval */}
        <div className="setting-row">
          <div className="setting-label">INTERVALLO NUMERI</div>
          <div className="setting-controls">
            <button
              className="s-btn"
              onClick={() => adjust('numberInterval', -1)}
              disabled={localConfig.numberInterval <= VALIDATION.numberInterval.min}
            >
              −
            </button>
            <div className="s-val-wrap">
              <span className="s-val">{localConfig.numberInterval}s</span>
              <span className="s-sub">SECONDI TRA COLPI</span>
            </div>
            <button
              className="s-btn"
              onClick={() => adjust('numberInterval', 1)}
              disabled={localConfig.numberInterval >= VALIDATION.numberInterval.max}
            >
              +
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="settings-divider" />

        {/* Audio Section Label */}
        <div className="s-section-label">SUONI E VOCE</div>

        {/* Audio Toggles */}
        <div className="sound-toggle">
          <span className="sound-label">🔔 Campanella inizio round</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={localConfig.audio.bell}
              onChange={() => toggleAudio('bell')}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="sound-toggle">
          <span className="sound-label">⚠️ Avviso ultimi 10 secondi</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={localConfig.audio.warn}
              onChange={() => toggleAudio('warn')}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="sound-toggle">
          <span className="sound-label">🔕 Campanella fine round</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={localConfig.audio.endBell}
              onChange={() => toggleAudio('endBell')}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="sound-toggle">
          <span className="sound-label">🥊 Beep numero colpo</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={localConfig.audio.punchBeep}
              onChange={() => toggleAudio('punchBeep')}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="sound-toggle">
          <span className="sound-label">🗣️ Voce combinazioni</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={localConfig.audio.voice}
              onChange={() => toggleAudio('voice')}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button className="btn btn-set" onClick={handleCancel} style={{ flex: 1 }}>
            ANNULLA
          </button>
          <button className="btn btn-start" onClick={handleSave} style={{ flex: 1 }}>
            SALVA
          </button>
        </div>
      </div>
    </div>
  );
};
