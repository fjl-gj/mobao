import React, { createContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { loadState, persistState } from '../utils/store';
import { generateId } from '../utils/helpers';
import { importMarkdownFile, importWordFile, exportToMarkdown, downloadFile } from '../utils/io';
import { writeTextFile } from '../utils/fileOps';
import { brand } from '../config/brand';

type NovelAction =
  | { type: 'SET_STATE'; payload: Partial<NovelState> }
  | { type: 'ADD_VOLUME'; payload: { title: string } }
  | { type: 'DELETE_VOLUME'; payload: string }
  | { type: 'RENAME_VOLUME'; payload: { id: string; title: string } }
  | { type: 'ADD_CHAPTER'; payload: { volId: string; title: string; content?: string; relativePath?: string } }
  | { type: 'UPSERT_CHAPTER'; payload: { title: string; content?: string; relativePath: string; volumeTitle?: string; contentLoaded?: boolean } }
  | { type: 'DELETE_CHAPTER'; payload: string }
  | { type: 'SELECT_CHAPTER'; payload: string }
  | { type: 'UPDATE_CHAPTER_TITLE'; payload: { id: string; title: string } }
  | { type: 'UPDATE_CHAPTER_CONTENT'; payload: { id: string; content: string } }
  | { type: 'MOVE_CHAPTER'; payload: { chId: string; direction: 'up' | 'down' } }
  | { type: 'MOVE_VOLUME'; payload: { volId: string; direction: 'up' | 'down' } }
  | { type: 'SET_PREVIEW_MODE'; payload: 'preview' | 'reader' }
  | { type: 'SET_WORKSPACE_MODE'; payload: 'read' | 'edit' }
  | { type: 'SET_CONTEXT_TAB'; payload: 'preview' | 'annotations' | 'history' | 'notes' | 'ai' }
  | { type: 'SET_EDITOR_SELECTION'; payload: EditorSelection | null }
  | { type: 'ADD_OUTLINE_ITEM'; payload: { text: string; level: number } }
  | { type: 'DELETE_OUTLINE_ITEM'; payload: string }
  | { type: 'LINK_OUTLINE'; payload: { outlineId: string; chapterId: string } }
  | { type: 'ADD_TOAST'; payload: { message: string; type: 'success' | 'warn' | 'error' } }
  | { type: 'REMOVE_TOAST'; payload: number }
  | { type: 'SHOW_MODAL'; payload: ModalData }
  | { type: 'CLOSE_MODAL' };

export interface NovelState {
  volumes: Volume[];
  outline: OutlineItem[];
  activeChapterId: string | null;
  previewMode: 'preview' | 'reader';
  workspaceMode: 'read' | 'edit';
  contextTab: 'preview' | 'annotations' | 'history' | 'notes' | 'ai';
  editorSelection: EditorSelection | null;
  toasts: ToastItem[];
  modal: ModalData | null;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  relativePath?: string;
  contentLoaded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Volume {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface OutlineItem {
  id: string;
  text: string;
  level: number;
  parentId: string | null;
  linkedChapterId: string | null;
}

export interface EditorSelection {
  chapterId: string;
  chapterPath: string;
  from: number;
  to: number;
  selectedText: string;
}

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'warn' | 'error';
}

export interface ModalData {
  type: string;
  volId?: string;
  [key: string]: any;
}

function novelReducer(state: NovelState, action: NovelAction): NovelState {
  switch (action.type) {
    case 'SET_STATE': return { ...state, ...action.payload };
    case 'ADD_VOLUME':
      return { ...state, volumes: [...state.volumes, { id: generateId(), title: action.payload.title, chapters: [] }] };
    case 'DELETE_VOLUME': {
      const volToDelete = state.volumes.find(v => v.id === action.payload);
      const hasActive = volToDelete?.chapters.some(c => c.id === state.activeChapterId);
      return { ...state, volumes: state.volumes.filter(v => v.id !== action.payload), activeChapterId: hasActive ? null : state.activeChapterId };
    }
    case 'RENAME_VOLUME':
      return { ...state, volumes: state.volumes.map(v => v.id === action.payload.id ? { ...v, title: action.payload.title } : v) };
    case 'ADD_CHAPTER': {
      const chapter: Chapter = {
        id: generateId(),
        title: action.payload.title,
        content: action.payload.content || '',
        relativePath: action.payload.relativePath,
        contentLoaded: action.payload.content !== undefined || !action.payload.relativePath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ...state, volumes: state.volumes.map(v => v.id === action.payload.volId ? { ...v, chapters: [...v.chapters, chapter] } : v), activeChapterId: chapter.id };
    }
    case 'UPSERT_CHAPTER': {
      const now = new Date().toISOString();
      let existingId: string | null = null;
      const updatedVolumes = state.volumes.map(v => ({
        ...v,
        chapters: v.chapters.map(c => {
          if (c.relativePath === action.payload.relativePath) {
            existingId = c.id;
            return {
              ...c,
              title: action.payload.title,
              content: action.payload.content ?? c.content,
              relativePath: action.payload.relativePath,
              contentLoaded: action.payload.contentLoaded ?? (action.payload.content !== undefined ? true : c.contentLoaded),
              updatedAt: now,
            };
          }
          return c.contentLoaded ? { ...c, content: '', contentLoaded: false } : c;
        }),
      }));

      if (existingId) {
        return { ...state, volumes: updatedVolumes, activeChapterId: existingId };
      }

      const volumeTitle = action.payload.volumeTitle || '文稿';
      const chapter: Chapter = {
        id: generateId(),
        title: action.payload.title,
        content: action.payload.content ?? '',
        relativePath: action.payload.relativePath,
        contentLoaded: action.payload.contentLoaded ?? (action.payload.content !== undefined),
        createdAt: now,
        updatedAt: now,
      };
      const targetIndex = updatedVolumes.findIndex(v => v.title === volumeTitle);
      if (targetIndex >= 0) {
        return {
          ...state,
          volumes: updatedVolumes.map((v, index) => index === targetIndex ? { ...v, chapters: [...v.chapters, chapter] } : v),
          activeChapterId: chapter.id,
        };
      }
      return {
        ...state,
        volumes: [...updatedVolumes, { id: generateId(), title: volumeTitle, chapters: [chapter] }],
        activeChapterId: chapter.id,
      };
    }
    case 'DELETE_CHAPTER':
      return { ...state, volumes: state.volumes.map(v => ({ ...v, chapters: v.chapters.filter(c => c.id !== action.payload) })), activeChapterId: state.activeChapterId === action.payload ? null : state.activeChapterId };
    case 'SELECT_CHAPTER': return { ...state, activeChapterId: action.payload };
    case 'UPDATE_CHAPTER_TITLE':
      return { ...state, volumes: state.volumes.map(v => ({ ...v, chapters: v.chapters.map(c => c.id === action.payload.id ? { ...c, title: action.payload.title, updatedAt: new Date().toISOString() } : c) })) };
    case 'UPDATE_CHAPTER_CONTENT':
      return { ...state, volumes: state.volumes.map(v => ({ ...v, chapters: v.chapters.map(c => c.id === action.payload.id ? { ...c, content: action.payload.content, contentLoaded: true, updatedAt: new Date().toISOString() } : c) })) };
    case 'MOVE_CHAPTER':
      return { ...state, volumes: state.volumes.map(v => { const idx = v.chapters.findIndex(c => c.id === action.payload.chId); if (idx === -1) return v; const newIdx = action.payload.direction === 'up' ? idx - 1 : idx + 1; if (newIdx < 0 || newIdx >= v.chapters.length) return v; const chapters = [...v.chapters]; [chapters[idx], chapters[newIdx]] = [chapters[newIdx], chapters[idx]]; return { ...v, chapters }; }) };
    case 'MOVE_VOLUME': {
      const idx = state.volumes.findIndex(v => v.id === action.payload.volId); if (idx === -1) return state; const newIdx = action.payload.direction === 'up' ? idx - 1 : idx + 1; if (newIdx < 0 || newIdx >= state.volumes.length) return state; const volumes = [...state.volumes]; [volumes[idx], volumes[newIdx]] = [volumes[newIdx], volumes[idx]]; return { ...state, volumes };
    }
    case 'SET_PREVIEW_MODE': return { ...state, previewMode: action.payload };
    case 'SET_WORKSPACE_MODE': return { ...state, workspaceMode: action.payload };
    case 'SET_CONTEXT_TAB': return { ...state, contextTab: action.payload };
    case 'SET_EDITOR_SELECTION': return { ...state, editorSelection: action.payload };
    case 'ADD_OUTLINE_ITEM': return { ...state, outline: [...state.outline, { id: generateId(), text: action.payload.text, level: action.payload.level, parentId: null, linkedChapterId: null }] };
    case 'DELETE_OUTLINE_ITEM': return { ...state, outline: state.outline.filter(o => o.id !== action.payload) };
    case 'LINK_OUTLINE': return { ...state, outline: state.outline.map(o => o.id === action.payload.outlineId ? { ...o, linkedChapterId: action.payload.chapterId } : o) };
    case 'ADD_TOAST': return { ...state, toasts: [...state.toasts, { id: Date.now(), ...action.payload }] };
    case 'REMOVE_TOAST': return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SHOW_MODAL': return { ...state, modal: action.payload };
    case 'CLOSE_MODAL': return { ...state, modal: null };
    default: return state;
  }
}

interface NovelContextType {
  state: NovelState;
  dispatch: React.Dispatch<NovelAction>;
  importMD: (file: File) => void;
  importWord: (file: File) => void;
  exportMD: () => void;
  saveToFile: (rootPath: string, relativePath: string, content: string) => Promise<void>;
}

export const NovelContext = createContext<NovelContextType>(null!);

export function NovelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(novelReducer, undefined, loadState);
  const saving = useRef(false);

  useEffect(() => { persistState(state); }, [state.volumes, state.outline, state.activeChapterId, state.previewMode, state.workspaceMode, state.contextTab]);

  const importMD = useCallback(async (file: File) => {
    try {
      const volumes = await importMarkdownFile(file);
      dispatch({ type: 'SET_STATE', payload: { volumes: [...state.volumes, ...volumes], activeChapterId: volumes[0]?.chapters[0]?.id || null } });
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Markdown 导入成功', type: 'success' } });
    } catch { dispatch({ type: 'ADD_TOAST', payload: { message: '导入失败', type: 'error' } }); }
  }, [state.volumes]);

  const importWord = useCallback(async (file: File) => {
    try {
      const volumes = await importWordFile(file);
      dispatch({ type: 'SET_STATE', payload: { volumes: [...state.volumes, ...volumes], activeChapterId: volumes[0]?.chapters[0]?.id || null } });
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Word 导入成功', type: 'success' } });
    } catch { dispatch({ type: 'ADD_TOAST', payload: { message: 'Word 导入失败', type: 'error' } }); }
  }, [state.volumes]);

  const exportMD = useCallback(() => {
    const md = exportToMarkdown(state.volumes);
    if (md.trim()) {
      downloadFile(md, `${brand.exportPrefix}_${new Date().toISOString().slice(0, 10)}.md`);
      dispatch({ type: 'ADD_TOAST', payload: { message: '导出成功', type: 'success' } });
    } else { dispatch({ type: 'ADD_TOAST', payload: { message: '没有内容可导出', type: 'warn' } }); }
  }, [state.volumes]);

  const saveToFile = useCallback(async (rootPath: string, relativePath: string, content: string) => {
    if (saving.current) return;
    saving.current = true;
    try {
      await writeTextFile(`${rootPath}/${relativePath}`, content);
    } finally { saving.current = false; }
  }, []);

  return (
    <NovelContext.Provider value={{ state, dispatch, importMD, importWord, exportMD, saveToFile }}>
      {children}
    </NovelContext.Provider>
  );
}
