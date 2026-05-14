import { useState, useMemo, useEffect } from 'react';
import { useNovel } from './hooks/useNovel';
import { useProject } from './hooks/useProject';
import { useWritingTools } from './hooks/useWritingTools';
import { useSettings } from './hooks/useSettings';
import { useResponsiveCtx } from './contexts/ResponsiveContext';
import Toolbar from './components/app/Toolbar';
import Sidebar from './components/app/Sidebar';
import MobileNav from './components/app/MobileNav';
import Editor from './components/editor/Editor';
import ContextPanel from './components/app/ContextPanel';
import Modal from './components/common/Modal';
import Toast from './components/common/Toast';
import FullScreenReader from './components/reader/FullScreenReader';
import SearchOverlay from './components/common/SearchOverlay';
import type { Chapter, Volume } from './contexts/NovelContext';
import './App.css';

function App() {
  const { state: novelState, dispatch, saveToFile } = useNovel();
  const { state: projectState, loadSeries, setActiveSeries, setActiveNovel, loadNovels } = useProject();
  const { loadAll, clearAll, recordChapterHistory, loadChapterHistory } = useWritingTools();
  const { settings, updateSettings } = useSettings();
  const responsive = useResponsiveCtx();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  useEffect(() => { loadSeries(); }, [loadSeries]);

  useEffect(() => {
    if (projectState.activeNovelId) {
      loadAll(projectState.activeNovelId);
    } else {
      clearAll();
    }
  }, [projectState.activeNovelId, loadAll, clearAll]);

  useEffect(() => {
    if (settings.lastSeriesId && projectState.series.length > 0) {
      const exists = projectState.series.find(s => s.id === settings.lastSeriesId);
      if (exists) {
        setActiveSeries(settings.lastSeriesId);
        loadNovels(settings.lastSeriesId);
      }
    }
  }, [settings.lastSeriesId, projectState.series, setActiveSeries, loadNovels]);

  useEffect(() => {
    if (settings.lastNovelId && projectState.novels.length > 0) {
      const exists = projectState.novels.find(n => n.id === settings.lastNovelId);
      if (exists) setActiveNovel(settings.lastNovelId);
    }
  }, [settings.lastNovelId, projectState.novels, setActiveNovel]);

  useEffect(() => {
    if (projectState.activeSeriesId) updateSettings({ lastSeriesId: projectState.activeSeriesId });
  }, [projectState.activeSeriesId, updateSettings]);

  useEffect(() => {
    if (projectState.activeNovelId) updateSettings({ lastNovelId: projectState.activeNovelId });
  }, [projectState.activeNovelId, updateSettings]);

  const allChapters = useMemo(() => {
    const list: { volume: Volume; chapter: Chapter }[] = [];
    novelState.volumes.forEach(volume => {
      volume.chapters.forEach(chapter => list.push({ volume, chapter }));
    });
    return list;
  }, [novelState.volumes]);

  const activeIndex = useMemo(() => {
    if (!novelState.activeChapterId) return -1;
    return allChapters.findIndex(item => item.chapter.id === novelState.activeChapterId);
  }, [novelState.activeChapterId, allChapters]);

  const handleEnterFullscreen = () => {
    const idx = activeIndex;
    if (idx === -1) {
      if (allChapters.length > 0) {
        dispatch({ type: 'SELECT_CHAPTER', payload: allChapters[0].chapter.id });
        setFullscreenIndex(0);
      } else {
        alert('请先创建至少一个章节');
        return;
      }
    } else {
      setFullscreenIndex(idx);
    }
    setIsFullscreen(true);
  };

  const handleExitFullscreen = () => {
    setIsFullscreen(false);
    const chapter = allChapters[fullscreenIndex]?.chapter;
    if (chapter) dispatch({ type: 'SELECT_CHAPTER', payload: chapter.id });
  };

  const handleNavigateChapter = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < allChapters.length) {
      setFullscreenIndex(newIndex);
      dispatch({ type: 'SELECT_CHAPTER', payload: allChapters[newIndex].chapter.id });
    }
  };

  const handleRestoreHistory = async (content: string) => {
    const active = allChapters[activeIndex]?.chapter;
    const activeNovel = projectState.activeNovelId ? projectState.novels.find(n => n.id === projectState.activeNovelId) : null;
    if (!active || !activeNovel || !active.relativePath) return;

    await recordChapterHistory(activeNovel.id, active.relativePath, active.title, active.content, 'before_restore');
    dispatch({ type: 'UPDATE_CHAPTER_CONTENT', payload: { id: active.id, content } });
    await saveToFile(activeNovel.root_path, active.relativePath, content);
    await loadChapterHistory(activeNovel.id, active.relativePath);
    dispatch({ type: 'ADD_TOAST', payload: { message: '已恢复历史版本', type: 'success' } });
  };

  const toggleSidebars = () => {
    const eitherOpen = responsive.sidebarOpen || rightSidebarOpen;
    if (eitherOpen) {
      responsive.closeSidebar();
      setRightSidebarOpen(false);
    } else {
      responsive.openSidebar();
      setRightSidebarOpen(true);
    }
  };

  const toggleLeftSidebar = () => {
    responsive.toggleSidebar();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch(s => !s);
      }
      if (e.key === 'Escape') {
        if (responsive.sidebarOpen && !responsive.isDesktop) responsive.closeSidebar();
        if (responsive.previewOpen && !responsive.isDesktop) responsive.closePreview();
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [responsive]);

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

  const showOverlay = responsive.sidebarOpen && !responsive.isDesktop;
  const sidebarsOpen = responsive.sidebarOpen || rightSidebarOpen;

  return (
    <div className={`app-container bp-${responsive.breakpoint}`}>
      <Toolbar
        onSearch={() => setShowSearch(true)}
        sidebarsOpen={sidebarsOpen}
        leftSidebarOpen={responsive.sidebarOpen}
        onToggleSidebars={toggleSidebars}
        onToggleLeftSidebar={toggleLeftSidebar}
      />

      <div className="main-body">
        <div className={`sidebar-wrapper ${responsive.sidebarOpen ? 'open' : 'collapsed'}`}>
          <Sidebar onClose={responsive.isDesktop ? undefined : responsive.closeSidebar} />
        </div>

        {showOverlay && (
          <div className="drawer-backdrop" onClick={responsive.closeSidebar} />
        )}

        <Editor />

        {responsive.isDesktop ? (
          rightSidebarOpen && (
            <ContextPanel onEnterFullscreen={handleEnterFullscreen} onRestoreHistory={handleRestoreHistory} />
          )
        ) : responsive.previewOpen && (
          <div className="mobile-preview-overlay">
            <ContextPanel onEnterFullscreen={handleEnterFullscreen} onClose={responsive.closePreview} onRestoreHistory={handleRestoreHistory} isMobile />
          </div>
        )}
      </div>

      {responsive.isMobile && <MobileNav />}

      <Modal />
      <Toast />
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
    </div>
  );
}

export default App;
