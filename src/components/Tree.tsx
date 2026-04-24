import { useNovel } from "../hooks/useNovel";

export default function Tree() {
  const { state, dispatch } = useNovel();

  if (state.volumes.length === 0) {
    return (
      <div className="empty-state">
        <span>📚</span>
        <span>还没有卷或章节</span>
        <button
          onClick={() =>
            dispatch({ type: "SHOW_MODAL", payload: { type: "newVolume" } })
          }
          style={{
            marginTop: 8,
            padding: "6px 14px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: "pointer",
          }}
        >
          创建第一卷
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
      {state.volumes.map((vol) => (
        <div key={vol.id} style={{ marginBottom: 6 }}>
          {/* 卷标题行 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              background: "#e8e5df",
              borderRadius: 4,
              margin: "0 4px",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
              📁 {vol.title}{" "}
              <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                ({vol.chapters.length}章)
              </span>
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              <button
                onClick={() =>
                  dispatch({
                    type: "SHOW_MODAL",
                    payload: { type: "newChapter", volId: vol.id },
                  })
                }
                title="新增章节"
                style={actionBtnStyle}
              >
                +
              </button>
              <button
                onClick={() =>
                  dispatch({ type: "MOVE_VOLUME", payload: { volId: vol.id, direction: "up" } })
                }
                title="上移"
                style={actionBtnStyle}
              >
                ↑
              </button>
              <button
                onClick={() =>
                  dispatch({ type: "MOVE_VOLUME", payload: { volId: vol.id, direction: "down" } })
                }
                title="下移"
                style={actionBtnStyle}
              >
                ↓
              </button>
              <button
                onClick={() => dispatch({ type: "DELETE_VOLUME", payload: vol.id })}
                title="删除卷"
                style={actionBtnStyle}
              >
                🗑
              </button>
            </div>
          </div>

          {/* 章节列表 */}
          <div style={{ paddingLeft: 16 }}>
            {vol.chapters.map((ch) => (
              <div
                key={ch.id}
                onClick={() => dispatch({ type: "SELECT_CHAPTER", payload: ch.id })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 10px",
                  margin: "1px 4px",
                  borderRadius: 4,
                  cursor: "pointer",
                  background:
                    ch.id === state.activeChapterId ? "var(--accent)" : "transparent",
                  color: ch.id === state.activeChapterId ? "#fff" : "var(--text)",
                  fontSize: "0.84rem",
                }}
              >
                <span style={{ marginRight: 6 }}>📝</span>
                <span style={{ flex: 1 }}>{ch.title || "未命名"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "DELETE_CHAPTER", payload: ch.id });
                  }}
                  title="删除章节"
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    fontSize: "0.75rem",
                    opacity: 0.6,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {vol.chapters.length === 0 && (
              <div
                style={{
                  padding: "6px 12px",
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontStyle: "italic",
                }}
              >
                暂无章节
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  fontSize: "0.72rem",
  padding: "2px 5px",
  cursor: "pointer",
  borderRadius: 3,
};