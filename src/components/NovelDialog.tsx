import { useState, useRef } from 'react';
import { useProject } from '../hooks/useProject';
import { isTauriEnv } from '../utils/db';
import { scanNovelDirectory, type NovelStructure } from '../utils/fileOps';
import { pickAndScanDirectory } from '../utils/browserFs';

type Tab = 'import' | 'create';
type ImportStep = 'idle' | 'picked' | 'scanning' | 'result';

interface Props {
  seriesId: string;
  initialTab: Tab;
  onComplete: (novelId: string) => void;
  onClose: () => void;
}

async function pickDirectory(title = '选择文件夹'): Promise<string | null> {
  if (isTauriEnv()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      return await open({ directory: true, title }) || null;
    } catch { /* fallthrough */ }
  }
  const path = prompt('请输入路径（浏览器模式为模拟）:');
  return path || null;
}

export default function NovelDialog({ seriesId, initialTab, onComplete, onClose }: Props) {
  const { createNovel, importNovel, setActiveNovel } = useProject();
  const [tab, setTab] = useState<Tab>(initialTab);
  const done = useRef(false);

  // ========== 新建 Tab ==========
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'volume' | 'flat'>('volume');
  const [chapterCount, setChapterCount] = useState(1);
  const [parentPath, setParentPath] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const handlePickCreatePath = async () => {
    setCreateError('');
    const dir = await pickDirectory('选择小说存储位置');
    if (dir) setParentPath(dir);
  };

  const handleCreate = async () => {
    const name = title.trim();
    if (!name) { setCreateError('请输入小说名称'); return; }
    if (!parentPath) { setCreateError('请选择存储位置'); return; }
    if (mode === 'flat' && (chapterCount < 1 || chapterCount > 999)) { setCreateError('分章数量需要在 1-999 之间'); return; }
    setCreating(true);
    try {
      const rootPath = `${parentPath}/${name}`;
      const id = await createNovel(seriesId, name, mode, rootPath, mode === 'flat' ? chapterCount : undefined);
      await setActiveNovel(id);
      onComplete(id);
    } catch (e: any) {
      setCreateError(e?.message || '创建失败');
      setCreating(false);
    }
  };

  // ========== 导入 Tab ==========
  const [step, setStep] = useState<ImportStep>('idle');
  const [importPath, setImportPath] = useState('');
  const [importName, setImportName] = useState('');
  const [structure, setStructure] = useState<NovelStructure | null>(null);
  const [detectedMode, setDetectedMode] = useState<'volume' | 'flat' | null>(null);
  const [selectedMode, setSelectedMode] = useState<'volume' | 'flat' | null>(null);
  const [importError, setImportError] = useState('');

  const handlePickImport = async () => {
    setImportError('');
    if (isTauriEnv()) {
      const dir = await pickDirectory('选择小说文件夹');
      if (!dir) return;
      setImportPath(dir);
      setImportName(dir.split(/[/\\]/).pop() || '导入作品');
      setStep('picked');
    } else {
      // 浏览器模式直接走 pickAndScan
      setStep('scanning');
      try {
        const result = await pickAndScanDirectory();
        if (!result) { setStep('idle'); return; }
        setImportPath(result.rootName);
        setImportName(result.rootName);
        setStructure(result.structure);
        setDetectedMode(result.structure.mode);
        setSelectedMode(result.structure.mode);
        setStep('result');
      } catch (e: any) {
        setImportError(e.message || '扫描失败');
        setStep('idle');
      }
    }
  };

  const handleScan = async () => {
    if (!importPath) return;
    setStep('scanning');
    setImportError('');
    try {
      const result = await scanNovelDirectory(importPath);
      setStructure(result);
      setDetectedMode(result.mode);
      setSelectedMode(result.mode);
      setStep('result');
    } catch (e: any) {
      setImportError(e.message || '扫描失败');
      setStep('picked');
    }
  };

  const handleImport = async () => {
    if (!structure || done.current || !selectedMode) return;
    done.current = true;
    const info = { mode: selectedMode, prologue_path: structure.prologue?.relative_path || null };
    const id = await importNovel(seriesId, importPath, info);
    await setActiveNovel(id);
    onComplete(id);
  };

  const totalChapters = (structure?.volumes || []).reduce((s, v) => s + v.chapters.length, 0)
    + (structure?.root_chapters || []).length
    + (structure?.prologue ? 1 : 0);
  const modeMismatch = detectedMode && selectedMode && detectedMode !== selectedMode;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'import', label: '📂 导入' },
    { key: 'create', label: '🆕 新建' },
  ];

  const fmtNum = (n: number) => String(n).padStart(3, '0');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ minWidth: 440, maxWidth: 540 }}>
        <div className="modal-header">
          <div className="modal-tabs">
            {tabs.map(t => (
              <button key={t.key} className={`modal-tab${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* ===== 导入 Tab ===== */}
          {tab === 'import' && (
            <div>
              {/* Step: idle → 选择文件夹 */}
              {step === 'idle' && (
                <div className="dialog-center">
                  <div className="dialog-icon">📂</div>
                  <p className="dialog-desc">选择已有的小说文件夹，手动触发扫描</p>
                  <button className="modal-btn confirm dialog-big-btn" onClick={handlePickImport}>
                    📁 选择文件夹
                  </button>
                </div>
              )}

              {/* Step: picked → 已选路径，等待扫描 */}
              {step === 'picked' && (
                <div>
                  <div className="path-card">
                    <div className="path-card-label">已选择文件夹</div>
                    <div className="path-card-value">📁 {importName}</div>
                    <div className="path-card-full">{importPath}</div>
                  </div>
                  <div className="dialog-center" style={{ marginTop: 16 }}>
                    <button className="modal-btn confirm dialog-big-btn" onClick={handleScan}>🔍 扫描目录</button>
                    <button className="link-btn" onClick={handlePickImport} style={{ marginTop: 8 }}>
                      📁 重新选择
                    </button>
                  </div>
                </div>
              )}

              {/* Step: scanning */}
              {step === 'scanning' && (
                <div className="dialog-center" style={{ padding: 32 }}>
                  <div className="dialog-spinner" />
                  <div style={{ color: 'var(--text-muted)', marginTop: 12 }}>正在递归扫描目录...</div>
                </div>
              )}

              {/* Step: result → 展示结果 */}
              {step === 'result' && structure && (
                <div>
                  <div className="path-card">
                    <div className="path-card-label">扫描结果</div>
                    <div className="path-card-value">📁 {importName}</div>
                    <div className="path-card-full" style={{ fontSize: '0.72rem' }}>{importPath}</div>
                  </div>

                  {/* 模式选择 + 推荐 */}
                  <fieldset className="field-fieldset">
                    <legend className="field-legend">📖 结构模式</legend>
                    <div className="field-row" style={{ marginBottom: 8 }}>
                      <button
                        className={`field-option compact${selectedMode === 'volume' ? ' active' : ''}`}
                        onClick={() => setSelectedMode('volume')}
                      >
                        <span>📁</span>
                        <span><b>有分卷</b>{detectedMode === 'volume' && <em className="badge-recommend">推荐</em>}</span>
                      </button>
                      <button
                        className={`field-option compact${selectedMode === 'flat' ? ' active' : ''}`}
                        onClick={() => setSelectedMode('flat')}
                      >
                        <span>📄</span>
                        <span><b>无分卷</b>{detectedMode === 'flat' && <em className="badge-recommend">推荐</em>}</span>
                      </button>
                    </div>
                    {modeMismatch && (
                      <p className="warn-text">
                        ⚠ 你选择了与扫描结果不同的模式。若选「有分卷」而文件夹内无子目录，则全部文件作为根章节显示；若选「无分卷」而有子目录，子目录将被忽略。
                      </p>
                    )}
                  </fieldset>

                  {/* 统计信息 */}
                  <div className="import-summary">
                    <span>📁 分卷 <b>{structure.volumes.length}</b></span>
                    <span>📝 章节 <b>{totalChapters}</b></span>
                    {structure.prologue && <span>📄 有序章</span>}
                  </div>

                  {/* 目录树预览 */}
                  {totalChapters > 0 && (
                    <div className="import-tree">
                      {structure.prologue && (
                        <div className="import-node prologue">📄 序章 {structure.prologue.name}</div>
                      )}
                      {structure.volumes.map((v, i) => (
                        <div key={i}>
                          <div className="import-volume">📁 {v.name} ({v.chapters.length}章)</div>
                          {v.chapters.slice(0, 5).map((c, j) => (
                            <div key={j} className="import-node">📝 {c.name}</div>
                          ))}
                          {v.chapters.length > 5 && <div className="import-node-more">⋯ 还有 {v.chapters.length - 5} 章</div>}
                        </div>
                      ))}
                      {structure.root_chapters.map((c, i) => (
                        <div key={i} className="import-node">📝 {c.name}</div>
                      ))}
                    </div>
                  )}

                  {totalChapters === 0 && (
                    <div className="dialog-center" style={{ padding: 16 }}>
                      <p style={{ color: 'var(--text-muted)' }}>未检测到 .md/.txt 文件</p>
                    </div>
                  )}

                  {totalChapters > 50 && (
                    <p className="warn-text" style={{ marginTop: 8 }}>
                      ⚠ 该小说有 {totalChapters} 个章节，数量较大，建议复查。
                    </p>
                  )}

                  {importError && <p style={{ color: '#f87171', marginTop: 8, fontSize: '0.82rem' }}>{importError}</p>}

                  <div className="dialog-center" style={{ marginTop: 12 }}>
                    <button className="link-btn" onClick={handlePickImport}>📁 重新选择文件夹</button>
                  </div>
                </div>
              )}

              {importError && step !== 'result' && (
                <div className="dialog-center" style={{ padding: 16 }}>
                  <p style={{ color: '#f87171', marginBottom: 12 }}>{importError}</p>
                  <button className="modal-btn confirm" onClick={handlePickImport}>重新选择</button>
                </div>
              )}
            </div>
          )}

          {/* ===== 新建 Tab ===== */}
          {tab === 'create' && (
            <div>
              {creating ? (
                <div className="dialog-center" style={{ padding: 32 }}>
                  <div className="dialog-spinner" />
                  <div style={{ color: 'var(--text-muted)', marginTop: 12 }}>正在创建小说...</div>
                </div>
              ) : (
                <div>
                  <label className="field-label">小说名称</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                    placeholder="输入小说标题" autoFocus />

                  <label className="field-label">结构模式</label>
                  <div className="field-row">
                    <button className={`field-option${mode === 'volume' ? ' active' : ''}`}
                      onClick={() => setMode('volume')}>
                      <span>📁</span>
                      <span><b>有分卷</b><br /><em>子文件夹为分卷，文件为章节</em></span>
                    </button>
                    <button className={`field-option${mode === 'flat' ? ' active' : ''}`}
                      onClick={() => setMode('flat')}>
                      <span>📄</span>
                      <span><b>无分卷</b><br /><em>所有 .md 文件直接为章节</em></span>
                    </button>
                  </div>

                  {/* 分章：仅无分卷模式 */}
                  {mode === 'flat' && (
                    <div>
                      <label className="field-label">分章配置</label>
                      <div className="field-row" style={{ alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flexShrink: 0 }}>预生成</span>
                        <input type="number" min={1} max={999}
                          value={chapterCount} onChange={e => setChapterCount(parseInt(e.target.value) || 1)}
                          style={{ width: 80, textAlign: 'center' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>章</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flex: 1 }}>
                          ({fmtNum(1)}-{fmtNum(chapterCount)})
                        </span>
                      </div>
                    </div>
                  )}

                  <label className="field-label">存储位置</label>
                  <div className="field-row">
                    <input value={parentPath} readOnly
                      placeholder="点击 📁 选择文件夹..." style={{ flex: 1, cursor: 'pointer' }}
                      onClick={handlePickCreatePath} />
                    <button className="modal-btn confirm" onClick={handlePickCreatePath} style={{ flexShrink: 0 }}>📁</button>
                  </div>
                  {parentPath && (
                    <div className="path-preview">
                      📂 {parentPath}<b style={{ color: 'var(--accent)' }}>/{title || '小说名'}</b>
                    </div>
                  )}

                  {createError && <p style={{ color: '#f87171', marginTop: 10, fontSize: '0.82rem' }}>{createError}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>取消</button>
          {tab === 'import' && step === 'result' && structure && !importError && (
            <button className="modal-btn confirm" onClick={handleImport}>确认导入</button>
          )}
          {tab === 'create' && !creating && (
            <button className="modal-btn confirm" onClick={handleCreate}
              disabled={!title.trim() || !parentPath}>
              创建小说
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
