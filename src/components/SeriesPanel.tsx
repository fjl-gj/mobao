interface SidebarChildProps {
  onSelectNovel?: () => void;
}

import { useState, useEffect } from 'react';
import { useProject } from '../hooks/useProject';
import { useResponsiveCtx } from '../contexts/ResponsiveContext';
import { open } from '@tauri-apps/plugin-dialog';

export default function SeriesPanel({ onSelectNovel }: { onSelectNovel?: () => void }) {
  const { state, dispatch, loadSeries, createSeries, renameSeries, deleteSeries, setActiveSeries, loadNovels } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => { loadSeries(); }, []);

  const handleSelect = (id: string) => {
    setActiveSeries(id);
    loadNovels(id);
    dispatch({ type: 'SET_ACTIVE_SERIES', payload: id });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createSeries(name);
    setNewName('');
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    await renameSeries(id, name);
    setEditingId(null);
  };

  const confirmDelete = (id: string, name: string) => {
    if (confirm(`确定删除集合「${name}」？`)) {
      deleteSeries(id);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>📚 集合</span>
      </div>
      <div className="panel-list">
        {state.series.map(s => (
          <div key={s.id}
            className={`panel-item ${state.activeSeriesId === s.id ? 'active' : ''}`}
            onClick={() => handleSelect(s.id)}
          >
            {editingId === s.id ? (
              <input value={editName} onChange={e => setEditName(e.target.value)}
                onBlur={() => handleRename(s.id)}
                onKeyDown={e => e.key === 'Enter' && handleRename(s.id)}
                autoFocus onClick={e => e.stopPropagation()} />
            ) : (
              <>
                <span className="panel-item-title">{s.name}</span>
                <span className="panel-item-actions">
                  <button onClick={e => { e.stopPropagation(); setEditingId(s.id); setEditName(s.name); }}>✎</button>
                  <button onClick={e => { e.stopPropagation(); confirmDelete(s.id, s.name); }}>✕</button>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="panel-footer">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="新建集合..." />
        <button onClick={handleCreate}>＋</button>
      </div>
    </div>
  );
}
