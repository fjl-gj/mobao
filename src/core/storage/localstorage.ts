import type { IStorageProvider } from './types';

const STORAGE_PREFIX = 'inklery_v1_';

export class LocalStorageProvider implements IStorageProvider {
  readonly type = 'localstorage';
  readonly mode = 'persistent' as const;

  async init(): Promise<void> {
    // 无需初始化
  }

  private _get<T>(table: string): T[] {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + table);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private _set(table: string, data: any[]) {
    try { localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(data)); }
    catch (e) { console.warn('[LS] write failed', e); }
  }

  async getAll<T>(table: string, where?: string, params?: any[]): Promise<T[]> {
    if (where) {
      const match = where.match(/^(\w+)\s*=\s*\?$/);
      if (match) {
        return this._get<any[]>(table).filter((r: any) => r[match[1]] === params?.[0]) as T[];
      }
    }
    return this._get(table) as T[];
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    return (this._get<any[]>(table).find((r: any) => r.id === id) as T) || null;
  }

  async insert(table: string, data: Record<string, any>): Promise<void> {
    const list: any[] = this._get(table);
    list.push(data);
    this._set(table, list);
  }

  async update(table: string, id: string, data: Record<string, any>): Promise<void> {
    const list: any[] = this._get(table);
    const idx = list.findIndex((r: any) => r.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
      this._set(table, list);
    }
  }

  async remove(table: string, id: string): Promise<void> {
    this._set(table, this._get<any[]>(table).filter((r: any) => r.id !== id));
  }

  async removeWhere(table: string, where: string, params: any[]): Promise<void> {
    const match = where.match(/^(\w+)\s*=\s*\?$/);
    if (match) {
      this._set(table, this._get<any[]>(table).filter((r: any) => r[match[1]] !== params[0]));
    }
  }

  async getSetting(key: string): Promise<string | null> {
    return localStorage.getItem(STORAGE_PREFIX + 'setting_' + key);
  }

  async setSetting(key: string, value: string): Promise<void> {
    localStorage.setItem(STORAGE_PREFIX + 'setting_' + key, value);
  }
}
