import type { DirectoryPickPurpose, DirectoryPickResult, IDialog } from './types';

export class BrowserDialog implements IDialog {
  readonly type = 'browser';

  pickDirectory(title = '选择文件夹', purpose: DirectoryPickPurpose = 'import'): Promise<DirectoryPickResult | null> {
    if (purpose === 'storage') {
      return Promise.resolve({
        source: 'browser-storage',
        path: 'browser://storage',
        name: '浏览器本地存储',
      });
    }

    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.style.display = 'none';
      document.body.appendChild(input);

      const cleanup = () => {
        try { document.body.removeChild(input); } catch {}
      };

      input.addEventListener('change', () => {
        cleanup();
        if (input.files && input.files.length > 0) {
          const firstPath = (input.files[0] as any).webkitRelativePath;
          const name = firstPath ? firstPath.split('/')[0] : title;
          resolve({
            source: 'browser-upload',
            path: name,
            name,
            files: Array.from(input.files),
          });
        } else {
          resolve(null);
        }
      });

      input.addEventListener('cancel', () => {
        cleanup();
        resolve(null);
      });

      input.click();
    });
  }

  async pickFile(extensions?: string[]): Promise<string | null> {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      if (extensions) input.accept = extensions.map(e => `.${e}`).join(',');
      input.style.display = 'none';
      document.body.appendChild(input);

      const cleanup = () => {
        try { document.body.removeChild(input); } catch {}
      };

      input.addEventListener('change', () => {
        cleanup();
        resolve(input.files?.[0]?.name || null);
      });

      input.addEventListener('cancel', () => {
        cleanup();
        resolve(null);
      });

      input.click();
    });
  }
}
