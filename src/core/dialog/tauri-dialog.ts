import type { IDialog } from './types';

export class TauriDialog implements IDialog {
  readonly type = 'tauri';

  async pickDirectory(title = '选择文件夹'): Promise<string | null> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      return await open({ directory: true, title }) || null;
    } catch { return null; }
  }

  async pickFile(extensions?: string[]): Promise<string | null> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        filters: extensions ? [{ name: '文件', extensions }] : [],
      });
      return result as string | null;
    } catch { return null; }
  }
}
