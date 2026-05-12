// ---------- 存储提供者接口 ----------

export interface IStorageProvider {
  readonly type: string;
  readonly mode: 'persistent' | 'session';
  init(): Promise<void>;
  getAll<T>(table: string, where?: string, params?: any[]): Promise<T[]>;
  getById<T>(table: string, id: string): Promise<T | null>;
  insert(table: string, data: Record<string, any>): Promise<void>;
  update(table: string, id: string, data: Record<string, any>): Promise<void>;
  remove(table: string, id: string): Promise<void>;
  removeWhere(table: string, where: string, params: any[]): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

// 表结构类型
export const STORAGE_TABLES = [
  'series',
  'novels',
  'characters',
  'character_relations',
  'world_entries',
  'timeline_events',
  'plot_threads',
  'plot_chapter_links',
  'chapter_notes',
  'user_settings',
] as const;

export type StorageTable = typeof STORAGE_TABLES[number];
