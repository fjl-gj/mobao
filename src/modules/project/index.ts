// ---------- 项目管理模块 ----------
// 集合(Series) / 小说(Novel) 的 CRUD、导入、层级树

export { ProjectProvider, ProjectContext } from '../../contexts/ProjectContext';
export type { Series, Novel } from '../../contexts/ProjectContext';

export { default as ProjectExplorer } from '../../components/project/ProjectExplorer';
export { default as NovelDialog } from '../../components/project/NovelDialog';
