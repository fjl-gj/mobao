import { useState } from 'react';
import { useWritingTools } from '../hooks/useWritingTools';
import { useProject } from '../hooks/useProject';

export default function CharactersPanel() {
  const { state: { activeNovelId } } = useProject();
  const { state, createCharacter, updateCharacter, deleteCharacter, addRelation, removeRelation } = useWritingTools();
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editField, setEditField] = useState<{ id: string; field: string; value: string } | null>(null);

  const handleCreate = () => {
    if (!activeNovelId || !newName.trim()) return;
    createCharacter(activeNovelId, newName.trim());
    setNewName('');
  };

  if (!activeNovelId) return <div className="panel"><div className="panel-header"><span>👤 人物</span></div><div className="panel-empty">请先选择小说</div></div>;

  return (
    <div className="panel">
      <div className="panel-header">
        <span>👤 人物</span>
        <span className="panel-count">{state.characters.length}</span>
      </div>

      <div className="panel-list">
        {state.characters.map(c => (
          <div key={c.id} className="panel-item">
            <div className="panel-item-row" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
              <span className="panel-item-title">{c.name || '未命名'}</span>
              <span className="panel-item-actions">
                <button onClick={e => { e.stopPropagation(); deleteCharacter(c.id); }}>✕</button>
              </span>
            </div>

            {expandedId === c.id && (
              <div className="panel-item-detail">
                <label>别名：<input defaultValue={c.alias} onBlur={e => updateCharacter(c.id, { alias: e.target.value })} /></label>
                <label>年龄：<input defaultValue={c.age} onBlur={e => updateCharacter(c.id, { age: e.target.value })} /></label>
                <label>性别：<input defaultValue={c.gender} onBlur={e => updateCharacter(c.id, { gender: e.target.value })} /></label>
                <label>身份：<input defaultValue={c.occupation} onBlur={e => updateCharacter(c.id, { occupation: e.target.value })} /></label>
                <label>外貌：
                  <textarea defaultValue={c.appearance} rows={2}
                    onBlur={e => updateCharacter(c.id, { appearance: e.target.value })} />
                </label>
                <label>性格：
                  <textarea defaultValue={c.personality} rows={2}
                    onBlur={e => updateCharacter(c.id, { personality: e.target.value })} />
                </label>
                <label>背景：
                  <textarea defaultValue={c.background} rows={3}
                    onBlur={e => updateCharacter(c.id, { background: e.target.value })} />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-footer">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="新建人物..." />
        <button onClick={handleCreate}>＋</button>
      </div>
    </div>
  );
}
