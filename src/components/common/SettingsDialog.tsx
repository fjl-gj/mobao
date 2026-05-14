import { useSettings } from '../../hooks/useSettings';

interface SettingsDialogProps {
  onClose: () => void;
}

const FREE_STORAGE_MB = 300;

const FONT_OPTIONS = [
  { value: 'var(--font-mono)', label: '等宽字体' },
  { value: 'var(--font-reader)', label: '阅读字体' },
  { value: 'var(--font-sans)', label: '系统衬线' },
  { value: '"Microsoft YaHei", "PingFang SC", sans-serif', label: '现代无衬线' },
];

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const isSignedIn = false;
  const usedStorageMB = 0;
  const storagePercent = Math.min(100, Math.round((usedStorageMB / FREE_STORAGE_MB) * 100));

  return (
    <>
      <div className="modal-header">
        <h3>全局设置</h3>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>

      <div className="modal-body settings-dialog-body">
        <section className="settings-section">
          <h4>账户与云空间</h4>

          <div className="settings-account-card">
            <div>
              <strong>{isSignedIn ? '已登录' : '未登录'}</strong>
              <p>{isSignedIn ? '云端同步与 OSS 存储可用' : `登录后可免费使用 ${FREE_STORAGE_MB}MB 云端空间`}</p>
            </div>
            <button className="settings-primary-action" onClick={() => window.alert('登录功能待接入')}>
              {isSignedIn ? '账户中心' : '登录 / 注册'}
            </button>
          </div>

          <div className="settings-storage">
            <div className="settings-storage-row">
              <span>OSS 存储空间</span>
              <strong>{usedStorageMB}MB / {FREE_STORAGE_MB}MB</strong>
            </div>
            <div className="settings-storage-bar">
              <span style={{ width: `${storagePercent}%` }} />
            </div>
          </div>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.cloudSyncEnabled}
              disabled={!isSignedIn}
              onChange={e => updateSettings({ cloudSyncEnabled: e.target.checked })}
            />
            <span>开启云端同步</span>
          </label>

          <p className="settings-note settings-note-full">
            登录态、token、空间用量和 OSS 文件清单后续应从账户服务读取；本地设置只保存同步偏好。
          </p>
        </section>

        <section className="settings-section">
          <h4>AI 功能</h4>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={false}
              disabled
              onChange={() => updateSettings({ aiEnabled: false })}
            />
            <span>启用 AI 助手入口</span>
          </label>

          <label className="settings-field">
            <span>服务商</span>
            <select
              value={settings.aiProvider}
              onChange={e => updateSettings({ aiProvider: e.target.value as typeof settings.aiProvider })}
            >
              <option value="mobao">墨宝内置服务</option>
              <option value="openai">OpenAI</option>
              <option value="custom">自定义接口</option>
            </select>
          </label>

          <label className="settings-field">
            <span>默认模型</span>
            <input
              value={settings.aiDefaultModel}
              onChange={e => updateSettings({ aiDefaultModel: e.target.value })}
              placeholder="后续接入模型列表"
            />
          </label>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.aiUseCurrentChapter}
              onChange={e => updateSettings({ aiUseCurrentChapter: e.target.checked })}
            />
            <span>默认读取当前章节</span>
          </label>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.aiUseWritingContext}
              onChange={e => updateSettings({ aiUseWritingContext: e.target.checked })}
            />
            <span>允许读取人物、世界观、大纲等写作资料</span>
          </label>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.aiSaveHistory}
              onChange={e => updateSettings({ aiSaveHistory: e.target.checked })}
            />
            <span>保存 AI 对话历史</span>
          </label>

          <p className="settings-note settings-note-full">
            这里先预留 AI 配置；模型对话和 AI 编辑入口在右侧栏的 AI 页签。
          </p>
        </section>

        <section className="settings-section">
          <h4>编辑器</h4>

          <label className="settings-field">
            <span>编辑方式</span>
            <select
              value={settings.editorMode}
              onChange={e => updateSettings({ editorMode: e.target.value as typeof settings.editorMode })}
            >
              <option value="markdown">Markdown</option>
              <option value="richtext">Word 式富文本</option>
            </select>
          </label>

          <p className="settings-note">
            Markdown 已可用；Word 式富文本需要后续接入富文本编辑器，当前只保存偏好。
          </p>

          <label className="settings-field">
            <span>字体</span>
            <select
              value={settings.editorFontFamily}
              onChange={e => updateSettings({ editorFontFamily: e.target.value })}
            >
              {FONT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>字号</span>
            <input
              type="number"
              min={12}
              max={28}
              value={settings.editorFontSize}
              onChange={e => updateSettings({ editorFontSize: Number(e.target.value) || 15 })}
            />
          </label>

          <label className="settings-field">
            <span>行高</span>
            <input
              type="number"
              min={1.2}
              max={2.4}
              step={0.1}
              value={settings.editorLineHeight}
              onChange={e => updateSettings({ editorLineHeight: Number(e.target.value) || 1.7 })}
            />
          </label>
        </section>

        <section className="settings-section">
          <h4>写作偏好</h4>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={e => updateSettings({ autoSave: e.target.checked })}
            />
            <span>自动保存</span>
          </label>

          <label className="settings-field">
            <span>自动保存间隔（秒）</span>
            <input
              type="number"
              min={5}
              max={600}
              value={settings.autoSaveInterval}
              onChange={e => updateSettings({ autoSaveInterval: Number(e.target.value) || 60 })}
            />
          </label>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.showLineNumbers}
              onChange={e => updateSettings({ showLineNumbers: e.target.checked })}
            />
            <span>显示行号</span>
          </label>

          <label className="settings-check">
            <input
              type="checkbox"
              checked={settings.enableSpellCheck}
              onChange={e => updateSettings({ enableSpellCheck: e.target.checked })}
            />
            <span>拼写检查</span>
          </label>
        </section>
      </div>

      <div className="modal-footer">
        <button className="modal-btn cancel" onClick={resetSettings}>恢复默认</button>
        <button className="modal-btn confirm" onClick={onClose}>完成</button>
      </div>
    </>
  );
}
