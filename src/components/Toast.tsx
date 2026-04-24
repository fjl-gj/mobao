import { useEffect } from "react";
import { useNovel } from "../hooks/useNovel";

export default function Toast() {
  const { state, dispatch } = useNovel();

  useEffect(() => {
    if (state.toasts.length > 0) {
      const timer = setTimeout(() => {
        dispatch({ type: "REMOVE_TOAST", payload: state.toasts[0].id });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.toasts, dispatch]);

  if (state.toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {state.toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: "#fff",
            padding: "10px 18px",
            borderRadius: "var(--radius)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            fontSize: "0.85rem",
            borderLeft: `4px solid ${
              toast.type === "error" ? "#f87171" : toast.type === "warn" ? "#fbbf24" : "#34d399"
            }`,
            animation: "slideIn 0.3s ease",
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}