import { useRef, useState } from 'react';
import { useNovel } from '../../hooks/useNovel';
import { useProject } from '../../hooks/useProject';
import { useResponsiveCtx } from '../../contexts/ResponsiveContext';
import ThemeToggle from '../common/ThemeToggle';

interface ToolbarProps {
  onSearch: () => void;
  sidebarsOpen: boolean;
  leftSidebarOpen: boolean;
  onToggleSidebars: () => void;
  onToggleLeftSidebar: () => void;
}

export default function Toolbar({
  onSearch,
  sidebarsOpen,
  leftSidebarOpen,
  onToggleSidebars,
  onToggleLeftSidebar,
}: ToolbarProps) {
  const mdInput = useRef<HTMLInputElement>(null);
  const wordInput = useRef<HTMLInputElement>(null);
  const { dispatch, importMD, importWord, exportMD } = useNovel();
  const { state: { activeNovelId } } = useProject();
  const { isDesktop, togglePreview, previewOpen } = useResponsiveCtx();
  const [menuOpen, setMenuOpen] = useState(false);

  const openSettings = () => {
    dispatch({ type: 'SHOW_MODAL', payload: { type: 'settings' } } as any);
    setMenuOpen(false);
  };

  return (
    <div className="toolbar">
      {isDesktop && (
        <div className="toolbar-app-menu-wrap">
          <button className="toolbar-menu-btn" onClick={() => setMenuOpen(open => !open)} title="应用菜单">
            ☰
          </button>
          {menuOpen && (
            <div className="toolbar-app-menu">
              <div className="toolbar-menu-section">
                <span>文件</span>
                <button onClick={() => { mdInput.current?.click(); setMenuOpen(false); }}>导入 MD</button>
                <button onClick={() => { wordInput.current?.click(); setMenuOpen(false); }}>导入 Word</button>
                <button onClick={() => { exportMD(); setMenuOpen(false); }}>导出 MD</button>
              </div>
              <div className="toolbar-menu-section">
                <span>应用</span>
                <button onClick={() => { onSearch(); setMenuOpen(false); }} disabled={!activeNovelId}>搜索</button>
                <button onClick={openSettings}>设置</button>
              </div>
            </div>
          )}
        </div>
      )}

      <span className="brand">墨宝</span>

      {isDesktop ? (
        <>
          <button onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'newVolume' } })} disabled={!activeNovelId}>新卷</button>
          <button onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'newChapter' } })} disabled={!activeNovelId}>新章节</button>
          <span className="toolbar-sep" />
          <button onClick={onToggleSidebars}>{sidebarsOpen ? '收起侧边栏' : '展开侧边栏'}</button>
          <button onClick={onToggleLeftSidebar}>{leftSidebarOpen ? '收起左侧边栏' : '展开左侧边栏'}</button>
          <span className="toolbar-sep" />
          <button onClick={togglePreview}>{previewOpen ? '编辑' : '预览'}</button>
          <ThemeToggle />
        </>
      ) : (
        <>
          <button onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'newChapter' } })} disabled={!activeNovelId} className="toolbar-mobile-action">
            新
          </button>
          <button onClick={togglePreview} className="toolbar-mobile-action">
            {previewOpen ? '编' : '预'}
          </button>
        </>
      )}

      <input ref={mdInput} type="file" accept=".md" hidden
        onChange={e => { if (e.target.files?.[0]) importMD(e.target.files[0]); e.target.value = ''; }} />
      <input ref={wordInput} type="file" accept=".docx" hidden
        onChange={e => { if (e.target.files?.[0]) importWord(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}
