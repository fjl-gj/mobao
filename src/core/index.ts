// ---------- 基础设施层统一入口 ----------

export { platform, isTauri, runtime, isMobilePlatform } from './platform';
export type { Platform, Runtime } from './platform';

// 存储模块
export { createStorage, getStorage } from './storage';
export type { IStorageProvider } from './storage';

// 文件系统模块
export { createFS, getFS } from './fs';
export type { IFileSystem, NovelStructure, ChapterEntry, VolumeEntry, FileInfo } from './fs';

// 对话框模块
export { createDialog, getDialog } from './dialog';
export type { IDialog, DirectoryScanResult } from './dialog';
