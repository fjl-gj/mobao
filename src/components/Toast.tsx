import { useEffect } from 'react';
import { useNovel } from '../hooks/useNovel';

export default function Toast() {
  const { state, dispatch } = useNovel();

  useEffect(() => {
    if (state.toasts.length > 0) {
      const timer = setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: state.toasts[0].id });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.toasts, dispatch]);

  if (state.toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {state.toasts.map(t => (
        <div key={t.id} className={`toast-item ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
