import { useState } from 'react';
import { useWritingTools } from '../../hooks/useWritingTools';
import { useProject } from '../../hooks/useProject';

const THREAD_TYPES = [
  { value: 'main', label: '主线' },
  { value: 'side', label: '支线' },
  { value: 'romance', label: '感情线' },
  { value: 'mystery', label: '悬疑线' },
];

export default function PlotPanel() {
  const { state: { activeNovelId } } = useProject();
  const { state, createPlotThread, updatePlotThread, deletePlotThread } = useWritingTools();
  const [newTitle, setNewTitle] = useState('');
  const [threadType, setThreadType] = useState('main');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!activeNovelId || !newTitle.trim()) return;
    createPlotThread(activeNovelId, newTitle.trim());
    setNewTitle('');
  };

  if (!activeNovelId) return <div className="panel"><div className="panel-header"><span>🧵 线索</span></div><div className="panel-empty">请先选择小说</div></div>;

  return (
    <div className="panel">
      <div className="panel-header">
        <span>🧵 情节线索</span>
        <span className="panel-count">{state.plotThreads.length}</span>
      </div>

      <div className="panel-list">
        {state.plotThreads.map(t => {
          const typeLabel = THREAD_TYPES.find(tt => tt.value === t.type)?.label || t.type;
          return (
            <div key={t.id} className="panel-item">
              <div className="panel-item-row" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <span className="panel-tag">{typeLabel}</span>
                <span className="panel-item-title">{t.title}</span>
                <span className="panel-item-actions">
                  <button onClick={e => { e.stopPropagation(); deletePlotThread(t.id); }}>✕</button>
                </span>
              </div>

              {expandedId === t.id && (
                <div className="panel-item-detail">
                  <label>类型：
                    <select value={t.type} onChange={e => updatePlotThread(t.id, { type: e.target.value })}>
                      {THREAD_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                    </select>
                  </label>
                  <label>描述：
                    <textarea defaultValue={t.description} rows={2}
                      onBlur={e => updatePlotThread(t.id, { description: e.target.value })} />
                  </label>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    关联章节：{state.plotLinks.filter(l => l.thread_id === t.id).length} 章
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel-footer">
        <select value={threadType} onChange={e => setThreadType(e.target.value)}>
          {THREAD_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
        </select>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="新线索..." />
        <button onClick={handleCreate}>＋</button>
      </div>
    </div>
  );
}
