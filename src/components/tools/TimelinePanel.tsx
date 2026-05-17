import { useState } from 'react';
import { useWritingTools } from '../../hooks/useWritingTools';
import { useProject } from '../../hooks/useProject';

export default function TimelinePanel() {
  const { state: { activeNovelId } } = useProject();
  const { state, createTimelineEvent, updateTimelineEvent, deleteTimelineEvent } = useWritingTools();
  const [newTitle, setNewTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!activeNovelId || !newTitle.trim()) return;
    createTimelineEvent(activeNovelId, newTitle.trim());
    setNewTitle('');
  };

  const sorted = [...state.timelineEvents].sort((a, b) => (a.time_value || 0) - (b.time_value || 0));

  if (!activeNovelId) return <div className="panel"><div className="panel-header"><span>⏳ 时间线</span></div><div className="panel-empty">请先选择小说</div></div>;

  return (
    <div className="panel">
      <div className="panel-header">
        <span>⏳ 时间线</span>
        <span className="panel-count">{state.timelineEvents.length}</span>
      </div>

      <div className="panel-list" style={{ position: 'relative' }}>
        {sorted.length === 0 && <div className="panel-empty">暂无事件，添加一条吧</div>}

        {sorted.map((ev, idx) => (
          <div key={ev.id} className="timeline-item">
            <div className="timeline-line">
              <div className="timeline-dot" />
              {idx < sorted.length - 1 && <div className="timeline-connector" />}
            </div>

            <div className="panel-item" style={{ flex: 1 }}>
              <div className="panel-item-row" onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}>
                <span className="timeline-era">{ev.era || '--'}</span>
                <span className="panel-item-title">{ev.title}</span>
                <span className="panel-item-actions">
                  <button onClick={e => { e.stopPropagation(); deleteTimelineEvent(ev.id); }}>✕</button>
                </span>
              </div>

              {expandedId === ev.id && (
                <div className="panel-item-detail">
                  <label>纪年：<input defaultValue={ev.era} onBlur={e => updateTimelineEvent(ev.id, { era: e.target.value })} /></label>
                  <label>时间值：<input type="number" defaultValue={ev.time_value ?? ''}
                    onBlur={e => updateTimelineEvent(ev.id, { time_value: e.target.value ? parseInt(e.target.value) : null })} /></label>
                  <label>描述：
                    <textarea defaultValue={ev.description} rows={3}
                      onBlur={e => updateTimelineEvent(ev.id, { description: e.target.value })} />
                  </label>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="panel-footer">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="新事件..." />
        <button onClick={handleCreate}>＋</button>
      </div>
    </div>
  );
}
