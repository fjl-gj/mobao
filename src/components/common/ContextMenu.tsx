import { useEffect, useRef } from 'react';

interface MenuItem {
  label?: string;
  icon?: string;
  action?: () => void;
  danger?: boolean;
  disabled?: boolean;
  sep?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  // 防止溢出屏幕
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 8);

  return (
    <div className="ctx-menu" ref={ref} style={{ left: adjustedX, top: adjustedY }}>
      {items.map((item, i) => (
        item.sep ? (
          <div key={i} className="ctx-sep" />
        ) : (
          <button key={i} className={`ctx-item${item.danger ? ' ctx-danger' : ''}`}
            disabled={item.disabled} onClick={() => { item.action?.(); onClose(); }}>
            {item.icon && <span className="ctx-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      ))}
    </div>
  );
}
