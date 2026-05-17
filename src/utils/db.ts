// ---------- 存储适配器 ----------
// 内部使用 core/storage 工厂模块，对外保持原有 API 不变

import { createStorage, getStorage } from '../core/storage';
import type { IStorageProvider } from '../core/storage';

let provider: IStorageProvider | null = null;

export async function initDatabase(): Promise<boolean> {
  provider = await createStorage();
  return true;
}

function get(): IStorageProvider {
  if (!provider) throw new Error('Database not initialized. Call initDatabase() first.');
  return provider;
}

export function isBrowser(): boolean {
  return provider?.type === 'localstorage';
}

export function isTauriEnv(): boolean {
  return provider?.type === 'sqlite';
}

export async function getAll<T>(table: string, where?: string, params?: any[]): Promise<T[]> {
  return get().getAll<T>(table, where, params);
}

export async function getById<T>(table: string, id: string): Promise<T | null> {
  return get().getById<T>(table, id);
}

export async function insert(table: string, data: Record<string, any>): Promise<void> {
  return get().insert(table, data);
}

export async function update(table: string, id: string, data: Record<string, any>): Promise<void> {
  return get().update(table, id, data);
}

export async function remove(table: string, id: string): Promise<void> {
  return get().remove(table, id);
}

export async function removeWhere(table: string, where: string, params: any[]): Promise<void> {
  return get().removeWhere(table, where, params);
}

export async function getSetting(key: string): Promise<string | null> {
  return get().getSetting(key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  return get().setSetting(key, value);
}
