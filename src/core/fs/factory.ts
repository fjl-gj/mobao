import type { IFileSystem } from './types';
import { isTauri } from '../platform';

let instance: IFileSystem | null = null;

export async function createFS(): Promise<IFileSystem> {
  if (instance) return instance;

  if (isTauri) {
    const { TauriFS } = await import('./tauri-fs');
    instance = new TauriFS();
  } else {
    const { BrowserFS } = await import('./browser-fs');
    instance = new BrowserFS();
  }

  return instance;
}

export function getFS(): IFileSystem {
  if (!instance) throw new Error('FS not initialized. Call createFS() first.');
  return instance;
}
