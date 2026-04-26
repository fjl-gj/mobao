import { useProject } from '../hooks/useProject';
import { useNovel } from '../hooks/useNovel';
import { useWritingTools } from '../hooks/useWritingTools';
import { readTextFile } from '../utils/fileOps';

export default function Tree({ onSelect }: { onSelect?: () => void }) {
  const { state: projectState } = useProject();
  const { state: novelState, dispatch } = useNovel();
  const { getChapterNote } = useWritingTools();
  const { novelStructure, activeNovelId } = projectState;

  if (!activeNovelId) {
    return <div className="empty-state"><span>📚</span><span>请先选择一部小说</span></div>;
  }
  if (!novelStructure) {
    return <div className="empty-state"><span>📖</span><span>正在加载...</span></div>;
  }

  const getTitle = (name: string) => name.replace(/\.(md|txt)$/, '');

  const handleSelect = async (path: string, name: string, volumeTitle?: string) => {
    if (!activeNovelId) return;
    const novel = projectState.novels.find(n => n.id === activeNovelId);
    if (!novel) return;
    try {
      const content = await readTextFile(novel.root_path, path);
      dispatch({
        type: 'UPSERT_CHAPTER',
        payload: {
          title: getTitle(name),
          content,
          relativePath: path,
          volumeTitle,
        },
      });
      onSelect?.();
    } catch {
      dispatch({ type: 'ADD_TOAST', payload: { message: `读取失败: ${path}`, type: 'error' } });
    }
  };

  return (
    <div className="tree-scroll">
      {novelStructure.prologue && (
        <div className="tree-node prologue" onClick={() => handleSelect(novelStructure.prologue!.relative_path, novelStructure.prologue!.name, '序章')}>
          <span className="tree-icon">📄</span>
          <span className="tree-title">{novelStructure.prologue.name}</span>
          {getChapterNote(novelStructure.prologue.relative_path) && <span className="tree-note-dot">●</span>}
        </div>
      )}
      {novelStructure.volumes.map((vol, vi) => (
        <div key={vi} style={{ marginBottom: 2 }}>
          <div className="tree-volume">
            <span className="tree-icon">📁</span>
            <span className="tree-title">{vol.name}</span>
            <span className="tree-count">{vol.chapters.length}</span>
          </div>
          {vol.chapters.map((ch, ci) => (
            <div key={`${vi}_${ci}`} className="tree-node chapter" onClick={() => handleSelect(ch.relative_path, ch.name, vol.name)}>
              <span className="tree-icon">📝</span>
              <span className="tree-title">{ch.name.replace(/\.(md|txt)$/, '')}</span>
              {getChapterNote(ch.relative_path) && <span className="tree-note-dot">●</span>}
            </div>
          ))}
        </div>
      ))}
      {novelStructure.root_chapters.map((ch, i) => (
        <div key={`r_${i}`} className="tree-node chapter" onClick={() => handleSelect(ch.relative_path, ch.name, '文稿')}>
          <span className="tree-icon">📝</span>
          <span className="tree-title">{ch.name.replace(/\.(md|txt)$/, '')}</span>
          {getChapterNote(ch.relative_path) && <span className="tree-note-dot">●</span>}
        </div>
      ))}
    </div>
  );
}
