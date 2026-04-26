import { useResponsiveCtx } from '../contexts/ResponsiveContext';
import { useNovel } from '../hooks/useNovel';

const NAV_ITEMS = [
  { key: 'sidebar', icon: '📚', label: '项目' },
  { key: 'toc', icon: '📑', label: '目录' },
  { key: 'tools', icon: '🧰', label: '工具' },
  { key: 'preview', icon: '👁', label: '预览' },
] as const;

export default function MobileNav() {
  const { openSidebar, togglePreview, previewOpen } = useResponsiveCtx();
  const { state, dispatch } = useNovel();

  const wc = (() => {
    if (!state.activeChapterId) return 0;
    for (const vol of state.volumes) {
      const ch = vol.chapters.find(c => c.id === state.activeChapterId);
      if (ch) return ch.content.replace(/\s/g, '').length;
    }
    return 0;
  })();

  return (
    <div className="mobile-nav">
      <div className="mobile-nav-items">
        <button className="mobile-nav-item" onClick={openSidebar}>
          <span className="mnav-icon">📚</span>
          <span className="mnav-label">项目</span>
        </button>

        <button className="mobile-nav-item" onClick={() => dispatch({ type: 'SHOW_MODAL', payload: { type: 'newChapter' } } as any)}>
          <span className="mnav-icon">📝</span>
          <span className="mnav-label">写</span>
        </button>

        <button className="mobile-nav-item" onClick={togglePreview}>
          <span className="mnav-icon">{previewOpen ? '✏️' : '👁'}</span>
          <span className="mnav-label">{previewOpen ? '编辑' : '预览'}</span>
        </button>
      </div>
      {wc > 0 && <span className="mobile-nav-wc">{wc}</span>}
    </div>
  );
}
