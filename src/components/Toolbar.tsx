import { useRef } from "react";
import { useNovel } from "../hooks/useNovel";

export default function Toolbar() {
  const mdInput = useRef<HTMLInputElement>(null);
  const wordInput = useRef<HTMLInputElement>(null);
  const { state, dispatch, importMD, importWord, exportMD } = useNovel();

  // 计算当前活跃章节字数
  const wordCount = (() => {
    if (!state.activeChapterId) return 0;
    for (const vol of state.volumes) {
      const ch = vol.chapters.find((c) => c.id === state.activeChapterId);
      if (ch) return ch.content.replace(/\s/g, "").length;
    }
    return 0;
  })();

  return (
    <div className="toolbar">
      <span className="brand">墨宝 · 小说编辑器</span>

      <button
        onClick={() =>
          dispatch({ type: "SHOW_MODAL", payload: { type: "newVolume" } })
        }
      >
        📁 新卷
      </button>
      <button
        onClick={() =>
          dispatch({ type: "SHOW_MODAL", payload: { type: "newChapter" } })
        }
      >
        📝 新章节
      </button>

      <button onClick={() => mdInput.current?.click()}>📥 导入MD</button>
      <button onClick={() => wordInput.current?.click()}>📥 导入Word</button>
      <button onClick={exportMD}>📤 导出MD</button>

      <button
        onClick={() => {
          const panel = document.querySelector(".preview-panel");
          panel?.classList.toggle("collapsed");
        }}
      >
        👁 预览
      </button>

      <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        字数 {wordCount} · 自动保存
      </span>

      <input
        ref={mdInput}
        type="file"
        accept=".md"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) importMD(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={wordInput}
        type="file"
        accept=".docx"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) importWord(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}