import { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../hooks/useProject';
import { useNovel } from '../hooks/useNovel';
import { useWritingTools } from '../hooks/useWritingTools';

export default function Tree({ onSelect }: { onSelect?: () => void }) {
  const [query, setQuery] = useState('');
  const [collapsedVolumes, setCollapsedVolumes] = useState<Set<string>>(new Set());
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const { state: projectState } = useProject();
  const { state: novelState, dispatch } = useNovel();
  const { getChapterNote } = useWritingTools();
  const { novelStructure, activeNovelId } = projectState;
  const activeNovel = activeNovelId ? projectState.novels.find(n => n.id === activeNovelId) : null;

  const activeChapter = useMemo(() => {
    if (!novelState.activeChapterId) return null;
    for (const volume of novelState.volumes) {
      const chapter = volume.chapters.find(item => item.id === novelState.activeChapterId);
      if (chapter) return chapter;
    }
    return null;
  }, [novelState.activeChapterId, novelState.volumes]);

  const activePath = activeChapter?.relativePath || '';
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!activePath || normalizedQuery || !novelStructure) return;
    nodeRefs.current.get(activePath)?.scrollIntoView({ block: 'center' });
  }, [activePath, normalizedQuery, novelStructure]);

  if (!activeNovelId) {
    return <div className="empty-state"><span>📚</span><span>请先选择一部小说</span></div>;
  }
  if (!novelStructure) {
    return <div className="empty-state"><span>📖</span><span>正在加载...</span></div>;
  }

  const getTitle = (name: string) => name.replace(/\.(md|txt)$/i, '');
  const chapterTotal = novelStructure.volumes.reduce((sum, volume) => sum + volume.chapters.length, 0)
    + novelStructure.root_chapters.length
    + (novelStructure.prologue ? 1 : 0);
  const matches = (name: string, path: string, volumeTitle = '') => {
    if (!normalizedQuery) return true;
    return `${name} ${path} ${volumeTitle}`.toLowerCase().includes(normalizedQuery);
  };

  const visiblePrologue = novelStructure.prologue && matches(novelStructure.prologue.name, novelStructure.prologue.relative_path, '序章')
    ? novelStructure.prologue
    : null;
  const visibleVolumes = novelStructure.volumes
    .map(volume => ({
      ...volume,
      chapters: volume.chapters.filter(chapter => matches(chapter.name, chapter.relative_path, volume.name)),
    }))
    .filter(volume => !normalizedQuery || volume.name.toLowerCase().includes(normalizedQuery) || volume.chapters.length > 0);
  const visibleRootChapters = novelStructure.root_chapters.filter(chapter => matches(chapter.name, chapter.relative_path));
  const visibleCount = visibleVolumes.reduce((sum, volume) => sum + volume.chapters.length, 0)
    + visibleRootChapters.length
    + (visiblePrologue ? 1 : 0);

  const setNodeRef = (path: string) => (node: HTMLDivElement | null) => {
    if (node) nodeRefs.current.set(path, node);
    else nodeRefs.current.delete(path);
  };

  const toggleVolume = (volumeName: string) => {
    setCollapsedVolumes(prev => {
      const next = new Set(prev);
      next.has(volumeName) ? next.delete(volumeName) : next.add(volumeName);
      return next;
    });
  };

  const locateActive = () => {
    if (!activePath) return;
    setQuery('');
    window.requestAnimationFrame(() => {
      nodeRefs.current.get(activePath)?.scrollIntoView({ block: 'center' });
    });
  };

  const handleSelect = (path: string, name: string, volumeTitle?: string) => {
    if (path === activePath) {
      onSelect?.();
      return;
    }
    dispatch({
      type: 'UPSERT_CHAPTER',
      payload: {
        title: getTitle(name),
        relativePath: path,
        volumeTitle,
        contentLoaded: false,
      },
    });
    onSelect?.();
  };

  return (
    <div className="tree-scroll">
      {activeNovel && (
        <div className="tree-novel-meta">
          <div className="tree-novel-title">{activeNovel.title}</div>
          <div className="tree-novel-sub">
            <span>{activeNovel.structure_mode === 'volume' ? '有分卷' : '无分卷'}</span>
            <span>{chapterTotal}章</span>
          </div>
        </div>
      )}

      <div className="tree-tools">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="搜索章节 / 分卷"
          className="tree-search"
        />
        <button onClick={locateActive} disabled={!activePath} title="定位当前章节">⌖</button>
      </div>
      {normalizedQuery && <div className="tree-search-count">{visibleCount}/{chapterTotal}</div>}

      {visiblePrologue && (
        <div
          ref={setNodeRef(visiblePrologue.relative_path)}
          className={`tree-node prologue ${activePath === visiblePrologue.relative_path ? 'active' : ''}`}
          onClick={() => handleSelect(visiblePrologue.relative_path, visiblePrologue.name, '序章')}
        >
          <span className="tree-icon">📄</span>
          <span className="tree-title">{visiblePrologue.name}</span>
          {getChapterNote(visiblePrologue.relative_path) && <span className="tree-note-dot">●</span>}
        </div>
      )}

      {visibleVolumes.map((vol, vi) => (
        <div key={vol.name || vi} style={{ marginBottom: 2 }}>
          <div className="tree-volume" onClick={() => toggleVolume(vol.name)}>
            <span className="tree-arrow">{collapsedVolumes.has(vol.name) && !normalizedQuery ? '▸' : '▾'}</span>
            <span className="tree-icon">📁</span>
            <span className="tree-title">{vol.name}</span>
            <span className="tree-count">{vol.chapters.length}</span>
          </div>
          {(!collapsedVolumes.has(vol.name) || normalizedQuery) && vol.chapters.map((ch, ci) => (
            <div
              key={`${vol.name}_${ci}_${ch.relative_path}`}
              ref={setNodeRef(ch.relative_path)}
              className={`tree-node chapter ${activePath === ch.relative_path ? 'active' : ''}`}
              onClick={() => handleSelect(ch.relative_path, ch.name, vol.name)}
            >
              <span className="tree-icon">📝</span>
              <span className="tree-title">{getTitle(ch.name)}</span>
              {getChapterNote(ch.relative_path) && <span className="tree-note-dot">●</span>}
            </div>
          ))}
        </div>
      ))}

      {visibleRootChapters.map((ch, i) => (
        <div
          key={`r_${i}_${ch.relative_path}`}
          ref={setNodeRef(ch.relative_path)}
          className={`tree-node chapter ${activePath === ch.relative_path ? 'active' : ''}`}
          onClick={() => handleSelect(ch.relative_path, ch.name, '文稿')}
        >
          <span className="tree-icon">📝</span>
          <span className="tree-title">{getTitle(ch.name)}</span>
          {getChapterNote(ch.relative_path) && <span className="tree-note-dot">●</span>}
        </div>
      ))}

      {normalizedQuery && visibleCount === 0 && (
        <div className="tree-empty">没有找到章节</div>
      )}
    </div>
  );
}
