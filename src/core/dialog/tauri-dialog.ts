import type { DirectoryPickPurpose, DirectoryPickResult, IDialog } from './types';

export class TauriDialog implements IDialog {
  readonly type = 'tauri';

  async pickDirectory(title = '选择文件夹', _purpose: DirectoryPickPurpose = 'import'): Promise<DirectoryPickResult | null> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const path = await open({ directory: true, title });
      if (!path || Array.isArray(path)) return null;
      return {
        source: 'native',
        path,
        name: path.split(/[/\\]/).pop() || path,
      };
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
