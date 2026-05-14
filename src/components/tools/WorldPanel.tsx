import { useState } from 'react';
import { useWritingTools } from '../../hooks/useWritingTools';
import { useProject } from '../../hooks/useProject';

const CATEGORIES = ['地理', '种族', '魔法', '科技', '组织', '历史', '文化', '其他'];

export default function WorldPanel() {
  const { state: { activeNovelId } } = useProject();
  const { state, createWorldEntry, updateWorldEntry, deleteWorldEntry } = useWritingTools();
  const [newName, setNewName] = useState('');
  const [category, setCategory] = useState('地理');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('全部');

  const handleCreate = () => {
    if (!activeNovelId || !newName.trim()) return;
    createWorldEntry(activeNovelId, category, newName.trim());
    setNewName('');
  };

  const filtered = filterCat === '全部'
    ? state.worldEntries
    : state.worldEntries.filter(e => e.category === filterCat);

  if (!activeNovelId) return <div className="panel"><div className="panel-header"><span>🌍 世界观</span></div><div className="panel-empty">请先选择小说</div></div>;

  return (
    <div className="panel">
      <div className="panel-header">
        <span>🌍 世界观</span>
        <span className="panel-count">{state.worldEntries.length}</span>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '4px 8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
        {['全部', ...CATEGORIES].map(c => (
          <button key={c} className={`tag-btn ${filterCat === c ? 'active' : ''}`}
            onClick={() => setFilterCat(c)}>{c}</button>
        ))}
      </div>

      <div className="panel-list">
        {filtered.map(e => (
          <div key={e.id} className="panel-item">
            <div className="panel-item-row" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
              <span className="panel-tag">{e.category}</span>
              <span className="panel-item-title">{e.name}</span>
              <span className="panel-item-actions">
                <button onClick={ev => { ev.stopPropagation(); deleteWorldEntry(e.id); }}>✕</button>
              </span>
            </div>

            {expandedId === e.id && (
              <div className="panel-item-detail">
                <label>分类：
                  <select value={e.category} onChange={ev => updateWorldEntry(e.id, { category: ev.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>内容：
                  <textarea defaultValue={e.content} rows={4}
                    onBlur={ev => updateWorldEntry(e.id, { content: ev.target.value })} />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-footer">
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="条目名称..." />
        <button onClick={handleCreate}>＋</button>
      </div>
    </div>
  );
}
