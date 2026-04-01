import React from 'react';

interface ConfirmModalProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isVisible,
  title,
  message,
  confirmText = 'CONFERMA',
  cancelText = 'ANNULLA',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isVisible) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="confirm-overlay show" onClick={handleBackdropClick}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-set" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn btn-stop" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
