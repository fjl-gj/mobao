import { useState, useEffect, useRef } from 'react';

interface Props {
  title: string;
  message: string;
  inputLabel?: string;
  inputValue?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, inputLabel, inputValue, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(inputValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm(inputLabel ? value : '');
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [value, onCancel, onConfirm, inputLabel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ minWidth: 340, maxWidth: 420 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{message}</p>
          {inputLabel && (
            <input ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={inputLabel}
            />
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onCancel}>取消</button>
          <button
            className={`modal-btn confirm${danger ? ' modal-btn-danger' : ''}`}
            onClick={() => onConfirm(inputLabel ? value : '')}
          >
            {confirmLabel || '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}
