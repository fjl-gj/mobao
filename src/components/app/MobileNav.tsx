import { useRef, useState } from 'react';
import { useResponsiveCtx } from '../../contexts/ResponsiveContext';
import { useNovel } from '../../hooks/useNovel';
import { useProject } from '../../hooks/useProject';

export default function MobileNav() {
  const { openSidebar, togglePreview, previewOpen } = useResponsiveCtx();
  const { state, dispatch, importMD, importWord, exportMD } = useNovel();
  const { state: { activeNovelId } } = useProject();
  const [writeMenuOpen, setWriteMenuOpen] = useState(false);
  const mdInput = useRef<HTMLInputElement>(null);
  const wordInput = useRef<HTMLInputElement>(null);

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

        <button className="mobile-nav-item" onClick={() => setWriteMenuOpen(open => !open)}>
          <span className="mnav-icon">📝</span>
          <span className="mnav-label">写</span>
        </button>

        <button className="mobile-nav-item" onClick={togglePreview}>
          <span className="mnav-icon">{previewOpen ? '✏️' : '👁'}</span>
          <span className="mnav-label">{previewOpen ? '编辑' : '预览'}</span>
        </button>
      </div>
      {wc > 0 && <span className="mobile-nav-wc">{wc}</span>}
      {writeMenuOpen && (
        <div className="mobile-write-menu">
          <button onClick={() => { dispatch({ type: 'SHOW_MODAL', payload: { type: 'newChapter' } } as any); setWriteMenuOpen(false); }} disabled={!activeNovelId}>📝 新章节</button>
          <button onClick={() => { dispatch({ type: 'SHOW_MODAL', payload: { type: 'newVolume' } } as any); setWriteMenuOpen(false); }} disabled={!activeNovelId}>📁 新卷</button>
          <button onClick={() => { mdInput.current?.click(); setWriteMenuOpen(false); }}>📥 导入MD</button>
          <button onClick={() => { wordInput.current?.click(); setWriteMenuOpen(false); }}>📥 导入Word</button>
          <button onClick={() => { exportMD(); setWriteMenuOpen(false); }}>📤 导出MD</button>
        </div>
      )}
      <input ref={mdInput} type="file" accept=".md" hidden
        onChange={e => { if (e.target.files?.[0]) importMD(e.target.files[0]); e.target.value = ''; }} />
      <input ref={wordInput} type="file" accept=".docx" hidden
        onChange={e => { if (e.target.files?.[0]) importWord(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}
