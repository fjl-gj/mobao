// ---------- 创作工具箱模块 ----------
// 人物 / 世界观 / 时间线 / 情节线索 / 大纲 / 章节备注

export { WritingToolsProvider, WritingToolsContext } from '../../contexts/WritingToolsContext';
export type { Character, WorldEntry, TimelineEvent, PlotThread, ChapterNote } from '../../contexts/WritingToolsContext';

export { default as CharactersPanel } from '../../components/tools/CharactersPanel';
export { default as WorldPanel } from '../../components/tools/WorldPanel';
export { default as TimelinePanel } from '../../components/tools/TimelinePanel';
export { default as PlotPanel } from '../../components/tools/PlotPanel';
export { default as Outline } from '../../components/tools/Outline';
