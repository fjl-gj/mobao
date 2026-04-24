import { useState } from "react";
import { useNovel } from "../hooks/useNovel";

export default function Outline() {
  const { state, dispatch } = useNovel();
  const [text, setText] = useState("");

  const addOutline = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch({ type: "ADD_OUTLINE_ITEM", payload: { text: trimmed, level: 2 } });
    setText("");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 输入区 */}
      <div
        style={{
          padding: 8,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 6,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addOutline()}
          placeholder="新大纲条目..."
          style={{
            flex: 1,
            padding: "5px 10px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "0.82rem",
            background: "#fff",
          }}
        />
        <button
          onClick={addOutline}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          ＋
        </button>
      </div>

      {/* 大纲列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {state.outline.length === 0 ? (
          <div className="empty-state">
            <span>🧭</span>
            <span>大纲为空，开始规划故事吧</span>
          </div>
        ) : (
          state.outline.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                borderBottom: "1px solid var(--border)",
                gap: 8,
                fontSize: "0.85rem",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  opacity: item.linkedChapterId ? 1 : 0.3,
                }}
              />
              <span style={{ flex: 1 }}>{item.text}</span>
              <button
                onClick={() => dispatch({ type: "DELETE_OUTLINE_ITEM", payload: item.id })}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}