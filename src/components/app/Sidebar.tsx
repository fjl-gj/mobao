import { useState } from 'react';
import Tree from '../editor/Tree';
import Outline from '../tools/Outline';
import ProjectExplorer from '../project/ProjectExplorer';
import CharactersPanel from '../tools/CharactersPanel';
import WorldPanel from '../tools/WorldPanel';
import TimelinePanel from '../tools/TimelinePanel';
import PlotPanel from '../tools/PlotPanel';
import { useResponsiveCtx } from '../../contexts/ResponsiveContext';

type SidebarTab = 'project' | 'toc' | 'outline' | 'characters' | 'world' | 'timeline' | 'plot';

const tabs: { key: SidebarTab; label: string }[] = [
  { key: 'project', label: '项目' },
  { key: 'toc', label: '目录' },
  { key: 'outline', label: '大纲' },
  { key: 'characters', label: '人物' },
  { key: 'world', label: '世界' },
  { key: 'timeline', label: '时间' },
  { key: 'plot', label: '线索' },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<SidebarTab>('project');
  const { isMobile } = useResponsiveCtx();

  const renderPanel = () => {
    switch (tab) {
      case 'project': return <ProjectExplorer onSelectNovel={isMobile ? onClose : undefined} />;
      case 'toc': return <Tree onSelect={isMobile ? onClose : undefined} />;
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
          {tabs.map(item => (
            <button
              key={item.key}
              className={tab === item.key ? 'active' : ''}
              onClick={() => setTab(item.key)}
              title={item.label}
            >
              {item.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button className="sidebar-close" onClick={onClose} title="关闭侧边栏">
            关闭
          </button>
        )}
      </div>
      <div className="sidebar-body">
        {renderPanel()}
      </div>
    </div>
  );
}
