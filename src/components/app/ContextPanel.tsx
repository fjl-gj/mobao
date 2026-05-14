import { useMemo, useState } from 'react';
import { useNovel } from '../../hooks/useNovel';
import { useProject } from '../../hooks/useProject';
import { useWritingTools } from '../../hooks/useWritingTools';
import { renderMarkdown } from '../../utils/io';
import AIAssistantPanel from './AIAssistantPanel';

interface Props {
  onEnterFullscreen?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
  onRestoreHistory?: (content: string) => Promise<void>;
}

const tabs = [
  { key: 'preview', label: '预览' },
  { key: 'annotations', label: '标注' },
  { key: 'history', label: '历史' },
  { key: 'notes', label: '笔记' },
  { key: 'ai', label: 'AI' },
] as const;

function formatTime(value: string) {
  return value ? new Date(value).toLocaleString() : '';
}

function reasonLabel(reason: string) {
  if (reason === 'manual_save') return '手动保存';
  if (reason === 'auto_save') return '自动保存';
  if (reason === 'switch_chapter') return '切换章节';
  if (reason === 'exit_edit') return '退出编辑';
  if (reason === 'before_restore') return '恢复前备份';
  return reason;
}

export default function ContextPanel({ onEnterFullscreen, onClose, isMobile, onRestoreHistory }: Props) {
  const { state, dispatch } = useNovel();
  const { state: projectState } = useProject();
  const {
    state: toolsState,
    createAnnotation,
    deleteAnnotation,
    createWritingNote,
    deleteWritingNote,
  } = useWritingTools();
  const [annotationText, setAnnotationText] = useState('');
  const [noteText, setNoteText] = useState('');
  const activeNovel = projectState.activeNovelId ? projectState.novels.find(n => n.id === projectState.activeNovelId) : null;

  const active = useMemo(() => {
    if (!state.activeChapterId) return null;
    for (const vol of state.volumes) {
      const ch = vol.chapters.find(c => c.id === state.activeChapterId);
      if (ch) return ch;
    }
    return null;
  }, [state.activeChapterId, state.volumes]);

  const chapterPath = active?.relativePath || '';
  const wordCount = active?.content.replace(/\s/g, '').length || 0;
  const html = active ? renderMarkdown(active.content) : '';
  const selection = state.editorSelection?.chapterPath === chapterPath ? state.editorSelection : null;
  const hasSelectedText = Boolean(selection?.selectedText.trim());
  const hasAnchor = Boolean(selection?.chapterPath);
  const annotations = toolsState.annotations.filter(item => item.chapter_rel_path === chapterPath);
  const notes = toolsState.writingNotes.filter(item => item.scope_type === 'chapter' && item.scope_id === chapterPath);

  const addAnnotation = async () => {
    if (!activeNovel || !chapterPath || !annotationText.trim() || !selection || !hasSelectedText) return;
    await createAnnotation(activeNovel.id, chapterPath, annotationText, selection.selectedText, selection.from, selection.to);
    setAnnotationText('');
  };

  const addNote = async () => {
    if (!activeNovel || !chapterPath || !noteText.trim() || !selection) return;
    await createWritingNote(activeNovel.id, chapterPath, noteText, '', selection.selectedText, selection.from, selection.to);
    setNoteText('');
  };

  const restoreHistory = async (content: string) => {
    if (!onRestoreHistory) return;
    const ok = window.confirm('确定恢复到这个历史版本吗？当前内容会先记录一条恢复前备份。');
    if (!ok) return;
    await onRestoreHistory(content);
  };

  const renderSelectionHint = (kind: 'annotation' | 'note') => (
    <div className="context-selection-card">
      <span>{kind === 'annotation' ? '绑定选区' : '绑定位置'}</span>
      {selection ? (
        hasSelectedText ? (
          <blockquote>{selection.selectedText}</blockquote>
        ) : (
          <p>光标位置：{selection.from}</p>
        )
      ) : (
        <p>请先在编辑器中选中文本或放置光标。</p>
      )}
    </div>
  );

  const renderBody = () => {
    if (!active) {
      return <div className="context-empty">选择章节后，这里会显示预览、标注、历史和笔记。</div>;
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
            {renderSelectionHint('annotation')}
            <div className="context-compose">
              <textarea
                value={annotationText}
                onChange={e => setAnnotationText(e.target.value)}
                placeholder="写下对当前选区的标注..."
                rows={3}
              />
              <button className="context-action" onClick={addAnnotation} disabled={!annotationText.trim() || !hasSelectedText}>
                标注当前选区
              </button>
            </div>
            {annotations.length === 0 ? (
              <div className="context-empty">当前章节还没有标注。</div>
            ) : annotations.map(item => (
              <article key={item.id} className="context-record">
                <p>{item.content}</p>
                {item.selected_text && <blockquote>{item.selected_text}</blockquote>}
                <footer>
                  <span>{formatTime(item.created_at)} · {item.anchor_start ?? 0}-{item.anchor_end ?? 0}</span>
                  <button onClick={() => deleteAnnotation(item.id)}>删除</button>
                </footer>
              </article>
            ))}
          </div>
        );
      case 'history':
        return (
          <div className="context-section">
            <div className="context-meta-card">
              <span>当前字数</span>
              <strong>{wordCount}</strong>
            </div>
            {toolsState.chapterHistory.length === 0 ? (
              <div className="context-empty">保存后会记录最近 10 次有效变更。</div>
            ) : toolsState.chapterHistory.map(item => (
              <article key={item.id} className="context-record">
                <p>{reasonLabel(item.change_reason)} · {item.word_count} 字</p>
                <footer>
                  <span>{formatTime(item.created_at)}</span>
                  <button onClick={() => restoreHistory(item.content_snapshot)}>恢复</button>
                </footer>
              </article>
            ))}
          </div>
        );
      case 'notes':
        return (
          <div className="context-section">
            {renderSelectionHint('note')}
            <div className="context-compose">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="写下与当前位置相关的笔记..."
                rows={3}
              />
              <button className="context-action" onClick={addNote} disabled={!noteText.trim() || !hasAnchor}>
                记录当前位置笔记
              </button>
            </div>
            {notes.length === 0 ? (
              <div className="context-empty">当前章节还没有笔记。</div>
            ) : notes.map(item => (
              <article key={item.id} className="context-record">
                {item.selected_text && <blockquote>{item.selected_text}</blockquote>}
                <p>{item.content}</p>
                <footer>
                  <span>{formatTime(item.created_at)} · {item.anchor_start ?? 0}-{item.anchor_end ?? 0}</span>
                  <button onClick={() => deleteWritingNote(item.id)}>删除</button>
                </footer>
              </article>
            ))}
          </div>
        );
      case 'ai':
        return <AIAssistantPanel chapterTitle={active.title} wordCount={wordCount} />;
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
