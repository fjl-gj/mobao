import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { generateId } from '../utils/helpers';
import { getAll, getById, insert, update, remove, removeWhere } from '../utils/db';
import { useProject } from '../hooks/useProject';

// ---------- 数据接口 ----------

export interface Character {
  id: string;
  novel_id: string;
  name: string;
  alias: string;
  age: string;
  gender: string;
  occupation: string;
  appearance: string;
  personality: string;
  background: string;
  avatar_path: string;
  tags: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CharacterRelation {
  id: string;
  novel_id: string;
  char_a_id: string;
  char_b_id: string;
  relation: string;
  description: string;
}

export interface WorldEntry {
  id: string;
  novel_id: string;
  category: string;
  name: string;
  content: string;
  tags: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  novel_id: string;
  timeline_id: string;
  title: string;
  era: string;
  time_value: number | null;
  description: string;
  chapter_rel_path: string;
  character_ids: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlotThread {
  id: string;
  novel_id: string;
  title: string;
  type: string;
  description: string;
  start_chapter: string;
  end_chapter: string;
  created_at: string;
  updated_at: string;
}

export interface PlotChapterLink {
  id: string;
  thread_id: string;
  chapter_rel_path: string;
}

export interface ChapterNote {
  id: string;
  novel_id: string;
  chapter_rel_path: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ChapterAnnotation {
  id: string;
  novel_id: string;
  chapter_rel_path: string;
  selected_text: string;
  anchor_start: number | null;
  anchor_end: number | null;
  annotation_type: string;
  color: string;
  content: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface WritingNote {
  id: string;
  novel_id: string;
  scope_type: 'chapter' | 'novel' | 'character' | 'world' | 'plot';
  scope_id: string;
  selected_text: string;
  anchor_start: number | null;
  anchor_end: number | null;
  title: string;
  content: string;
  tags: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface ChapterHistory {
  id: string;
  novel_id: string;
  chapter_rel_path: string;
  title: string;
  content_snapshot: string;
  change_reason: string;
  word_count: number;
  metadata: string;
  created_at: string;
}

// ---------- 状态 ----------

interface WritingToolsState {
  characters: Character[];
  relations: CharacterRelation[];
  worldEntries: WorldEntry[];
  timelineEvents: TimelineEvent[];
  plotThreads: PlotThread[];
  plotLinks: PlotChapterLink[];
  chapterNotes: Record<string, string>;
  annotations: ChapterAnnotation[];
  writingNotes: WritingNote[];
  chapterHistory: ChapterHistory[];
  loading: boolean;
  error: string | null;
}

const initialState: WritingToolsState = {
  characters: [],
  relations: [],
  worldEntries: [],
  timelineEvents: [],
  plotThreads: [],
  plotLinks: [],
  chapterNotes: {},
  annotations: [],
  writingNotes: [],
  chapterHistory: [],
  loading: false,
  error: null,
};

// ---------- Actions ----------

type WritingToolsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHARACTERS'; payload: Character[] }
  | { type: 'ADD_CHARACTER'; payload: Character }
  | { type: 'UPDATE_CHARACTER'; payload: Character }
  | { type: 'REMOVE_CHARACTER'; payload: string }
  | { type: 'SET_RELATIONS'; payload: CharacterRelation[] }
  | { type: 'ADD_RELATION'; payload: CharacterRelation }
  | { type: 'REMOVE_RELATION'; payload: string }
  | { type: 'SET_WORLD_ENTRIES'; payload: WorldEntry[] }
  | { type: 'ADD_WORLD_ENTRY'; payload: WorldEntry }
  | { type: 'UPDATE_WORLD_ENTRY'; payload: WorldEntry }
  | { type: 'REMOVE_WORLD_ENTRY'; payload: string }
  | { type: 'SET_TIMELINE_EVENTS'; payload: TimelineEvent[] }
  | { type: 'ADD_TIMELINE_EVENT'; payload: TimelineEvent }
  | { type: 'UPDATE_TIMELINE_EVENT'; payload: TimelineEvent }
  | { type: 'REMOVE_TIMELINE_EVENT'; payload: string }
  | { type: 'SET_PLOT_THREADS'; payload: PlotThread[] }
  | { type: 'ADD_PLOT_THREAD'; payload: PlotThread }
  | { type: 'UPDATE_PLOT_THREAD'; payload: PlotThread }
  | { type: 'REMOVE_PLOT_THREAD'; payload: string }
  | { type: 'SET_PLOT_LINKS'; payload: PlotChapterLink[] }
  | { type: 'ADD_PLOT_LINK'; payload: PlotChapterLink }
  | { type: 'REMOVE_PLOT_LINKS'; payload: string }
  | { type: 'SET_CHAPTER_NOTES'; payload: Record<string, string> }
  | { type: 'SET_CHAPTER_NOTE'; payload: { path: string; note: string } }
  | { type: 'SET_ANNOTATIONS'; payload: ChapterAnnotation[] }
  | { type: 'ADD_ANNOTATION'; payload: ChapterAnnotation }
  | { type: 'REMOVE_ANNOTATION'; payload: string }
  | { type: 'SET_WRITING_NOTES'; payload: WritingNote[] }
  | { type: 'ADD_WRITING_NOTE'; payload: WritingNote }
  | { type: 'REMOVE_WRITING_NOTE'; payload: string }
  | { type: 'SET_CHAPTER_HISTORY'; payload: ChapterHistory[] }
  | { type: 'ADD_CHAPTER_HISTORY'; payload: ChapterHistory }
  | { type: 'CLEAR_ALL' };

function toolsReducer(state: WritingToolsState, action: WritingToolsAction): WritingToolsState {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_CHARACTERS': return { ...state, characters: action.payload };
    case 'ADD_CHARACTER': return { ...state, characters: [...state.characters, action.payload] };
    case 'UPDATE_CHARACTER': return {
      ...state,
      characters: state.characters.map(c => c.id === action.payload.id ? action.payload : c),
    };
    case 'REMOVE_CHARACTER': return {
      ...state,
      characters: state.characters.filter(c => c.id !== action.payload),
      relations: state.relations.filter(r => r.char_a_id !== action.payload && r.char_b_id !== action.payload),
    };
    case 'SET_RELATIONS': return { ...state, relations: action.payload };
    case 'ADD_RELATION': return { ...state, relations: [...state.relations, action.payload] };
    case 'REMOVE_RELATION': return { ...state, relations: state.relations.filter(r => r.id !== action.payload) };
    case 'SET_WORLD_ENTRIES': return { ...state, worldEntries: action.payload };
    case 'ADD_WORLD_ENTRY': return { ...state, worldEntries: [...state.worldEntries, action.payload] };
    case 'UPDATE_WORLD_ENTRY': return {
      ...state,
      worldEntries: state.worldEntries.map(w => w.id === action.payload.id ? action.payload : w),
    };
    case 'REMOVE_WORLD_ENTRY': return { ...state, worldEntries: state.worldEntries.filter(w => w.id !== action.payload) };
    case 'SET_TIMELINE_EVENTS': return { ...state, timelineEvents: action.payload };
    case 'ADD_TIMELINE_EVENT': return { ...state, timelineEvents: [...state.timelineEvents, action.payload] };
    case 'UPDATE_TIMELINE_EVENT': return {
      ...state,
      timelineEvents: state.timelineEvents.map(t => t.id === action.payload.id ? action.payload : t),
    };
    case 'REMOVE_TIMELINE_EVENT': return { ...state, timelineEvents: state.timelineEvents.filter(t => t.id !== action.payload) };
    case 'SET_PLOT_THREADS': return { ...state, plotThreads: action.payload };
    case 'ADD_PLOT_THREAD': return { ...state, plotThreads: [...state.plotThreads, action.payload] };
    case 'UPDATE_PLOT_THREAD': return {
      ...state,
      plotThreads: state.plotThreads.map(p => p.id === action.payload.id ? action.payload : p),
    };
    case 'REMOVE_PLOT_THREAD': return {
      ...state,
      plotThreads: state.plotThreads.filter(p => p.id !== action.payload),
      plotLinks: state.plotLinks.filter(l => l.thread_id !== action.payload),
    };
    case 'SET_PLOT_LINKS': return { ...state, plotLinks: action.payload };
    case 'ADD_PLOT_LINK': return { ...state, plotLinks: [...state.plotLinks, action.payload] };
    case 'REMOVE_PLOT_LINKS': return {
      ...state,
      plotLinks: state.plotLinks.filter(l => l.thread_id !== action.payload),
    };
    case 'SET_CHAPTER_NOTES': return { ...state, chapterNotes: action.payload };
    case 'SET_CHAPTER_NOTE': return {
      ...state,
      chapterNotes: { ...state.chapterNotes, [action.payload.path]: action.payload.note },
    };
    case 'SET_ANNOTATIONS': return { ...state, annotations: action.payload };
    case 'ADD_ANNOTATION': return { ...state, annotations: [action.payload, ...state.annotations] };
    case 'REMOVE_ANNOTATION': return { ...state, annotations: state.annotations.filter(item => item.id !== action.payload) };
    case 'SET_WRITING_NOTES': return { ...state, writingNotes: action.payload };
    case 'ADD_WRITING_NOTE': return { ...state, writingNotes: [action.payload, ...state.writingNotes] };
    case 'REMOVE_WRITING_NOTE': return { ...state, writingNotes: state.writingNotes.filter(item => item.id !== action.payload) };
    case 'SET_CHAPTER_HISTORY': return { ...state, chapterHistory: action.payload };
    case 'ADD_CHAPTER_HISTORY': return { ...state, chapterHistory: [action.payload, ...state.chapterHistory].slice(0, 10) };
    case 'CLEAR_ALL': return initialState;
    default: return state;
  }
}

// ---------- Context ----------

interface WritingToolsContextType {
  state: WritingToolsState;
  dispatch: React.Dispatch<WritingToolsAction>;
  loadAll: (novelId: string) => Promise<void>;
  clearAll: () => void;
  createCharacter: (novelId: string, name: string) => Promise<void>;
  updateCharacter: (id: string, data: Partial<Character>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  addRelation: (novelId: string, charAId: string, charBId: string, relation: string) => Promise<void>;
  removeRelation: (id: string) => Promise<void>;
  createWorldEntry: (novelId: string, category: string, name: string) => Promise<void>;
  updateWorldEntry: (id: string, data: Partial<WorldEntry>) => Promise<void>;
  deleteWorldEntry: (id: string) => Promise<void>;
  createTimelineEvent: (novelId: string, title: string) => Promise<void>;
  updateTimelineEvent: (id: string, data: Partial<TimelineEvent>) => Promise<void>;
  deleteTimelineEvent: (id: string) => Promise<void>;
  createPlotThread: (novelId: string, title: string) => Promise<void>;
  updatePlotThread: (id: string, data: Partial<PlotThread>) => Promise<void>;
  deletePlotThread: (id: string) => Promise<void>;
  addPlotLink: (threadId: string, chapterPath: string) => Promise<void>;
  removePlotLinks: (threadId: string) => Promise<void>;
  setChapterNote: (novelId: string, chapterPath: string, note: string) => Promise<void>;
  getChapterNote: (chapterPath: string) => string;
  createAnnotation: (novelId: string, chapterPath: string, content: string, selectedText?: string, anchorStart?: number | null, anchorEnd?: number | null) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  createWritingNote: (novelId: string, chapterPath: string, content: string, title?: string, selectedText?: string, anchorStart?: number | null, anchorEnd?: number | null) => Promise<void>;
  deleteWritingNote: (id: string) => Promise<void>;
  recordChapterHistory: (novelId: string, chapterPath: string, title: string, content: string, reason: string) => Promise<void>;
  loadChapterHistory: (novelId: string, chapterPath: string) => Promise<void>;
}

export const WritingToolsContext = createContext<WritingToolsContextType>(null!);

export function WritingToolsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(toolsReducer, initialState);
  const { state: { activeNovelId } } = useProject();

  const loadAll = useCallback(async (novelId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [characters, relations, worldEntries, timelineEvents, plotThreads, plotLinks, annotations, writingNotes] = await Promise.all([
        getAll<Character>('characters', 'novel_id = ?', [novelId]),
        getAll<CharacterRelation>('character_relations', 'novel_id = ?', [novelId]),
        getAll<WorldEntry>('world_entries', 'novel_id = ?', [novelId]),
        getAll<TimelineEvent>('timeline_events', 'novel_id = ?', [novelId]),
        getAll<PlotThread>('plot_threads', 'novel_id = ?', [novelId]),
        getAll<PlotChapterLink>('plot_chapter_links'),
        getAll<ChapterAnnotation>('chapter_annotations', 'novel_id = ?', [novelId]),
        getAll<WritingNote>('writing_notes', 'novel_id = ?', [novelId]),
      ]);
      const plotThreadIds = new Set(plotThreads.map(thread => thread.id));
      const scopedPlotLinks = plotLinks.filter(link => plotThreadIds.has(link.thread_id));

      dispatch({ type: 'SET_CHARACTERS', payload: characters });
      dispatch({ type: 'SET_RELATIONS', payload: relations });
      dispatch({ type: 'SET_WORLD_ENTRIES', payload: worldEntries });
      dispatch({ type: 'SET_TIMELINE_EVENTS', payload: timelineEvents });
      dispatch({ type: 'SET_PLOT_THREADS', payload: plotThreads });
      dispatch({ type: 'SET_PLOT_LINKS', payload: scopedPlotLinks });
      dispatch({ type: 'SET_ANNOTATIONS', payload: annotations });
      dispatch({ type: 'SET_WRITING_NOTES', payload: writingNotes });
      dispatch({ type: 'SET_CHAPTER_HISTORY', payload: [] });

      const notes = await getAll<ChapterNote>('chapter_notes', 'novel_id = ?', [novelId]);
      const notesMap: Record<string, string> = {};
      notes.forEach(n => { notesMap[n.chapter_rel_path] = n.note; });
      dispatch({ type: 'SET_CHAPTER_NOTES', payload: notesMap });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const clearAll = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), []);

  // Characters
  const createCharacter = useCallback(async (novelId: string, name: string) => {
    const now = new Date().toISOString();
    const char: Character = {
      id: generateId(), novel_id: novelId, name, alias: '', age: '', gender: '',
      occupation: '', appearance: '', personality: '', background: '', avatar_path: '',
      tags: '', sort_order: state.characters.length, created_at: now, updated_at: now,
    };
    await insert('characters', char);
    dispatch({ type: 'ADD_CHARACTER', payload: char });
  }, [state.characters.length]);

  const updateCharacter = useCallback(async (id: string, data: Partial<Character>) => {
    await update('characters', id, data);
    const updated = await getById<Character>('characters', id);
    if (updated) dispatch({ type: 'UPDATE_CHARACTER', payload: updated });
  }, []);

  const deleteCharacter = useCallback(async (id: string) => {
    await remove('characters', id);
    dispatch({ type: 'REMOVE_CHARACTER', payload: id });
  }, []);

  const addRelation = useCallback(async (novelId: string, charAId: string, charBId: string, relation: string) => {
    const rel: CharacterRelation = {
      id: generateId(), novel_id: novelId, char_a_id: charAId, char_b_id: charBId,
      relation, description: '',
    };
    await insert('character_relations', rel);
    dispatch({ type: 'ADD_RELATION', payload: rel });
  }, []);

  const removeRelation = useCallback(async (id: string) => {
    await remove('character_relations', id);
    dispatch({ type: 'REMOVE_RELATION', payload: id });
  }, []);

  // World entries
  const createWorldEntry = useCallback(async (novelId: string, category: string, name: string) => {
    const now = new Date().toISOString();
    const entry: WorldEntry = {
      id: generateId(), novel_id: novelId, category, name,
      content: '', tags: '', sort_order: state.worldEntries.length,
      created_at: now, updated_at: now,
    };
    await insert('world_entries', entry);
    dispatch({ type: 'ADD_WORLD_ENTRY', payload: entry });
  }, [state.worldEntries.length]);

  const updateWorldEntry = useCallback(async (id: string, data: Partial<WorldEntry>) => {
    await update('world_entries', id, data);
    const updated = await getById<WorldEntry>('world_entries', id);
    if (updated) dispatch({ type: 'UPDATE_WORLD_ENTRY', payload: updated });
  }, []);

  const deleteWorldEntry = useCallback(async (id: string) => {
    await remove('world_entries', id);
    dispatch({ type: 'REMOVE_WORLD_ENTRY', payload: id });
  }, []);

  // Timeline
  const createTimelineEvent = useCallback(async (novelId: string, title: string) => {
    const now = new Date().toISOString();
    const event: TimelineEvent = {
      id: generateId(), novel_id: novelId, timeline_id: 'main', title,
      era: '', time_value: null, description: '', chapter_rel_path: '',
      character_ids: '', sort_order: state.timelineEvents.length,
      created_at: now, updated_at: now,
    };
    await insert('timeline_events', event);
    dispatch({ type: 'ADD_TIMELINE_EVENT', payload: event });
  }, [state.timelineEvents.length]);

  const updateTimelineEvent = useCallback(async (id: string, data: Partial<TimelineEvent>) => {
    await update('timeline_events', id, data);
    const updated = await getById<TimelineEvent>('timeline_events', id);
    if (updated) dispatch({ type: 'UPDATE_TIMELINE_EVENT', payload: updated });
  }, []);

  const deleteTimelineEvent = useCallback(async (id: string) => {
    await remove('timeline_events', id);
    dispatch({ type: 'REMOVE_TIMELINE_EVENT', payload: id });
  }, []);

  // Plot threads
  const createPlotThread = useCallback(async (novelId: string, title: string) => {
    const now = new Date().toISOString();
    const thread: PlotThread = {
      id: generateId(), novel_id: novelId, title,
      type: 'main', description: '', start_chapter: '', end_chapter: '',
      created_at: now, updated_at: now,
    };
    await insert('plot_threads', thread);
    dispatch({ type: 'ADD_PLOT_THREAD', payload: thread });
  }, []);

  const updatePlotThread = useCallback(async (id: string, data: Partial<PlotThread>) => {
    await update('plot_threads', id, data);
    const updated = await getById<PlotThread>('plot_threads', id);
    if (updated) dispatch({ type: 'UPDATE_PLOT_THREAD', payload: updated });
  }, []);

  const deletePlotThread = useCallback(async (id: string) => {
    await remove('plot_threads', id);
    dispatch({ type: 'REMOVE_PLOT_THREAD', payload: id });
  }, []);

  const addPlotLink = useCallback(async (threadId: string, chapterPath: string) => {
    const link: PlotChapterLink = { id: generateId(), thread_id: threadId, chapter_rel_path: chapterPath };
    await insert('plot_chapter_links', link);
    dispatch({ type: 'ADD_PLOT_LINK', payload: link });
  }, []);

  const removePlotLinks = useCallback(async (threadId: string) => {
    await removeWhere('plot_chapter_links', 'thread_id = ?', [threadId]);
    dispatch({ type: 'REMOVE_PLOT_LINKS', payload: threadId });
  }, []);

  // Chapter notes
  const setChapterNote = useCallback(async (novelId: string, chapterPath: string, note: string) => {
    if (!chapterPath) return;
    const notes = await getAll<ChapterNote>('chapter_notes', 'novel_id = ?', [novelId]);
    const existing = notes.filter(item => item.chapter_rel_path === chapterPath);
    if (existing.length > 0) {
      await update('chapter_notes', existing[0].id, { note });
    } else {
      await insert('chapter_notes', {
        id: generateId(), novel_id: novelId, chapter_rel_path: chapterPath, note,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
    }
    dispatch({ type: 'SET_CHAPTER_NOTE', payload: { path: chapterPath, note } });
  }, []);

  const getChapterNote = useCallback((chapterPath: string): string => {
    return state.chapterNotes[chapterPath] || '';
  }, [state.chapterNotes]);

  const createAnnotation = useCallback(async (novelId: string, chapterPath: string, content: string, selectedText = '', anchorStart: number | null = null, anchorEnd: number | null = null) => {
    if (!chapterPath || !content.trim()) return;
    const now = new Date().toISOString();
    const annotation: ChapterAnnotation = {
      id: generateId(),
      novel_id: novelId,
      chapter_rel_path: chapterPath,
      selected_text: selectedText,
      anchor_start: anchorStart,
      anchor_end: anchorEnd,
      annotation_type: 'note',
      color: 'yellow',
      content: content.trim(),
      metadata: '',
      created_at: now,
      updated_at: now,
    };
    await insert('chapter_annotations', annotation);
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
  }, []);

  const deleteAnnotation = useCallback(async (id: string) => {
    await remove('chapter_annotations', id);
    dispatch({ type: 'REMOVE_ANNOTATION', payload: id });
  }, []);

  const createWritingNote = useCallback(async (novelId: string, chapterPath: string, content: string, title = '', selectedText = '', anchorStart: number | null = null, anchorEnd: number | null = null) => {
    if (!chapterPath || !content.trim()) return;
    const now = new Date().toISOString();
    const note: WritingNote = {
      id: generateId(),
      novel_id: novelId,
      scope_type: 'chapter',
      scope_id: chapterPath,
      selected_text: selectedText,
      anchor_start: anchorStart,
      anchor_end: anchorEnd,
      title: title.trim(),
      content: content.trim(),
      tags: '',
      metadata: '',
      created_at: now,
      updated_at: now,
    };
    await insert('writing_notes', note);
    dispatch({ type: 'ADD_WRITING_NOTE', payload: note });
  }, []);

  const deleteWritingNote = useCallback(async (id: string) => {
    await remove('writing_notes', id);
    dispatch({ type: 'REMOVE_WRITING_NOTE', payload: id });
  }, []);

  const loadChapterHistory = useCallback(async (novelId: string, chapterPath: string) => {
    if (!chapterPath) return;
    const rows = await getAll<ChapterHistory>('chapter_history', 'novel_id = ?', [novelId]);
    dispatch({
      type: 'SET_CHAPTER_HISTORY',
      payload: rows.filter(item => item.chapter_rel_path === chapterPath).slice(0, 10),
    });
  }, []);

  const recordChapterHistory = useCallback(async (novelId: string, chapterPath: string, title: string, content: string, reason: string) => {
    if (!chapterPath || !content.trim()) return;
    const rows = await getAll<ChapterHistory>('chapter_history', 'novel_id = ?', [novelId]);
    const existing = rows.filter(item => item.chapter_rel_path === chapterPath);
    const latest = existing[0];
    if (latest?.content_snapshot === content) return;
    if (reason === 'auto_save' && latest && Math.abs(content.length - latest.content_snapshot.length) < 20) return;

    const history: ChapterHistory = {
      id: generateId(),
      novel_id: novelId,
      chapter_rel_path: chapterPath,
      title,
      content_snapshot: content,
      change_reason: reason,
      word_count: content.replace(/\s/g, '').length,
      metadata: '',
      created_at: new Date().toISOString(),
    };
    await insert('chapter_history', history);

    const nextRows = await getAll<ChapterHistory>('chapter_history', 'novel_id = ?', [novelId]);
    const scoped = nextRows.filter(item => item.chapter_rel_path === chapterPath);
    await Promise.all(scoped.slice(10).map(item => remove('chapter_history', item.id)));
    dispatch({ type: 'SET_CHAPTER_HISTORY', payload: [history, ...scoped.filter(item => item.id !== history.id)].slice(0, 10) });
  }, []);

  return (
    <WritingToolsContext.Provider value={{
      state, dispatch, loadAll, clearAll,
      createCharacter, updateCharacter, deleteCharacter,
      addRelation, removeRelation,
      createWorldEntry, updateWorldEntry, deleteWorldEntry,
      createTimelineEvent, updateTimelineEvent, deleteTimelineEvent,
      createPlotThread, updatePlotThread, deletePlotThread,
      addPlotLink, removePlotLinks,
      setChapterNote, getChapterNote,
      createAnnotation, deleteAnnotation,
      createWritingNote, deleteWritingNote,
      recordChapterHistory, loadChapterHistory,
    }}>
      {children}
    </WritingToolsContext.Provider>
  );
}
