import { useState, useEffect, useRef } from "react";
import { renderMarkdown } from "../utils/io";
import type { Chapter, Volume } from "../contexts/NovelContext";

interface Props {
  chapters: { volume: Volume; chapter: Chapter }[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export default function FullScreenReader({
  chapters,
  currentIndex,
  onNavigate,
  onClose,
}: Props) {
  const [layout, setLayout] = useState<"pc" | "mobile">("pc");
  const [fontSizeLevel, setFontSizeLevel] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentChapter = chapters[currentIndex]?.chapter;

  const scrollPage = (direction: "up" | "down") => {
    const el = contentRef.current;
    if (!el) return;
    const scrollAmount = el.clientHeight * 0.9;
    el.scrollBy({
      top: direction === "down" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) onNavigate(currentIndex - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < chapters.length - 1) onNavigate(currentIndex + 1);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollPage("up");
      }
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        scrollPage("down");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, chapters.length, onClose, onNavigate]);

  const fontSize = `${1 + fontSizeLevel * 0.1}rem`;
  const contentWidth = layout === "mobile" ? "360px" : "min(800px, 90vw)";
  const html = currentChapter ? renderMarkdown(currentChapter.content) : "";

  return (
    <div style={styles.overlay}>
      {/* 顶部工具栏 */}
      <div style={styles.topBar}>
        <button onClick={onClose} style={styles.toolBtn}>
          ✕ 退出全屏
        </button>

        {/* 📐 版式切换区：当前版式 + 切换按钮 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "#555", fontSize: "0.9rem", fontWeight: 500 }}>
            📖 当前：{layout === "pc" ? "PC版式" : "手机版式"}
          </span>
          <button
            onClick={() => setLayout(layout === "pc" ? "mobile" : "pc")}
            style={{
              ...styles.toolBtn,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
            }}
          >
            切至{layout === "pc" ? "手机版式" : "PC版式"}
          </button>
        </div>

        {/* 字体缩放 */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => setFontSizeLevel(Math.max(-2, fontSizeLevel - 1))}
            style={styles.toolBtn}
          >
            A-
          </button>
          <span style={{ color: "#666", fontSize: "0.85rem" }}>字体</span>
          <button
            onClick={() => setFontSizeLevel(Math.min(5, fontSizeLevel + 1))}
            style={styles.toolBtn}
          >
            A+
          </button>
        </div>

        {/* 翻页按钮 */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => scrollPage("up")}
            style={styles.toolBtn}
            title="上一页 (PageUp)"
          >
            ↑
          </button>
          <button
            onClick={() => scrollPage("down")}
            style={styles.toolBtn}
            title="下一页 (PageDown)"
          >
            ↓
          </button>
        </div>

        {/* 章节导航 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            disabled={currentIndex <= 0}
            onClick={() => onNavigate(currentIndex - 1)}
            style={styles.toolBtn}
            title="上一章 (←)"
          >
            ← 上一章
          </button>
          <span style={{ color: "#666", fontSize: "0.85rem" }}>
            {currentIndex + 1} / {chapters.length}
          </span>
          <button
            disabled={currentIndex >= chapters.length - 1}
            onClick={() => onNavigate(currentIndex + 1)}
            style={styles.toolBtn}
            title="下一章 (→)"
          >
            下一章 →
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px 20px",
          display: "flex",
          justifyContent: "center",
          background: "#fcfaf6",
        }}
      >
        <div
          style={{
            maxWidth: contentWidth,
            width: "100%",
            fontSize,
            lineHeight: 2,
            fontFamily: "Georgia, 'Noto Serif SC', serif",
            color: "#333",
          }}
          dangerouslySetInnerHTML={{ __html: html || "<p>无内容</p>" }}
        />
      </div>

      {/* 底部提示栏 */}
      <div style={styles.bottomBar}>
        <span style={{ color: "#999", fontSize: "0.8rem" }}>
          ← → 切换章节 · ↑↓ 翻页 · Esc 退出
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "#fcfaf6",
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 20px",
    background: "#f5f1ea",
    borderBottom: "1px solid #dad6cf",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 10,
  },
  toolBtn: {
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: "0.85rem",
    cursor: "pointer",
    color: "#444",
    whiteSpace: "nowrap",
  },
  bottomBar: {
    display: "flex",
    justifyContent: "center",
    padding: "6px 20px",
    background: "#f5f1ea",
    borderTop: "1px solid #dad6cf",
  },
};