import { useState, useEffect } from 'react';
import { useNovel } from '../hooks/useNovel';
import { useProject } from '../hooks/useProject';
import { useResponsiveCtx } from '../contexts/ResponsiveContext';
import { createChapter, createVolume } from '../utils/fileOps';

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

export default function Modal() {
  const { state, dispatch } = useNovel();
  const { state: projectState, refreshStructure } = useProject();
  const { isMobile } = useResponsiveCtx();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const modal = state.modal;

  useEffect(() => { if (modal) setValue(''); }, [modal]);

  if (!modal) return null;

  const close = () => dispatch({ type: 'CLOSE_MODAL' } as any);

  const confirm = async () => {
    const title = value.trim();
    if (!title || busy) return;
    const activeNovel = projectState.activeNovelId
      ? projectState.novels.find(n => n.id === projectState.activeNovelId)
      : null;
    if (!activeNovel) return;

    setBusy(true);
    try {
      if (modal.type === 'newVolume') {
        await createVolume(activeNovel.root_path, title);
        await refreshStructure();
      } else if (modal.type === 'newChapter') {
        let volumeRelativePath = '';
        let volumeTitle = '文稿';
        if (activeNovel.structure_mode === 'volume') {
          volumeTitle = projectState.novelStructure?.volumes[0]?.name || '分卷一';
          if (!projectState.novelStructure?.volumes[0]) {
            await createVolume(activeNovel.root_path, volumeTitle);
          }
          volumeRelativePath = volumeTitle;
        }
        await createChapter(activeNovel.root_path, volumeRelativePath, title);
        const fileTitle = sanitizeFileName(title);
        const relativePath = volumeRelativePath ? `${volumeRelativePath}/${fileTitle}.md` : `${fileTitle}.md`;
        dispatch({
          type: 'UPSERT_CHAPTER',
          payload: {
            title,
            content: `# ${title}\n\n`,
            relativePath: relativePath || `${fileTitle}.md`,
            volumeTitle,
          },
        } as any);
        await refreshStructure();
      }
      close();
    } catch (e: any) {
      dispatch({ type: 'ADD_TOAST', payload: { message: e?.message || '文件操作失败', type: 'error' } } as any);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`modal-backdrop ${isMobile ? 'modal-mobile' : ''}`} onClick={close}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{modal.type === 'newVolume' ? '📁 新建卷' : modal.type === 'newChapter' ? '📝 新建章节' : modal.type}</h3>
          <button className="modal-close" onClick={close}>✕</button>
        </div>
        <div className="modal-body">
          <input autoFocus value={value} onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirm()}
            placeholder={modal.type === 'newVolume' ? '输入卷标题' : '输入章节标题'} />
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={close} disabled={busy}>取消</button>
          <button className="modal-btn confirm" onClick={confirm} disabled={busy}>确定</button>
        </div>
      </div>
    </div>
  );
}
