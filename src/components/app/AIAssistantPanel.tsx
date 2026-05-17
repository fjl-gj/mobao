import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface AIAssistantPanelProps {
  chapterTitle?: string;
  wordCount: number;
}

const quickActions = ['续写本章', '润色选区', '提取大纲', '检查设定冲突'];

export default function AIAssistantPanel({ chapterTitle, wordCount }: AIAssistantPanelProps) {
  const { settings } = useSettings();
  const [mode, setMode] = useState<'chat' | 'edit'>('chat');
  const [input, setInput] = useState('');

  return (
    <div className="ai-panel">
      <div className="ai-mode-tabs">
        <button className={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')}>对话</button>
        <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>编辑</button>
      </div>

      <div className="ai-context-card">
        <span>当前上下文</span>
        <strong>{chapterTitle || '未选择章节'}</strong>
        <small>{wordCount} 字 · {settings.aiUseCurrentChapter ? '读取当前章节' : '不读取正文'}</small>
      </div>

      <div className="ai-context-options">
        <label>
          <input type="checkbox" checked={settings.aiUseCurrentChapter} readOnly />
          当前章节
        </label>
        <label>
          <input type="checkbox" checked={settings.aiUseWritingContext} readOnly />
          写作资料
        </label>
      </div>

      <div className="ai-quick-actions">
        {quickActions.map(action => (
          <button key={action} disabled={!settings.aiEnabled}>{action}</button>
        ))}
      </div>

      <div className="ai-chat-placeholder">
        {settings.aiEnabled ? (
          <p>AI 接口待接入。这里后续显示模型回复、编辑建议和插入/替换操作。</p>
        ) : (
          <p>在设置里启用 AI 后，这里会作为模型对话和 AI 编辑工作区。</p>
        )}
      </div>

      <div className="ai-input-row">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === 'chat' ? '和 AI 讨论剧情、人物或设定...' : '描述你希望 AI 如何改写当前内容...'}
          rows={3}
        />
        <button disabled={!settings.aiEnabled || !input.trim()}>发送</button>
      </div>
    </div>
  );
}
