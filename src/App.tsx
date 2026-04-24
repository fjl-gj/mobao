import { useState, useMemo } from "react";
import { useNovel } from "./hooks/useNovel";
import Toolbar from "./components/Toolbar";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import Modal from "./components/Modal";
import Toast from "./components/Toast";
import FullScreenReader from "./components/FullScreenReader";
import type { Chapter, Volume } from "./contexts/NovelContext";
import "./App.css";

function App() {
  const { state, dispatch } = useNovel();
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 全屏阅读时的当前章节索引（在全部章节列表中的位置）
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  // 构建所有章节的扁平列表（保持顺序）
  const allChapters = useMemo(() => {
    const list: { volume: Volume; chapter: Chapter }[] = [];
    state.volumes.forEach((vol) => {
      vol.chapters.forEach((ch) => {
        list.push({ volume: vol, chapter: ch });
      });
    });
    return list;
  }, [state.volumes]);

  // 当 activeChapterId 变化时，相应更新全屏索引
  const activeIndex = useMemo(() => {
    if (!state.activeChapterId) return -1;
    return allChapters.findIndex((item) => item.chapter.id === state.activeChapterId);
  }, [state.activeChapterId, allChapters]);

  // 进入全屏阅读
  const handleEnterFullscreen = () => {
    const idx = activeIndex;
    if (idx === -1) {
      // 没有选中章节，尝试选第一个
      if (allChapters.length > 0) {
        dispatch({ type: "SELECT_CHAPTER", payload: allChapters[0].chapter.id });
        setFullscreenIndex(0);
      } else {
        alert("请先创建至少一个章节");
        return;
      }
    } else {
      setFullscreenIndex(idx);
    }
    setIsFullscreen(true);
  };

  // 退出全屏
  const handleExitFullscreen = () => {
    setIsFullscreen(false);
    // 将阅读器当前章节同步回编辑器
    const ch = allChapters[fullscreenIndex]?.chapter;
    if (ch) {
      dispatch({ type: "SELECT_CHAPTER", payload: ch.id });
    }
  };

  // 阅读器内切换章节（索引跳转）
  const handleNavigateChapter = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < allChapters.length) {
      setFullscreenIndex(newIndex);
      // 同步选中状态
      dispatch({ type: "SELECT_CHAPTER", payload: allChapters[newIndex].chapter.id });
    }
  };

  // 全屏阅读时隐藏整个主界面
  if (isFullscreen) {
    return (
      <FullScreenReader
        chapters={allChapters}
        currentIndex={fullscreenIndex}
        onNavigate={handleNavigateChapter}
        onClose={handleExitFullscreen}
      />
    );
  }

  return (
    <div className="app-container">
      <Toolbar />
      <div className="main-body">
        <Sidebar />
        <Editor />
        <Preview onEnterFullscreen={handleEnterFullscreen} />
      </div>
      <Modal />
      <Toast />
    </div>
  );
}

export default App;