import type { IStorageProvider } from './types';
import { isTauri } from '../platform';

let instance: IStorageProvider | null = null;

export async function createStorage(): Promise<IStorageProvider> {
  if (instance) return instance;

  if (isTauri) {
    const { SqliteProvider } = await import('./sqlite');
    instance = new SqliteProvider();
  } else {
    const { LocalStorageProvider } = await import('./localstorage');
    instance = new LocalStorageProvider();
  }

  await instance.init();
  return instance;
}

export function getStorage(): IStorageProvider {
  if (!instance) throw new Error('Storage not initialized. Call createStorage() first.');
  return instance;
}
