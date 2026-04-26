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

  const active = useMemo(() => {
    if (!novelState.activeChapterId) return null;
    for (const vol of novelState.volumes) {
      const ch = vol.chapters.find(c => c.id === novelState.activeChapterId);
      if (ch) return ch;
    }
    return null;
  }, [novelState.activeChapterId, novelState.volumes]);
  const currentPath = active?.relativePath || null;

  useEffect(() => {
    activeIdRef.current = active?.id || null;
  }, [active?.id, active?.content]);

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

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
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;
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
  }, [active?.id]);

  useEffect(() => {
    if (!activeNovel || !currentPath || !settings.autoSave) return;
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

  const handleFocusToggle = () => setFocusMode(!focusMode);

  const note = currentPath ? getChapterNote(currentPath) : '';

  return (
    <div className={`editor-area ${focusMode ? 'focus-mode' : ''}`}>
      <div className="editor-header">
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
        <div className="editor-header-actions">
          <button onClick={handleFocusToggle} title="专注模式" className="toolbar-btn">
            {focusMode ? '⊞' : '⊟'}
          </button>
          <button onClick={() => setShowNote(!showNote)} title="章节备注" className="toolbar-btn">
            📝 {note ? '●' : '○'}
          </button>
        </div>
      </div>

      <EditorToolbar />

      <div className="editor-content">
        <div ref={editorRef} className="codemirror-container" />
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
