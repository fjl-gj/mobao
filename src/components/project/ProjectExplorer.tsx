import { useState, useEffect } from 'react';
import { useProject } from '../../hooks/useProject';
import ContextMenu from '../common/ContextMenu';
import ConfirmDialog from '../common/ConfirmDialog';
import NovelDialog from './NovelDialog';
import { brand } from '../../config/brand';

type CtxTarget = { type: 'series'; id: string; name: string } | { type: 'novel'; id: string; title: string; seriesId: string } | null;

export default function ProjectExplorer({ onSelectNovel }: { onSelectNovel?: () => void }) {
  const { state, loadSeries, loadNovels, createSeries, renameSeries, deleteSeries,
    deleteNovel, setActiveSeries, setActiveNovel } = useProject();
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: CtxTarget } | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{
    type: 'rename' | 'delete';
    title: string;
    text: string;
    target: CtxTarget;
  } | null>(null);
  const [novelDlg, setNovelDlg] = useState<'choice' | 'import' | 'create' | null>(null);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const { activeSeriesId, activeNovelId, series, novels } = state;

  useEffect(() => { loadSeries(); }, []);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedSeries);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedSeries(next);
    if (!next.has(id)) return;
    // 加载小说
    setActiveSeries(id);
    loadNovels(id);
  };

  const handleRightClick = (e: React.MouseEvent, target: CtxTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, target });
  };

  const handleCreateSeries = () => {
    setConfirmDlg({
      type: 'rename', title: '新建集合', text: '请输入集合名称',
      target: null,
    });
  };

  const confirmAction = (close: boolean = true) => {
    setConfirmDlg(null);
    if (close) setCtxMenu(null);
  };

  const execConfirm = async (value: string) => {
    if (!confirmDlg) return;
    if (confirmDlg.type === 'rename') {
      if (confirmDlg.target?.type === 'series') {
        if (value.trim()) await renameSeries(confirmDlg.target.id, value.trim());
      } else if (confirmDlg.target?.type === 'novel') {
        // novel rename not supported via this dialog yet
      } else {
        // 新建集合
        if (value.trim()) await createSeries(value.trim());
      }
    } else if (confirmDlg.type === 'delete') {
      if (confirmDlg.target?.type === 'series') {
        await deleteSeries(confirmDlg.target.id);
      } else if (confirmDlg.target?.type === 'novel') {
        if (activeNovelId === confirmDlg.target.id) setActiveNovel(null);
        await deleteNovel(confirmDlg.target.id);
      }
    }
    confirmAction();
  };

  const handleCreateNovel = (seriesId: string) => {
    setNovelDlg('choice');
    setActiveSeries(seriesId);
    loadNovels(seriesId);
  };

  const handleImportNovel = (seriesId: string) => {
    setNovelDlg('import');
    setActiveSeries(seriesId);
    loadNovels(seriesId);
  };

  const getSeriesNovels = (seriesId: string) => novels.filter(n => n.series_id === seriesId);

  const seriesMenuItems = (sid: string, sname: string) => [
    { label: '新建小说', icon: '🆕', action: () => handleCreateNovel(sid) },
    { sep: true },
    { label: '重命名集合', icon: '✎', action: () => setConfirmDlg({
      type: 'rename', title: '重命名集合', text: `修改「${sname}」名称为:`, target: { type: 'series', id: sid, name: sname },
    })},
    { sep: true },
    { label: '删除集合', icon: '🗑', danger: true,
      action: () => setConfirmDlg({
        type: 'delete', title: '⚠️ 删除集合',
        text: `确定删除集合「${sname}」？此操作仅删除记录，小说文件不会被删除。`, target: { type: 'series', id: sid, name: sname },
      })},
  ];

  const novelMenuItems = (nid: string, ntitle: string, sid: string) => [
    { label: '重命名', icon: '✎', action: () => {} },
    { label: '刷新扫描', icon: '🔄', action: async () => {
      await setActiveNovel(nid);
    }},
    { sep: true },
    { label: `从${brand.shortName}移除`, icon: '🗑', danger: true,
      action: () => setConfirmDlg({
        type: 'delete', title: '⚠️ 移除小说',
        text: `确定从${brand.shortName}移除「${ntitle}」？仅删除数据库记录，不删除文件。`, target: { type: 'novel', id: nid, title: ntitle, seriesId: sid },
      })},
  ];

  const toggleActiveNovel = async (nid: string) => {
    if (activeNovelId === nid) return;
    await setActiveNovel(nid);
    onSelectNovel?.();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>📚 项目</span>
        <button className="panel-header-btn" onClick={handleCreateSeries} title="新建集合">＋</button>
      </div>

      <div className="panel-list">
        {series.length === 0 && (
          <div className="panel-empty">
            📚 暂无集合<br />
            <button onClick={handleCreateSeries} style={{ marginTop: 8, padding: '4px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
              点击创建第一个集合
            </button>
          </div>
        )}

        {series.map(s => {
          const isExpanded = expandedSeries.has(s.id);
          const isSeriesActive = activeSeriesId === s.id;
          const snovels = getSeriesNovels(s.id);
          return (
            <div key={s.id}>
              {/* 集合行 */}
              <div
                className={`project-row${isSeriesActive ? ' active' : ''}`}
                onClick={() => toggleExpand(s.id)}
                onContextMenu={e => handleRightClick(e, { type: 'series', id: s.id, name: s.name })}
              >
                <span className="project-arrow">{isExpanded ? '▾' : '▸'}</span>
                <span className="project-icon">📚</span>
                <span className="project-title">{s.name}</span>
                <span className="project-count">{snovels.length}</span>
              </div>

              {/* 小说子列表 */}
              {isExpanded && (
                <div className="project-children">
                  {snovels.map(n => (
                    <div key={n.id}
                      className={`project-row novel${activeNovelId === n.id ? ' active' : ''}`}
                      onClick={() => toggleActiveNovel(n.id)}
                      onContextMenu={e => handleRightClick(e, { type: 'novel', id: n.id, title: n.title, seriesId: s.id })}
                    >
                      <span className="project-arrow" />
                      <span className="project-icon">📖</span>
                      <span className="project-title">{n.title}</span>
                      <span className="project-tag">{n.structure_mode === 'volume' ? '分卷' : '扁平'}</span>
                    </div>
                  ))}
                  {snovels.length === 0 && (
                    <div className="project-empty">
                      <span>暂无小说 — </span>
                      <button onClick={() => handleCreateNovel(s.id)} className="link-btn">新建</button>
                      <span> / </span>
                      <button onClick={() => handleImportNovel(s.id)} className="link-btn">导入</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 右键菜单 */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          items={ctxMenu.target?.type === 'series'
            ? seriesMenuItems(ctxMenu.target.id, ctxMenu.target.name)
            : ctxMenu.target
              ? novelMenuItems(ctxMenu.target.id, ctxMenu.target.title, ctxMenu.target.seriesId)
              : []}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* 确认对话框 */}
      {confirmDlg && (
        <ConfirmDialog
          title={confirmDlg.title}
          message={confirmDlg.text}
          inputLabel={confirmDlg.type === 'rename' ? '名称' : undefined}
          inputValue={confirmDlg.type === 'rename' ? (confirmDlg.target?.type === 'series' ? confirmDlg.target.name : '') : undefined}
          confirmLabel={confirmDlg.type === 'delete' ? '确认删除' : '确定'}
          danger={confirmDlg.type === 'delete'}
          onConfirm={execConfirm}
          onCancel={() => confirmAction()}
        />
      )}

      {/* 新建/导入统一弹窗 */}
      {novelDlg && state.activeSeriesId && (
        <NovelDialog
          seriesId={state.activeSeriesId}
          initialTab={novelDlg}
          onComplete={() => setNovelDlg(null)}
          onClose={() => setNovelDlg(null)}
        />
      )}
    </div>
  );
}
