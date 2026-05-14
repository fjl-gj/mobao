import type { EditorView } from 'codemirror';
import { redo, undo } from '@codemirror/commands';
import { useSettings } from '../../hooks/useSettings';

interface EditorToolbarProps {
  view: EditorView | null;
  disabled?: boolean;
}

type LineFormat = 'h1' | 'h2' | 'h3' | 'quote' | 'bullet' | 'ordered';

function focusEditor(view: EditorView | null) {
  view?.focus();
}

function replaceSelection(view: EditorView | null, createText: (selected: string) => string) {
  if (!view) return;
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const insert = createText(selected);

  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
  });
  focusEditor(view);
}

function wrapSelection(view: EditorView | null, before: string, after = before, placeholder = '文本') {
  replaceSelection(view, selected => `${before}${selected || placeholder}${after}`);
}

function insertBlock(view: EditorView | null, block: string) {
  replaceSelection(view, selected => {
    if (selected) return `${selected}\n${block}`;
    return block;
  });
}

function formatCurrentLines(view: EditorView | null, format: LineFormat) {
  if (!view) return;
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);
  const lines: string[] = [];

  for (let lineNo = startLine.number; lineNo <= endLine.number; lineNo += 1) {
    const line = view.state.doc.line(lineNo);
    let text = line.text.replace(/^(#{1,6}\s+|>\s+|[-*]\s+|\d+\.\s+)/, '');

    if (format === 'h1') text = `# ${text || '一级标题'}`;
    if (format === 'h2') text = `## ${text || '二级标题'}`;
    if (format === 'h3') text = `### ${text || '三级标题'}`;
    if (format === 'quote') text = `> ${text}`;
    if (format === 'bullet') text = `- ${text}`;
    if (format === 'ordered') text = `${lineNo - startLine.number + 1}. ${text}`;

    lines.push(text);
  }

  const insert = lines.join('\n');
  view.dispatch({
    changes: { from: startLine.from, to: endLine.to, insert },
    selection: { anchor: startLine.from + insert.length },
  });
  focusEditor(view);
}

export default function EditorToolbar({ view, disabled = false }: EditorToolbarProps) {
  const { settings, updateSettings } = useSettings();

  const adjustFontSize = (delta: number) => {
    const newSize = Math.min(24, Math.max(12, settings.editorFontSize + delta));
    updateSettings({ editorFontSize: newSize });
  };

  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-group">
        <button disabled={disabled} onClick={() => wrapSelection(view, '**', '**', '加粗文本')} title="加粗 Markdown"><b>B</b></button>
        <button disabled={disabled} onClick={() => wrapSelection(view, '*', '*', '斜体文本')} title="斜体 Markdown"><i>I</i></button>
        <button disabled={disabled} onClick={() => wrapSelection(view, '~~', '~~', '删除线文本')} title="删除线 Markdown"><s>S</s></button>
        <span className="toolbar-sep" />
        <button disabled={disabled} title="一级标题" onClick={() => formatCurrentLines(view, 'h1')}>H1</button>
        <button disabled={disabled} title="二级标题" onClick={() => formatCurrentLines(view, 'h2')}>H2</button>
        <button disabled={disabled} title="三级标题" onClick={() => formatCurrentLines(view, 'h3')}>H3</button>
        <button disabled={disabled} title="引用" onClick={() => formatCurrentLines(view, 'quote')}>“</button>
        <button disabled={disabled} title="无序列表" onClick={() => formatCurrentLines(view, 'bullet')}>-</button>
        <button disabled={disabled} title="有序列表" onClick={() => formatCurrentLines(view, 'ordered')}>1.</button>
        <span className="toolbar-sep" />
        <button disabled={disabled} title="插入链接" onClick={() => wrapSelection(view, '[', '](https://)', '链接文字')}>链接</button>
        <button disabled={disabled} title="插入图片" onClick={() => replaceSelection(view, selected => `![${selected || '图片描述'}](图片地址)`)}>图片</button>
        <button disabled={disabled} title="插入分割线" onClick={() => insertBlock(view, '\n---\n')}>横线</button>
        <span className="toolbar-sep" />
        <button disabled={disabled} title="撤销" onClick={() => { if (view) undo(view); focusEditor(view); }}>↶</button>
        <button disabled={disabled} title="重做" onClick={() => { if (view) redo(view); focusEditor(view); }}>↷</button>
      </div>

      <div className="editor-toolbar-group">
        <button onClick={() => adjustFontSize(-1)} title="缩小字号">A-</button>
        <span className="toolbar-fontsize">{settings.editorFontSize}</span>
        <button onClick={() => adjustFontSize(1)} title="增大字号">A+</button>
      </div>
    </div>
  );
}
