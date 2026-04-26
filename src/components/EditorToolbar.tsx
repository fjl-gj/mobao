import { useSettings } from '../hooks/useSettings';
import type { AppSettings } from '../contexts/SettingsContext';

const TOOLBAR_BUTTONS: { key: keyof AppSettings; label: string }[] = [
  { key: 'editorFontSize', label: '字号' },
  { key: 'editorLineHeight', label: '行高' },
  { key: 'autoSave', label: '自动保存' },
  { key: 'showLineNumbers', label: '行号' },
];

export default function EditorToolbar() {
  const { settings, updateSettings } = useSettings();

  const adjustFontSize = (delta: number) => {
    const newSize = Math.min(24, Math.max(12, settings.editorFontSize + delta));
    updateSettings({ editorFontSize: newSize });
  };

  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-group">
        <button onClick={() => document.execCommand('bold')} title="加粗 (Ctrl+B)"><b>B</b></button>
        <button onClick={() => document.execCommand('italic')} title="斜体 (Ctrl+I)"><i>I</i></button>
        <button onClick={() => document.execCommand('underline')} title="下划线 (Ctrl+U)"><u>U</u></button>
        <span className="toolbar-sep" />
        <button title="插入标题" onClick={() => {}}>H</button>
        <button title="插入链接" onClick={() => {}}>🔗</button>
        <button title="插入图片" onClick={() => {}}>🖼</button>
        <span className="toolbar-sep" />
        <button title="撤销" onClick={() => {}}>↩</button>
        <button title="重做" onClick={() => {}}>↪</button>
      </div>

      <div className="editor-toolbar-group">
        <button onClick={() => adjustFontSize(-1)} title="缩小字号">A-</button>
        <span className="toolbar-fontsize">{settings.editorFontSize}</span>
        <button onClick={() => adjustFontSize(1)} title="增大字号">A+</button>
      </div>
    </div>
  );
}
