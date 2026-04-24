import { useNovel } from "../hooks/useNovel";
import { renderMarkdown } from "../utils/io";

interface Props {
  onEnterFullscreen?: () => void;
}

export default function Preview({ onEnterFullscreen }: Props) {
  const { state, dispatch } = useNovel();

  // 当前活跃章节
  const active = (() => {
    if (!state.activeChapterId) return null;
    for (const vol of state.volumes) {
      const ch = vol.chapters.find((c) => c.id === state.activeChapterId);
      if (ch) return ch;
    }
    return null;
  })();

  const html = active ? renderMarkdown(active.content) : "";

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <span>📄 预览</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => dispatch({ type: "SET_PREVIEW_MODE", payload: "preview" })}
            style={{
              padding: "3px 10px",
              fontSize: "0.75rem",
              background: state.previewMode === "preview" ? "var(--accent)" : "transparent",
              color: state.previewMode === "preview" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            普通
          </button>
          <button
            onClick={() => dispatch({ type: "SET_PREVIEW_MODE", payload: "reader" })}
            style={{
              padding: "3px 10px",
              fontSize: "0.75rem",
              background: state.previewMode === "reader" ? "var(--accent)" : "transparent",
              color: state.previewMode === "reader" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            阅读
          </button>
          <button
            onClick={onEnterFullscreen}
            style={{
              padding: "3px 10px",
              fontSize: "0.75rem",
              background: "#fff",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              cursor: "pointer",
            }}
            title="沉浸式全屏阅读"
          >
            全屏 📖
          </button>
        </div>
      </div>
      <div
        className={`preview-content ${state.previewMode === "reader" ? "reader-mode" : ""}`}
        dangerouslySetInnerHTML={{
          __html: html || '<div class="empty-state">选择章节开始预览</div>',
        }}
      />
    </div>
  );
}