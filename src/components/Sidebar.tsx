import { useState } from 'react';
import Tree from './Tree';
import Outline from './Outline';
import SeriesPanel from './SeriesPanel';
import NovelsPanel from './NovelsPanel';
import CharactersPanel from './CharactersPanel';
import WorldPanel from './WorldPanel';
import TimelinePanel from './TimelinePanel';
import PlotPanel from './PlotPanel';
import { useResponsiveCtx } from '../contexts/ResponsiveContext';

type SidebarTab = 'series' | 'novels' | 'toc' | 'outline' | 'characters' | 'world' | 'timeline' | 'plot';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<SidebarTab>('series');
  const { isMobile } = useResponsiveCtx();

  const tabs: { key: SidebarTab; label: string }[] = [
    { key: 'series', label: '📚 项目' },
    { key: 'novels', label: '📖 小说' },
    { key: 'toc', label: '📑 目录' },
    { key: 'outline', label: '🧭 大纲' },
    { key: 'characters', label: '👤 人物' },
    { key: 'world', label: '🌍 世界' },
    { key: 'timeline', label: '⏳ 时间' },
    { key: 'plot', label: '🧵 线索' },
  ];

  const renderPanel = () => {
    switch (tab) {
      case 'series': return <SeriesPanel onSelectNovel={onClose} />;
      case 'novels': return <NovelsPanel onSelectNovel={onClose} />;
      case 'toc': return <Tree onSelect={onClose} />;
      case 'outline': return <Outline />;
      case 'characters': return <CharactersPanel />;
      case 'world': return <WorldPanel />;
      case 'timeline': return <TimelinePanel />;
      case 'plot': return <PlotPanel />;
    }
  };

  return (
    <div className={`sidebar ${isMobile ? 'sidebar-mobile' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-tabs">
          {tabs.map(t => (
            <button key={t.key} className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)} title={t.label}>
              {t.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button className="sidebar-close" onClick={onClose}>✕</button>
        )}
      </div>
      <div className="sidebar-body">
        {renderPanel()}
      </div>
    </div>
  );
}
