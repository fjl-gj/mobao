import { useRef, useState } from 'react';
import { useNovel } from '../hooks/useNovel';
import { useProject } from '../hooks/useProject';
import { useResponsiveCtx } from '../contexts/ResponsiveContext';
import { platformCapabilities } from '../core/platform-capabilities';
import ThemeToggle from './ThemeToggle';

export default function Toolbar({ onSearch }: { onSearch: () => void }) {
  const mdInput = useRef<HTMLInputElement>(null);
  const wordInput = useRef<HTMLInputElement>(null);
  const { state, dispatch, importMD, importWord, exportMD } = useNovel();
  const { state: { activeNovelId } } = useProject();
  const { isDesktop, toggleSidebar, togglePreview, previewOpen } = useResponsiveCtx();
  const [menuOpen, setMenuOpen] = useState(false);

  const wordCount = (() => {
    if (!state.activeChapterId) return 0;
    for (const vol of state.volumes) {
      const ch = vol.chapters.find(c => c.id === state.activeChapterId);
      if (ch) return ch.content.replace(/\s/g, '').length;
    }
    return 0;
  })();

  const totalWordCount = (() => {
    return state.volumes.reduce((sum, vol) =>
      sum + vol.chapters.reduce((s, ch) => s + ch.content.replace(/\s/g, '').length, 0), 0
    );
  })();

  const desktopActions = (
    <>
      <button onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'newVolume' } })} disabled={!activeNovelId}>📁 新卷</button>
      <button onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'newChapter' } })} disabled={!activeNovelId}>📝 新章节</button>
      <span className="toolbar-sep" />
      <button onClick={() => mdInput.current?.click()}>📥 导入MD</button>
      <button onClick={() => wordInput.current?.click()}>📥 导入Word</button>
      <button onClick={exportMD}>📤 导出MD</button>
      <span className="toolbar-sep" />
      <button onClick={togglePreview}>👁 {previewOpen ? '编辑' : '预览'}</button>
      <button onClick={onSearch} disabled={!activeNovelId}>🔍</button>
      <ThemeToggle />
    </>
  );

  return (
    <div className="toolbar">
      <button className="toolbar-menu-btn" onClick={toggleSidebar} title="侧边栏">
        ☰
      </button>

      <span className="brand">墨宝</span>

      {isDesktop ? (
        desktopActions
      ) : (
        <>
          <button onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'newChapter' } })} disabled={!activeNovelId} className="toolbar-mobile-action">
            📝
          </button>
          <button onClick={togglePreview} className="toolbar-mobile-action">
            👁
          </button>
          <button onClick={() => setMenuOpen(m => !m)} className="toolbar-mobile-action">
            ⋯
          </button>
          {menuOpen && (
            <div className="toolbar-overflow-menu">
              <button onClick={() => { onSearch(); setMenuOpen(false); }} disabled={!activeNovelId}>🔍 搜索</button>
              <ThemeToggle />
            </div>
          )}
        </>
      )}

      {isDesktop && (
        <span className="toolbar-stats">
          <span>{wordCount}字</span>
          <span>/{totalWordCount}</span>
          {platformCapabilities.usesBrowserWorkspace && <span className="browser-badge">WEB</span>}
        </span>
      )}

      <input ref={mdInput} type="file" accept=".md" hidden
        onChange={e => { if (e.target.files?.[0]) importMD(e.target.files[0]); e.target.value = ''; }} />
      <input ref={wordInput} type="file" accept=".docx" hidden
        onChange={e => { if (e.target.files?.[0]) importWord(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}
