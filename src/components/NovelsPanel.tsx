import { useEffect, useState } from 'react';
import { useProject } from '../hooks/useProject';
import { useResponsiveCtx } from '../contexts/ResponsiveContext';
import { isTauriEnv } from '../utils/db';

// 跨平台目录选择器
async function pickDirectory(title: string): Promise<string | null> {
  if (isTauriEnv()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      return await open({ directory: true, title }) || null;
    } catch { /* fall through */ }
  }
  // 浏览器回退: 使用 prompt（开发环境）
  const path = prompt(`请输入路径 (${title}):\n浏览器模式下使用模拟路径`);
  if (!path) return null;
  return path;
}

export default function NovelsPanel({ onSelectNovel }: { onSelectNovel?: () => void }) {
  const { state, dispatch, loadNovels, createNovel, importNovel, deleteNovel, setActiveNovel } = useProject();
  const { closeSidebar, isDesktop } = useResponsiveCtx();
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.activeSeriesId) loadNovels(state.activeSeriesId);
  }, [state.activeSeriesId]);

  const handleCreate = async () => {
    if (!state.activeSeriesId || !newTitle.trim() || busy) return;
    setBusy(true);
    try {
      const dir = await pickDirectory('选择小说存储位置');
      if (!dir) { setBusy(false); return; }
      const rootPath = `${dir}/${newTitle.trim()}`;
      const id = await createNovel(state.activeSeriesId, newTitle.trim(), 'volume', rootPath);
      setNewTitle('');
      await setActiveNovel(id);
      if (!isDesktop) closeSidebar();
      onSelectNovel?.();
    } finally { setBusy(false); }
  };

  const handleImport = async () => {
    if (!state.activeSeriesId || busy) return;
    setBusy(true);
    try {
      const dir = await pickDirectory('选择小说文件夹');
      if (!dir) return;
      const id = await importNovel(state.activeSeriesId, dir);
      await setActiveNovel(id);
      if (!isDesktop) closeSidebar();
      onSelectNovel?.();
    } finally { setBusy(false); }
  };

  const confirmDelete = (id: string, title: string) => {
    if (confirm(`确定移除「${title}」？仅删除记录，不删除文件。`)) {
      if (state.activeNovelId === id) setActiveNovel(null);
      deleteNovel(id);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>📖 小说</span>
        <span className="panel-count">{state.novels.length}</span>
      </div>
      <div className="panel-list">
        {state.novels.map(n => (
          <div key={n.id} className={`panel-item ${state.activeNovelId === n.id ? 'active' : ''}`}
            onClick={async () => {
              await setActiveNovel(n.id);
              if (!isDesktop) closeSidebar();
              onSelectNovel?.();
            }}>
            <span className="panel-item-title">{n.title}</span>
            <span className="panel-item-sub">{n.structure_mode === 'volume' ? '分卷' : '扁平'}</span>
            <span className="panel-item-actions">
              <button onClick={e => { e.stopPropagation(); confirmDelete(n.id, n.title); }}>✕</button>
            </span>
          </div>
        ))}
        {state.novels.length === 0 && state.activeSeriesId && (
          <div className="panel-empty">集合为空，新建或导入小说</div>
        )}
        {!state.activeSeriesId && (
          <div className="panel-empty">请先选择一个集合</div>
        )}
      </div>
      <div className="panel-footer">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="新建小说..." disabled={!state.activeSeriesId || busy} />
        <button onClick={handleCreate} disabled={!state.activeSeriesId || busy}>＋</button>
        <button onClick={handleImport} disabled={!state.activeSeriesId || busy} title="导入已有小说文件夹">📂</button>
      </div>
    </div>
  );
}
