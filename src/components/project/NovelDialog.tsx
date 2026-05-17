import { useState, useRef } from 'react';
import { useProject } from '../../hooks/useProject';
import { createDialog } from '../../core/dialog';
import type { DirectoryPickResult } from '../../core/dialog';
import { registerBrowserDirectory, scanNovelDirectory, type NovelStructure } from '../../utils/fileOps';

type Tab = 'choice' | 'import' | 'create';
type ImportStep = 'idle' | 'picked' | 'scanning' | 'result';
type StructureMode = 'volume' | 'flat';

interface Props {
  seriesId: string;
  initialTab: Tab;
  onComplete: (novelId: string) => void;
  onClose: () => void;
}

export default function NovelDialog({ seriesId, initialTab, onComplete, onClose }: Props) {
  const { createNovel, importNovel, setActiveNovel } = useProject();
  const [tab, setTab] = useState<Tab>(initialTab);
  const done = useRef(false);

  // ========== 新建 Tab ==========
  const [createStep, setCreateStep] = useState(1);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<StructureMode | null>(null);
  const [chapterCount, setChapterCount] = useState(100);
  const [parentPath, setParentPath] = useState('');
  const [parentPick, setParentPick] = useState<DirectoryPickResult | null>(null);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const handlePickCreatePath = async () => {
    setCreateError('');
    const dir = await (await createDialog()).pickDirectory('选择小说存储位置', 'storage');
    if (dir) {
      setParentPick(dir);
      setParentPath(dir.path);
    }
  };

  const handleCreate = async () => {
    const name = title.trim();
    if (!name) { setCreateError('请输入小说名称'); return; }
    if (!parentPath) { setCreateError('请选择存储位置'); return; }
    if (!mode) { setCreateError('请选择小说结构'); return; }
    if (mode === 'flat' && (chapterCount < 1 || chapterCount > 9999)) {
      setCreateError('章节聚合数需要在 1-9999 之间');
      return;
    }
    setCreating(true);
    try {
      const rootPath = `${parentPath}/${name}`;
      const id = await createNovel(seriesId, name, mode, rootPath, mode === 'flat' ? { count: chapterCount } : undefined);
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
  const [detectedMode, setDetectedMode] = useState<StructureMode | null>(null);
  const [selectedMode, setSelectedMode] = useState<StructureMode | null>(null);
  const [importChapterCount, setImportChapterCount] = useState(1);
  const [importError, setImportError] = useState('');

  const handlePickImport = async () => {
    setImportError('');
    const dir = await (await createDialog()).pickDirectory('选择小说文件夹', 'import');
    if (!dir) return;
    setImportPath(dir.path);
    setImportName(dir.name || '导入作品');
    if (dir.source === 'browser-upload') {
      await registerBrowserDirectory(dir.path, dir.files || []);
    }
    setStructure(null);
    setDetectedMode(null);
    setSelectedMode(null);
    setStep('picked');
  };

  const handleScan = async () => {
    if (!importPath) return;
    setStep('scanning');
    setImportError('');
    try {
      const result = await scanNovelDirectory(importPath);
      const count = getTotalChapters(result);
      if (count === 0) throw new Error('未检测到可导入的 .md/.txt 文件');
      setStructure(result);
      setDetectedMode(result.mode);
      setSelectedMode(result.mode);
      setImportChapterCount(Math.max(1, count));
      setStep('result');
    } catch (e: any) {
      setImportError(e.message || '扫描失败');
      setStep('picked');
    }
  };

  const handleImport = async () => {
    if (!structure || done.current || !selectedMode) return;
    if (!importName.trim()) { setImportError('请输入小说名称'); return; }
    if (selectedMode === 'flat' && importChapterCount < 1) {
      setImportError('章节聚合数不正确');
      return;
    }
    done.current = true;
    try {
      const info = {
        title: importName.trim(),
        mode: selectedMode,
        prologue_path: structure.prologue?.relative_path || null,
        chapter_count: selectedMode === 'flat' ? importChapterCount : null,
        structure_json: JSON.stringify(structure),
        source_type: 'import' as const,
      };
      const id = await importNovel(seriesId, importPath, info);
      await setActiveNovel(id);
      onComplete(id);
    } catch (e: any) {
      done.current = false;
      setImportError(e?.message || '导入失败');
    }
  };

  const getTotalChapters = (s: NovelStructure | null) => (s?.volumes || []).reduce((sum, v) => sum + v.chapters.length, 0)
    + (s?.root_chapters || []).length
    + (s?.prologue ? 1 : 0);
  const totalChapters = getTotalChapters(structure);
  const importFlatChapters = structure
    ? [...structure.volumes.flatMap(v => v.chapters), ...structure.root_chapters]
    : [];
  const modeMismatch = detectedMode && selectedMode && detectedMode !== selectedMode;

  const fmtNum = (n: number) => String(n).padStart(3, '0');
  const flatVolumeName = (count: number) => `第一卷（${count}章）`;
  const createCanContinue = createStep === 1 ? !!parentPath : createStep === 2 ? !!title.trim() : !!mode;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box novel-dialog-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{tab === 'choice' ? '新建小说' : tab === 'create' ? '创建小说' : '导入小说'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {tab === 'choice' && (
            <div className="dialog-center">
              <div className="field-row novel-action-row">
                <button className="field-option" onClick={() => setTab('create')}>
                  <span>🆕</span>
                  <span><b>创建小说</b><br /><em>选择位置后新建目录和章节结构</em></span>
                </button>
                <button className="field-option" onClick={() => setTab('import')}>
                  <span>📂</span>
                  <span><b>导入小说</b><br /><em>扫描现有目录，只记录元数据</em></span>
                </button>
              </div>
            </div>
          )}

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

                  <label className="field-label">小说名称</label>
                  <input value={importName} onChange={e => setImportName(e.target.value)} placeholder="输入小说名称" />

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

                  {selectedMode === 'flat' && (
                    <div>
                      <label className="field-label">章节聚合数</label>
                      <div className="field-row" style={{ alignItems: 'center' }}>
                        <input type="number" min={1} max={9999}
                          value={importChapterCount}
                          onChange={e => setImportChapterCount(parseInt(e.target.value) || 1)}
                          style={{ width: 90, textAlign: 'center' }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>章</span>
                      </div>
                      <div className="path-preview">📁 {flatVolumeName(importChapterCount)}</div>
                    </div>
                  )}

                  {/* 目录树预览 */}
                  {totalChapters > 0 && (
                    <div className="import-tree">
                      {structure.prologue && (
                        <div className="import-node prologue">📄 序章 {structure.prologue.name}</div>
                      )}
                      {selectedMode === 'flat' ? (
                        <div>
                          <div className="import-volume">📁 {flatVolumeName(importChapterCount)}</div>
                          {importFlatChapters.slice(0, 5).map((c, j) => (
                            <div key={j} className="import-node">📝 {c.name}</div>
                          ))}
                          {importFlatChapters.length > 5 && <div className="import-node-more">⋯ 还有 {importFlatChapters.length - 5} 章</div>}
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
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
                  <div className="dialog-steps">
                    <span className={createStep === 1 ? 'active' : ''}>1 存储位置</span>
                    <span className={createStep === 2 ? 'active' : ''}>2 小说名称</span>
                    <span className={createStep === 3 ? 'active' : ''}>3 小说结构</span>
                  </div>

                  {createStep === 1 && (
                    <div>
                      <label className="field-label">存储位置</label>
                      <div className="field-row">
                        <input value={parentPath} readOnly
                          placeholder="点击 📁 选择文件夹..." style={{ flex: 1, cursor: 'pointer' }}
                          onClick={handlePickCreatePath} autoFocus />
                        <button className="modal-btn confirm" onClick={handlePickCreatePath} style={{ flexShrink: 0 }}>📁</button>
                      </div>
                    </div>
                  )}

                  {createStep === 2 && (
                    <div>
                      <label className="field-label">小说名称</label>
                      <input value={title} onChange={e => setTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && title.trim()) setCreateStep(3); }}
                        placeholder="输入小说标题" autoFocus />
                      {parentPath && <div className="path-preview">📂 {parentPath}</div>}
                      {parentPick?.source === 'browser-storage' && (
                        <p className="warn-text">浏览器模式会使用应用本地存储，不会创建系统文件夹。</p>
                      )}
                    </div>
                  )}

                  {createStep === 3 && (
                    <div>
                      <label className="field-label">小说结构</label>
                      <div className="field-row">
                        <button className={`field-option${mode === 'volume' ? ' active' : ''}`}
                          onClick={() => setMode('volume')}>
                          <span>📁</span>
                          <span><b>有分卷</b><br /><em>先创建小说目录，分卷信息为空时稍后再处理</em></span>
                        </button>
                        <button className={`field-option${mode === 'flat' ? ' active' : ''}`}
                          onClick={() => setMode('flat')}>
                          <span>📄</span>
                          <span><b>无分卷</b><br /><em>按章节聚合数预生成章节</em></span>
                        </button>
                      </div>

                      {mode === 'flat' && (
                        <div>
                          <label className="field-label">章节聚合数</label>
                          <div className="field-row" style={{ alignItems: 'center' }}>
                            <input type="number" min={1} max={9999}
                              value={chapterCount}
                              onChange={e => setChapterCount(parseInt(e.target.value) || 1)}
                              style={{ width: 90, textAlign: 'center' }} />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>章</span>
                          </div>
                          <div className="import-tree" style={{ marginTop: 8 }}>
                            <div className="import-volume">📁 {flatVolumeName(chapterCount)}</div>
                            {Array.from({ length: Math.min(5, chapterCount) }, (_, index) => {
                              const no = index + 1;
                              return <div key={no} className="import-node">📝 第{fmtNum(no)}章.md</div>;
                            })}
                            {chapterCount > 5 && (
                              <div className="import-node-more">⋯ 还有 {chapterCount - 5} 章</div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="path-preview">
                        📂 {parentPath}<b style={{ color: 'var(--accent)' }}>/{title || '小说名'}</b>
                      </div>
                      {parentPick?.source === 'browser-storage' && (
                        <p className="warn-text">浏览器模式只记录到浏览器存储；桌面端才会创建本地目录和章节文件。</p>
                      )}
                    </div>
                  )}

                  {createError && <p style={{ color: '#f87171', marginTop: 10, fontSize: '0.82rem' }}>{createError}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={tab === 'choice' ? onClose : () => setTab('choice')}>{tab === 'choice' ? '取消' : '返回'}</button>
          {tab === 'import' && step === 'result' && structure && (
            <button className="modal-btn confirm" onClick={handleImport}>确认导入</button>
          )}
          {tab === 'create' && !creating && (
            createStep < 3
              ? <button className="modal-btn confirm" onClick={() => setCreateStep(createStep + 1)} disabled={!createCanContinue}>下一步</button>
              : <button className="modal-btn confirm" onClick={handleCreate} disabled={!title.trim() || !parentPath || !mode}>创建小说</button>
          )}
        </div>
      </div>
    </div>
  );
}
