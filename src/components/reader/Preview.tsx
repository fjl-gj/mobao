import { useNovel } from '../../hooks/useNovel';
import { renderMarkdown } from '../../utils/io';
import { useResponsiveCtx } from '../../contexts/ResponsiveContext';

interface Props {
  onEnterFullscreen?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Preview({ onEnterFullscreen, onClose, isMobile }: Props) {
  const { state, dispatch } = useNovel();
  const { isDesktop } = useResponsiveCtx();

  const active = (() => {
    if (!state.activeChapterId) return null;
    for (const vol of state.volumes) {
      const ch = vol.chapters.find(c => c.id === state.activeChapterId);
      if (ch) return ch;
    }
    return null;
  })();

  const html = active ? renderMarkdown(active.content) : '';

  return (
    <div className={`preview-panel ${isMobile ? 'preview-mobile' : ''}`}>
      <div className="preview-header">
        <span>📄 预览</span>
        <div className="preview-actions">
          <button className={`preview-mode-btn ${state.previewMode === 'preview' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', payload: 'preview' })}>普通</button>
          <button className={`preview-mode-btn ${state.previewMode === 'reader' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', payload: 'reader' })}>阅读</button>
          <button className="preview-fullscreen-btn" onClick={onEnterFullscreen}>全屏 📖</button>
          {onClose && <button className="preview-close-btn" onClick={onClose}>✕</button>}
        </div>
      </div>
      <div className={`preview-content ${state.previewMode === 'reader' ? 'reader-mode' : ''}`}
        dangerouslySetInnerHTML={{ __html: html || '<div class="empty-state">选择章节开始预览</div>' }} />
    </div>
  );
}
