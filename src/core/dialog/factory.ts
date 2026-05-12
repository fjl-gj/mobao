import type { IDialog } from './types';
import { isTauri } from '../platform';

let instance: IDialog | null = null;

export async function createDialog(): Promise<IDialog> {
  if (instance) return instance;

  if (isTauri) {
    const { TauriDialog } = await import('./tauri-dialog');
    instance = new TauriDialog();
  } else {
    const { BrowserDialog } = await import('./browser-dialog');
    instance = new BrowserDialog();
  }

  return instance;
}

export function getDialog(): IDialog {
  if (!instance) throw new Error('Dialog not initialized. Call createDialog() first.');
  return instance;
}
