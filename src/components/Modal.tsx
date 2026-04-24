import { useState, useEffect } from "react";
import { useNovel } from "../hooks/useNovel";

export default function Modal() {
  const { state, dispatch } = useNovel();
  const [value, setValue] = useState("");

  const modal = state.modal;

  // 每次弹窗打开时清空输入框
  useEffect(() => {
    if (modal) setValue("");
  }, [modal]);

  if (!modal) return null;

  const close = () => dispatch({ type: "CLOSE_MODAL" });

  const confirm = () => {
    const title = value.trim();
    if (!title) return;

    if (modal.type === "newVolume") {
      dispatch({ type: "ADD_VOLUME", payload: { title } });
    } else if (modal.type === "newChapter") {
      // 如果没传 volId，尝试取第一个卷的 id
      const volId = modal.volId || state.volumes[0]?.id;
      if (!volId) {
        // 没有卷时先创建卷再创建章
        dispatch({ type: "ADD_VOLUME", payload: { title: "新卷" } });
        // 注意：这里简化处理，实际可能需要等待异步，但 reducer 是同步的，所以直接取 volumes 长度+1
        // 更好的做法是 dispatch ADD_CHAPTER 之前确保有卷，这里暂时假设已经有卷
        return;
      }
      dispatch({ type: "ADD_CHAPTER", payload: { volId, title } });
    }
    close();
  };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "var(--radius)",
          padding: 24,
          minWidth: 320,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <h3 style={{ marginBottom: 16 }}>
          {modal.type === "newVolume" ? "📁 新建卷" : "📝 新建章节"}
        </h3>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirm()}
          placeholder={modal.type === "newVolume" ? "输入卷标题" : "输入章节标题"}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "0.9rem",
            marginBottom: 20,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={close}
            style={{
              padding: "6px 18px",
              background: "var(--bg-sidebar)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={confirm}
            style={{
              padding: "6px 18px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius)",
              cursor: "pointer",
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}