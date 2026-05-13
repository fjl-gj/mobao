import { useMemo } from 'react';
import { useNovel } from '../hooks/useNovel';
import { useProject } from '../hooks/useProject';
import { useWritingTools } from '../hooks/useWritingTools';
import { renderMarkdown } from '../utils/io';

interface Props {
  onEnterFullscreen?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

const tabs = [
  { key: 'preview', label: '预览' },
  { key: 'annotations', label: '标注' },
  { key: 'history', label: '历史' },
  { key: 'notes', label: '笔记' },
] as const;

export default function ContextPanel({ onEnterFullscreen, onClose, isMobile }: Props) {
  const { state, dispatch } = useNovel();
  const { state: projectState } = useProject();
  const { getChapterNote } = useWritingTools();
  const activeNovel = projectState.activeNovelId ? projectState.novels.find(n => n.id === projectState.activeNovelId) : null;

  const active = useMemo(() => {
    if (!state.activeChapterId) return null;
    for (const vol of state.volumes) {
      const ch = vol.chapters.find(c => c.id === state.activeChapterId);
      if (ch) return ch;
    }
    return null;
  }, [state.activeChapterId, state.volumes]);

  const wordCount = active?.content.replace(/\s/g, '').length || 0;
  const note = active?.relativePath ? getChapterNote(active.relativePath) : '';
  const html = active ? renderMarkdown(active.content) : '';

  const renderBody = () => {
    if (!active) {
      return <div className="context-empty">选择章节后，这里会显示预览、标注和历史。</div>;
    }

    switch (state.contextTab) {
      case 'preview':
        return (
          <div
            className={`context-preview ${state.previewMode === 'reader' ? 'reader-mode' : ''}`}
            dangerouslySetInnerHTML={{ __html: html || '<div class="context-empty">当前章节为空</div>' }}
          />
        );
      case 'annotations':
        return (
          <div className="context-section">
            <div className="context-empty">标注列表将在这里出现。</div>
            <button className="context-action" disabled>添加标注</button>
          </div>
        );
      case 'history':
        return (
          <div className="context-section">
            <div className="context-meta-card">
              <span>当前字数</span>
              <strong>{wordCount}</strong>
            </div>
            <div className="context-meta-card">
              <span>保存策略</span>
              <strong>自动保存 + Ctrl+S</strong>
            </div>
            <div className="context-empty">版本快照和差异对比会放在这里。</div>
          </div>
        );
      case 'notes':
        return (
          <div className="context-section">
            {note ? <p className="context-note">{note}</p> : <div className="context-empty">当前章节还没有笔记。</div>}
          </div>
        );
    }
  };

  return (
    <div className={`context-panel ${isMobile ? 'context-mobile' : ''}`}>
      <div className="context-header">
        <div>
          <span className="context-title">上下文</span>
          {activeNovel && <small>{activeNovel.title}</small>}
        </div>
        <div className="context-header-actions">
          {onEnterFullscreen && <button className="preview-fullscreen-btn" onClick={onEnterFullscreen}>全屏</button>}
          {onClose && <button className="preview-close-btn" onClick={onClose}>×</button>}
        </div>
      </div>

      <div className="context-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={state.contextTab === tab.key ? 'active' : ''}
            onClick={() => dispatch({ type: 'SET_CONTEXT_TAB', payload: tab.key })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {state.contextTab === 'preview' && (
        <div className="context-subtabs">
          <button
            className={state.previewMode === 'preview' ? 'active' : ''}
            onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', payload: 'preview' })}
          >
            普通
          </button>
          <button
            className={state.previewMode === 'reader' ? 'active' : ''}
            onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', payload: 'reader' })}
          >
            阅读
          </button>
        </div>
      )}

      <div className="context-body">{renderBody()}</div>
    </div>
  );
}
