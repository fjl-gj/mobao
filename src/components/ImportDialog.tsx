import { useState, useEffect, useRef } from 'react';
import { useProject } from '../hooks/useProject';
import { isTauriEnv } from '../utils/db';
import { scanNovelDirectory, type NovelStructure } from '../utils/fileOps';
import { pickAndScanDirectory } from '../utils/browserFs';

interface Props {
  seriesId: string;
  onComplete: (novelId: string) => void;
  onClose: () => void;
}

export default function ImportDialog({ seriesId, onComplete, onClose }: Props) {
  const { importNovel, setActiveNovel } = useProject();
  const [scanning, setScanning] = useState(true);
  const [rootName, setRootName] = useState('');
  const [rootPath, setRootPath] = useState('');
  const [structure, setStructure] = useState<NovelStructure | null>(null);
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    doPickScan();
  }, []);

  const doPickScan = async () => {
    setScanning(true);
    setError('');

    try {
      if (isTauriEnv()) {
        // Tauri 模式：先选文件夹，再扫描
        const { open } = await import('@tauri-apps/plugin-dialog');
        const dir = await open({ directory: true, title: '选择小说文件夹' });
        if (!dir) { onClose(); return; }
        const result = await scanNovelDirectory(dir);
        const name = dir.split(/[/\\]/).pop() || '导入作品';
        setRootPath(dir);
        setRootName(name);
        setStructure(result);
      } else {
        // 浏览器模式：showDirectoryPicker / webkitdirectory
        const result = await pickAndScanDirectory();
        if (!result) { onClose(); return; }
        // showDirectoryPicker 读不到真实路径，用名称占位
        // webkitdirectory 同样读不到路径
        setRootName(result.rootName);
        setRootPath(result.rootName);
        setStructure(result.structure);
      }
    } catch (e: any) {
      setError(e.message || '选择或扫描目录失败');
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async () => {
    if (!structure || done.current) return;
    done.current = true;
    const structureInfo = {
      mode: structure.mode,
      prologue_path: structure.prologue?.relative_path || null,
    };
    const id = await importNovel(seriesId, rootPath, structureInfo);
    await setActiveNovel(id);
    onComplete(id);
  };

  const totalChapters = (structure?.volumes || []).reduce((s, v) => s + v.chapters.length, 0)
    + (structure?.root_chapters || []).length
    + (structure?.prologue ? 1 : 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ minWidth: 400, maxWidth: 520 }}>
        <div className="modal-header">
          <h3>📂 导入小说</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {scanning ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
              <div>正在选择并扫描文件夹...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <p style={{ color: '#f87171', marginBottom: 12, fontSize: '0.85rem' }}>{error}</p>
              <button className="modal-btn confirm" onClick={doPickScan}>重新选择</button>
            </div>
          ) : structure ? (
            <div>
              <p style={{ marginBottom: 10, fontSize: '0.82rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                📁 {rootName}
              </p>
              <div className="import-summary">
                <span>📖 模式：<b>{structure.mode === 'volume' ? '有分卷' : '无分卷（扁平）'}</b></span>
                {structure.mode === 'volume' && <span>📁 分卷：<b>{structure.volumes.length}</b></span>}
                <span>📝 章节：<b>{totalChapters}</b></span>
              </div>
              <div className="import-tree">
                {structure.prologue && (
                  <div className="import-node prologue">📄 序章<span className="import-node-name">{structure.prologue.name}</span></div>
                )}
                {structure.volumes.map((v, i) => (
                  <div key={i}>
                    <div className="import-volume">📁 {v.name} <span className="import-chapter-count">{v.chapters.length}章</span></div>
                    {v.chapters.slice(0, 8).map((c, j) => (
                      <div key={j} className="import-node">📝 {c.name}</div>
                    ))}
                    {v.chapters.length > 8 && <div className="import-node-more">⋯ 还有 {v.chapters.length - 8} 章</div>}
                  </div>
                ))}
                {structure.root_chapters.map((c, i) => (
                  <div key={i} className="import-node">📝 {c.name}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>取消</button>
          {!scanning && structure && (
            <button className="modal-btn confirm" onClick={handleImport}>
              确认导入
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
