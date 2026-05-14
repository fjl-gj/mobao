import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { useNovel } from '../../hooks/useNovel';
import { useProject } from '../../hooks/useProject';
import { useSettings } from '../../hooks/useSettings';
import { useWritingTools } from '../../hooks/useWritingTools';
import { readTextFile } from '../../utils/fileOps';
import { renderMarkdown } from '../../utils/io';
import EditorToolbar from './EditorToolbar';

export default function Editor() {
  const { state: novelState, dispatch, saveToFile } = useNovel();
  const { state: projectState } = useProject();
  const activeNovel = projectState.activeNovelId ? projectState.novels.find(n => n.id === projectState.activeNovelId) : null;
  const { settings } = useSettings();
  const { setChapterNote, getChapterNote, recordChapterHistory, loadChapterHistory } = useWritingTools();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const activePathRef = useRef<string>('');
  const [editorView, setEditorView] = useState<EditorView | null>(null);
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
  const currentWordCount = active?.content.replace(/\s/g, '').length || 0;
  const totalWordCount = novelState.volumes.reduce((sum, vol) =>
    sum + vol.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.content.replace(/\s/g, '').length, 0), 0
  );
  const cursorOffset = novelState.editorSelection?.chapterPath === currentPath
    ? novelState.editorSelection.from
    : 0;
  const cursorPrefix = active?.content.slice(0, cursorOffset) || '';
  const cursorLines = cursorPrefix.split('\n');
  const cursorLine = cursorLines.length;
  const cursorColumn = cursorLines[cursorLines.length - 1].length + 1;
  const editorStyle = {
    '--editor-font-size': `${settings.editorFontSize}px`,
    '--editor-line-height': settings.editorLineHeight,
    '--editor-font-family': settings.editorFontFamily,
  } as CSSProperties;

  useEffect(() => {
    activeIdRef.current = active?.id || null;
    activePathRef.current = active?.relativePath || '';
  }, [active?.id, active?.relativePath, active?.content]);

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
        keymap.of([
          indentWithTab,
          {
            key: 'Mod-b',
            run: view => {
              const { from, to } = view.state.selection.main;
              const selected = view.state.sliceDoc(from, to) || '加粗文本';
              view.dispatch({
                changes: { from, to, insert: `**${selected}**` },
                selection: { anchor: from + selected.length + 4 },
              });
              return true;
            },
          },
          {
            key: 'Mod-i',
            run: view => {
              const { from, to } = view.state.selection.main;
              const selected = view.state.sliceDoc(from, to) || '斜体文本';
              view.dispatch({
                changes: { from, to, insert: `*${selected}*` },
                selection: { anchor: from + selected.length + 2 },
              });
              return true;
            },
          },
        ]),
        EditorView.updateListener.of(update => {
          if (update.docChanged || update.selectionSet) {
            const content = update.state.doc.toString();
            if (activeIdRef.current) {
              if (update.docChanged) {
                dispatch({ type: 'UPDATE_CHAPTER_CONTENT', payload: { id: activeIdRef.current, content } });
              }
              const selection = update.state.selection.main;
              dispatch({
                type: 'SET_EDITOR_SELECTION',
                payload: {
                  chapterId: activeIdRef.current,
                  chapterPath: activePathRef.current,
                  from: selection.from,
                  to: selection.to,
                  selectedText: update.state.sliceDoc(selection.from, selection.to),
                },
              });
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
    setEditorView(view);

    return () => {
      view.destroy();
      viewRef.current = null;
      setEditorView(null);
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
        recordChapterHistory(activeNovel.id, currentPath, active.title, active.content, 'switch_chapter');
        saveToFile(activeNovel.root_path, currentPath, active.content);
      }
    };
  }, [active?.id]);

  useEffect(() => {
    if (!activeNovel || !currentPath || !settings.autoSave || !active?.contentLoaded) return;
    const content = active?.content || '';
    const intervalMs = Math.max(1, settings.autoSaveInterval) * 1000;
    const timer = setTimeout(() => {
      recordChapterHistory(activeNovel.id, currentPath, active.title, content, 'auto_save');
      saveToFile(activeNovel.root_path, currentPath, content);
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [active?.content, active?.title, currentPath, activeNovel?.id, activeNovel?.root_path, settings.autoSave, settings.autoSaveInterval, saveToFile, recordChapterHistory]);

  useEffect(() => {
    setCurrentTitle(active?.title || '');
  }, [active?.title]);

  useEffect(() => {
    if (activeNovel && currentPath) loadChapterHistory(activeNovel.id, currentPath);
  }, [activeNovel?.id, currentPath, loadChapterHistory]);

  const saveCurrent = async () => {
    if (!activeNovel || !currentPath || !active?.contentLoaded) return;
    await recordChapterHistory(activeNovel.id, currentPath, active.title, active.content, 'manual_save');
    await saveToFile(activeNovel.root_path, currentPath, active.content);
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
      recordChapterHistory(activeNovel.id, currentPath, active.title, active.content, 'exit_edit');
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

      {isEditing && <EditorToolbar view={editorView} disabled={!active} />}

      <div className="editor-content">
        {loadingContent && <div className="editor-loading">正在读取章节...</div>}
        {isEditing ? (
          <div ref={editorRef} className="codemirror-container" style={editorStyle} />
        ) : (
          <div
            className={`workspace-reader ${novelState.previewMode === 'reader' ? 'reader-mode' : ''}`}
            dangerouslySetInnerHTML={{ __html: readerHtml || '<div class="empty-state">选择章节开始阅读</div>' }}
          />
        )}
      </div>

      <div className="editor-statusbar">
        <div className="editor-statusbar-info">
          <span>本章 {currentWordCount} 字</span>
          <span>总计 {totalWordCount} 字</span>
          {active && <span>行 {cursorLine}，列 {cursorColumn}</span>}
        </div>
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
