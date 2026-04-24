import { useEffect, useRef } from "react";
import { useNovel } from "../hooks/useNovel";

export default function Editor() {
  const { state, dispatch } = useNovel();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 查找当前活跃章节
  const active = (() => {
    if (!state.activeChapterId) return null;
    for (const vol of state.volumes) {
      const ch = vol.chapters.find((c) => c.id === state.activeChapterId);
      if (ch) return ch;
    }
    return null;
  })();

  // 切换章节时将光标移到末尾
  useEffect(() => {
    if (textareaRef.current && active) {
      const len = active.content.length;
      textareaRef.current.setSelectionRange(len, len);
      textareaRef.current.focus();
    }
  }, [state.activeChapterId]);

  return (
    <div className="editor-area">
      <div className="editor-header">
        <input
          value={active?.title ?? ""}
          onChange={(e) => {
            if (active) {
              dispatch({
                type: "UPDATE_CHAPTER_TITLE",
                payload: { id: active.id, title: e.target.value },
              });
            }
          }}
          placeholder={active ? "章节标题" : "未选择章节"}
          disabled={!active}
        />
      </div>
      <div className="editor-content">
        <textarea
          ref={textareaRef}
          value={active?.content ?? ""}
          onChange={(e) => {
            if (active) {
              dispatch({
                type: "UPDATE_CHAPTER_CONTENT",
                payload: { id: active.id, content: e.target.value },
              });
            }
          }}
          placeholder={active ? "开始写作... 支持 Markdown 格式" : "请从左侧目录选择一个章节"}
          disabled={!active}
        />
      </div>
    </div>
  );
}