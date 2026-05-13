import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { useNovel } from '../hooks/useNovel';
import { useProject } from '../hooks/useProject';
import { useSettings } from '../hooks/useSettings';
import { useWritingTools } from '../hooks/useWritingTools';
import { readTextFile } from '../utils/fileOps';
import { renderMarkdown } from '../utils/io';
import EditorToolbar from './EditorToolbar';

export default function Editor() {
  const { state: novelState, dispatch, saveToFile } = useNovel();
  const { state: projectState } = useProject();
  const activeNovel = projectState.activeNovelId ? projectState.novels.find(n => n.id === projectState.activeNovelId) : null;
  const { settings } = useSettings();
  const { setChapterNote, getChapterNote } = useWritingTools();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const isEditing = novelState.workspaceMode === 'edit';

  const active = useMemo(() => {
    if (!novelState.activeChapterId) return null;
    for (const vol of novelState.volumes) {
      const ch = vol.chapters.find(c => c.id === novelState.activeChapterId);
      if (ch) return ch;
    }
    return null;
  }, [novelState.activeChapterId, novelState.volumes]);
  const currentPath = active?.relativePath || null;
  const note = currentPath ? getChapterNote(currentPath) : '';
  const readerHtml = active ? renderMarkdown(active.content) : '';

  useEffect(() => {
    activeIdRef.current = active?.id || null;
  }, [active?.id, active?.content]);

  useEffect(() => {
    let cancelled = false;
    if (!activeNovel || !active || !active.relativePath || active.contentLoaded) return;
    setLoadingContent(true);
    readTextFile(`${activeNovel.root_path}/${active.relativePath}`)
      .then(content => {
        if (cancelled) return;
        dispatch({ type: 'UPDATE_CHAPTER_CONTENT', payload: { id: active.id, content } });
      })
      .catch(() => {
        if (cancelled) return;
        dispatch({ type: 'ADD_TOAST', payload: { message: `读取失败: ${active.relativePath}`, type: 'error' } });
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active?.id, active?.relativePath, active?.contentLoaded, activeNovel?.root_path, dispatch]);

  useEffect(() => {
    if (!isEditing || !editorRef.current || viewRef.current) return;

    const startState = EditorState.create({
      doc: active?.content || '',
      extensions: [
        basicSetup,
        markdown({ base: markdownLanguage }),
        keymap.of([indentWithTab]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            if (activeIdRef.current) {
              dispatch({ type: 'UPDATE_CHAPTER_CONTENT', payload: { id: activeIdRef.current, content } });
            }
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [isEditing, dispatch]);

  useEffect(() => {
    if (!isEditing || !viewRef.current) return;
    const current = viewRef.current.state.doc.toString();
    if (active && current !== active.content) {
      viewRef.current.dispatch({
        changes: { from: 0, to: current.length, insert: active.content },
      });
    }
    if (!active) {
      viewRef.current.dispatch({
        changes: { from: 0, to: current.length, insert: '' },
      });
    }
  }, [isEditing, active?.id, active?.content, active?.contentLoaded]);

  useEffect(() => {
    return () => {
      if (activeNovel && currentPath && active?.contentLoaded) {
        saveToFile(activeNovel.root_path, currentPath, active.content);
      }
    };
  }, [active?.id]);

  useEffect(() => {
    if (!activeNovel || !currentPath || !settings.autoSave || !active?.contentLoaded) return;
    const content = active?.content || '';
    const intervalMs = Math.max(1, settings.autoSaveInterval) * 1000;
    const timer = setTimeout(() => {
      saveToFile(activeNovel.root_path, currentPath, content);
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [active?.content, currentPath, activeNovel?.root_path, settings.autoSave, settings.autoSaveInterval, saveToFile]);

  useEffect(() => {
    setCurrentTitle(active?.title || '');
  }, [active?.title]);

  const saveCurrent = () => {
    if (!activeNovel || !currentPath || !active?.contentLoaded) return;
    saveToFile(activeNovel.root_path, currentPath, active.content);
    dispatch({ type: 'ADD_TOAST', payload: { message: '已保存当前章节', type: 'success' } });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        if (!active) return;
        dispatch({ type: 'SET_WORKSPACE_MODE', payload: isEditing ? 'read' : 'edit' });
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveCurrent();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active?.id, active?.content, active?.contentLoaded, activeNovel?.root_path, currentPath, dispatch, isEditing]);

  const enterEdit = () => {
    if (active) dispatch({ type: 'SET_WORKSPACE_MODE', payload: 'edit' });
  };

  const exitEdit = () => {
    if (activeNovel && currentPath && active?.contentLoaded) {
      saveToFile(activeNovel.root_path, currentPath, active.content);
    }
    dispatch({ type: 'SET_WORKSPACE_MODE', payload: 'read' });
  };

  if (!activeNovel) {
    return (
      <div className={`editor-area${focusMode ? ' focus-mode' : ''}`}>
        <div className="editor-welcome">
          <div className="welcome-icon">📚</div>
          <h2>墨宝 · 小说编辑器</h2>
          <p>在左侧“项目”中新建或导入一部小说开始写作</p>
          <div className="welcome-steps">
            <span>1. 创建或选择一个集合</span>
            <span>2. 新建 / 导入小说</span>
            <span>3. 从目录中选择章节开始写作</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`editor-area ${focusMode ? 'focus-mode' : ''}`}>
      <div className="editor-header">
        {isEditing ? (
          <input
            value={currentTitle}
            onChange={e => {
              setCurrentTitle(e.target.value);
              if (active) {
                dispatch({ type: 'UPDATE_CHAPTER_TITLE', payload: { id: active.id, title: e.target.value } });
              }
            }}
            placeholder="章节标题"
            disabled={!active}
            className="editor-title-input"
          />
        ) : (
          <div className="editor-title-readonly">
            <span>{active?.title || '选择章节开始阅读'}</span>
            {active && <em>预览中</em>}
          </div>
        )}
        <div className="editor-header-actions">
          {active && (
            isEditing ? (
              <>
                <button onClick={saveCurrent} title="保存当前章节 (Ctrl+S)" className="toolbar-btn">保存</button>
                <button onClick={exitEdit} title="退出编辑 (Ctrl+E)" className="toolbar-btn">预览</button>
              </>
            ) : (
              <button onClick={enterEdit} title="进入编辑 (Ctrl+E)" className="toolbar-btn">编辑</button>
            )
          )}
          <button onClick={() => setFocusMode(!focusMode)} title="专注模式" className="toolbar-btn">
            {focusMode ? '退出' : '专注'}
          </button>
          <button onClick={() => setShowNote(!showNote)} title="章节备注" className="toolbar-btn">
            备注 {note ? '●' : '○'}
          </button>
        </div>
      </div>

      {isEditing && <EditorToolbar />}

      <div className="editor-content">
        {loadingContent && <div className="editor-loading">正在读取章节...</div>}
        {isEditing ? (
          <div ref={editorRef} className="codemirror-container" />
        ) : (
          <div
            className={`workspace-reader ${novelState.previewMode === 'reader' ? 'reader-mode' : ''}`}
            dangerouslySetInnerHTML={{ __html: readerHtml || '<div class="empty-state">选择章节开始阅读</div>' }}
          />
        )}
      </div>

      {showNote && active && currentPath && (
        <div className="chapter-note-panel">
          <textarea
            defaultValue={getChapterNote(currentPath)}
            onBlur={e => {
              if (activeNovel) setChapterNote(activeNovel.id, currentPath, e.target.value);
            }}
            placeholder="写作备注（仅自己可见，不导出）..."
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
