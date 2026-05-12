import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { generateId } from '../utils/helpers';
import { initDatabase, getAll, getById, insert, update, remove } from '../utils/db';
import { createVolume, scanNovelDirectory, writeTextFile } from '../utils/fileOps';
import type { NovelStructure } from '../utils/fileOps';

type StructureMode = 'flat' | 'volume';
type ChapterRange = { count: number };
type NovelSourceType = 'create' | 'import';

// ---------- 数据接口 ----------

export interface Series {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Novel {
  id: string;
  series_id: string;
  title: string;
  root_path: string;
  structure_mode: 'flat' | 'volume';
  prologue_path: string | null;
  chapter_start?: number | null;
  chapter_end?: number | null;
  chapter_count?: number | null;
  source_type?: NovelSourceType;
  structure_json?: string | null;
  cover_path: string | null;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---------- 状态 ----------

interface ProjectState {
  series: Series[];
  novels: Novel[];
  activeSeriesId: string | null;
  activeNovelId: string | null;
  novelStructure: NovelStructure | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  series: [],
  novels: [],
  activeSeriesId: null,
  activeNovelId: null,
  novelStructure: null,
  loading: false,
  error: null,
};

function normalizeNovelStructure(novel: Novel, structure: NovelStructure): NovelStructure {
  if (novel.structure_mode !== 'flat') return structure;
  const chapters = [
    ...structure.volumes.flatMap(volume => volume.chapters),
    ...structure.root_chapters,
  ];
  const count = novel.chapter_count || chapters.length || Math.max(1, (novel.chapter_end || 1) - (novel.chapter_start || 1) + 1);
  return {
    ...structure,
    mode: 'flat',
    volumes: chapters.length
      ? [{ name: `第一卷（${count}章）`, chapters }]
      : [],
    root_chapters: [],
  };
}

function getStoredStructure(novel: Novel): NovelStructure | null {
  if (!novel.structure_json) return null;
  try {
    const parsed = JSON.parse(novel.structure_json);
    if (parsed && Array.isArray(parsed.volumes) && Array.isArray(parsed.root_chapters)) {
      return normalizeNovelStructure(novel, parsed);
    }
  } catch {
    return null;
  }
  return null;
}

async function loadNovelStructure(novel: Novel): Promise<NovelStructure | null> {
  try {
    const structure = await scanNovelDirectory(novel.root_path);
    return normalizeNovelStructure(novel, structure);
  } catch {
    return getStoredStructure(novel);
  }
}

// ---------- Actions ----------

type ProjectAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SERIES'; payload: Series[] }
  | { type: 'ADD_SERIES'; payload: Series }
  | { type: 'UPDATE_SERIES'; payload: Series }
  | { type: 'REMOVE_SERIES'; payload: string }
  | { type: 'SET_NOVELS'; payload: Novel[] }
  | { type: 'MERGE_NOVELS'; payload: { seriesId: string; novels: Novel[] } }
  | { type: 'ADD_NOVEL'; payload: Novel }
  | { type: 'UPDATE_NOVEL'; payload: Novel }
  | { type: 'REMOVE_NOVEL'; payload: string }
  | { type: 'SET_ACTIVE_SERIES'; payload: string | null }
  | { type: 'SET_ACTIVE_NOVEL'; payload: string | null }
  | { type: 'SET_NOVEL_STRUCTURE'; payload: NovelStructure | null };

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_SERIES': return { ...state, series: action.payload };
    case 'ADD_SERIES': return { ...state, series: [...state.series, action.payload] };
    case 'UPDATE_SERIES': return {
      ...state,
      series: state.series.map(s => s.id === action.payload.id ? action.payload : s),
    };
    case 'REMOVE_SERIES': return {
      ...state,
      series: state.series.filter(s => s.id !== action.payload),
      activeSeriesId: state.activeSeriesId === action.payload ? null : state.activeSeriesId,
    };
    case 'SET_NOVELS': return { ...state, novels: action.payload };
    case 'MERGE_NOVELS': return {
      ...state,
      novels: [
        ...state.novels.filter(n => n.series_id !== action.payload.seriesId),
        ...action.payload.novels,
      ],
    };
    case 'ADD_NOVEL': return { ...state, novels: [...state.novels, action.payload] };
    case 'UPDATE_NOVEL': return {
      ...state,
      novels: state.novels.map(n => n.id === action.payload.id ? action.payload : n),
    };
    case 'REMOVE_NOVEL': return {
      ...state,
      novels: state.novels.filter(n => n.id !== action.payload),
      activeNovelId: state.activeNovelId === action.payload ? null : state.activeNovelId,
      novelStructure: state.activeNovelId === action.payload ? null : state.novelStructure,
    };
    case 'SET_ACTIVE_SERIES': return { ...state, activeSeriesId: action.payload };
    case 'SET_ACTIVE_NOVEL': return { ...state, activeNovelId: action.payload };
    case 'SET_NOVEL_STRUCTURE': return { ...state, novelStructure: action.payload };
    default: return state;
  }
}

// ---------- Context ----------

interface ProjectContextType {
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
  loadSeries: () => Promise<void>;
  createSeries: (name: string, description?: string) => Promise<void>;
  renameSeries: (id: string, name: string) => Promise<void>;
  deleteSeries: (id: string) => Promise<void>;
  loadNovels: (seriesId: string) => Promise<void>;
  createNovel: (seriesId: string, title: string, mode: StructureMode, rootPath: string, chapterRange?: ChapterRange) => Promise<string>;
  importNovel: (seriesId: string, rootPath: string, existingStructure?: {
    title?: string;
    mode: StructureMode;
    prologue_path: string | null;
    chapter_start?: number | null;
    chapter_end?: number | null;
    chapter_count?: number | null;
    structure_json?: string | null;
    source_type?: NovelSourceType;
  }) => Promise<string>;
  updateNovel: (id: string, data: Partial<Novel>) => Promise<void>;
  deleteNovel: (id: string) => Promise<void>;
  setActiveSeries: (id: string | null) => void;
  setActiveNovel: (id: string | null) => Promise<void>;
  refreshStructure: () => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextType>(null!);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  const dbReady = useRef(false);

  // 初始化数据库
  useEffect(() => {
    initDatabase().then(ok => {
      dbReady.current = ok;
      if (ok) {
        loadSeries();
      }
    });
  }, []);

  const loadSeries = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const seriesList = await getAll<Series>('series');
      dispatch({ type: 'SET_SERIES', payload: seriesList });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createSeries = useCallback(async (name: string, description = '') => {
    const now = new Date().toISOString();
    const series: Series = {
      id: generateId(),
      name,
      description,
      sort_order: state.series.length,
      created_at: now,
      updated_at: now,
    };
    await insert('series', series);
    dispatch({ type: 'ADD_SERIES', payload: series });
  }, [state.series.length]);

  const renameSeries = useCallback(async (id: string, name: string) => {
    await update('series', id, { name });
    const updated = await getById<Series>('series', id);
    if (updated) dispatch({ type: 'UPDATE_SERIES', payload: updated });
  }, []);

  const deleteSeries = useCallback(async (id: string) => {
    await remove('series', id);
    dispatch({ type: 'REMOVE_SERIES', payload: id });
  }, []);

  const loadNovels = useCallback(async (seriesId: string) => {
    const novels = await getAll<Novel>('novels', 'series_id = ?', [seriesId]);
    dispatch({ type: 'MERGE_NOVELS', payload: { seriesId, novels } });
  }, []);

  const createNovel = useCallback(async (seriesId: string, title: string, mode: StructureMode, rootPath: string, chapterRange?: ChapterRange): Promise<string> => {
    const id = generateId();
    const now = new Date().toISOString();
    const chapterCount = mode === 'flat' ? Math.max(1, Math.min(9999, Math.floor(chapterRange?.count || 1))) : null;
    if (mode === 'volume') {
      await createVolume(rootPath, '');
    } else if (chapterCount) {
      for (let i = 1; i <= chapterCount; i++) {
        const cn = String(i).padStart(3, '0');
        await writeTextFile(`${rootPath}/第${cn}章.md`, `# 第${cn}章\n\n`);
      }
    }
    const structureMeta = mode === 'flat' && chapterCount
      ? JSON.stringify({ mode, virtual_volume: `第一卷（${chapterCount}章）`, chapter_count: chapterCount })
      : null;
    const novel: Novel = {
      id,
      series_id: seriesId,
      title,
      root_path: rootPath,
      structure_mode: mode,
      prologue_path: null,
      chapter_start: null,
      chapter_end: null,
      chapter_count: chapterCount,
      source_type: 'create',
      structure_json: structureMeta,
      cover_path: null,
      description: '',
      sort_order: state.novels.length,
      created_at: now,
      updated_at: now,
    };
    await insert('novels', novel);
    dispatch({ type: 'ADD_NOVEL', payload: novel });
    return id;
  }, [state.novels.length]);

  const importNovel = useCallback(async (seriesId: string, rootPath: string, existingStructure?: {
    title?: string;
    mode: StructureMode;
    prologue_path: string | null;
    chapter_start?: number | null;
    chapter_end?: number | null;
    chapter_count?: number | null;
    structure_json?: string | null;
    source_type?: NovelSourceType;
  }): Promise<string> => {
    let mode: StructureMode = existingStructure?.mode || 'volume';
    let prologue: string | null = existingStructure?.prologue_path || null;
    let structureJson = existingStructure?.structure_json || null;
    if (!existingStructure) {
      try {
        const structure = await scanNovelDirectory(rootPath);
        mode = structure.mode;
        prologue = structure.prologue?.relative_path || null;
        structureJson = JSON.stringify(structure);
      } catch {
        console.warn('scanNovelDirectory 不可用，使用默认结构');
      }
    }
    const title = existingStructure?.title?.trim() || rootPath.split(/[/\\]/).pop() || '导入的小说';
    const id = generateId();
    const now = new Date().toISOString();
    const novel: Novel = {
      id, series_id: seriesId, title, root_path: rootPath,
      structure_mode: mode, prologue_path: prologue,
      chapter_start: existingStructure?.chapter_start ?? null,
      chapter_end: existingStructure?.chapter_end ?? null,
      chapter_count: existingStructure?.chapter_count ?? null,
      source_type: existingStructure?.source_type || 'import',
      structure_json: structureJson,
      cover_path: null, description: '',
      sort_order: state.novels.length, created_at: now, updated_at: now,
    };
    await insert('novels', novel);
    dispatch({ type: 'ADD_NOVEL', payload: novel });
    return id;
  }, [state.novels.length]);

  const updateNovel = useCallback(async (id: string, data: Partial<Novel>) => {
    await update('novels', id, data);
    const updated = await getById<Novel>('novels', id);
    if (updated) dispatch({ type: 'UPDATE_NOVEL', payload: updated });
    if (id === state.activeNovelId && data.root_path) {
      dispatch({ type: 'SET_NOVEL_STRUCTURE', payload: updated ? await loadNovelStructure(updated) : null });
    }
  }, [state.activeNovelId]);

  const deleteNovel = useCallback(async (id: string) => {
    await remove('novels', id);
    dispatch({ type: 'REMOVE_NOVEL', payload: id });
  }, []);

  const setActiveSeries = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SERIES', payload: id });
  }, []);

  const setActiveNovel = useCallback(async (id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_NOVEL', payload: id });
    if (id) {
      const novel = await getById<Novel>('novels', id);
      if (novel && novel.root_path) {
        dispatch({ type: 'SET_NOVEL_STRUCTURE', payload: await loadNovelStructure(novel) });
      }
    } else {
      dispatch({ type: 'SET_NOVEL_STRUCTURE', payload: null });
    }
  }, []);

  const refreshStructure = useCallback(async () => {
    if (!state.activeNovelId) return;
    const novel = await getById<Novel>('novels', state.activeNovelId);
    if (novel && novel.root_path) {
      dispatch({ type: 'SET_NOVEL_STRUCTURE', payload: await loadNovelStructure(novel) });
    }
  }, [state.activeNovelId]);

  return (
    <ProjectContext.Provider value={{
      state, dispatch,
      loadSeries, createSeries, renameSeries, deleteSeries,
      loadNovels, createNovel, importNovel, updateNovel, deleteNovel,
      setActiveSeries, setActiveNovel, refreshStructure,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}
