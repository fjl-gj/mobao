import type { IFileSystem, NovelStructure, FileInfo } from './types';

function isMdOrTxt(name: string) { return /\.(md|txt)$/i.test(name); }
function isPrologue(name: string) {
  return /^(小序|序章|楔子|prologue)/i.test(name.replace(/\.(md|txt)$/i, ''));
}
function naturalSort(a: string, b: string) { return a.localeCompare(b, 'zh-CN', { numeric: true }); }

function throwBrowserErr(op: string): never {
  throw new Error(`[FS] 浏览器模式不支持 ${op}。请使用 npm run tauri dev。`);
}

export class BrowserFS implements IFileSystem {
  readonly type = 'browser';

  async scanDirectory(_path: string): Promise<NovelStructure> {
    throwBrowserErr('scanDirectory');
  }

  async readTextFile(_path: string): Promise<string> {
    throwBrowserErr('readTextFile');
  }

  async writeTextFile(_path: string, _content: string): Promise<void> {
    throwBrowserErr('writeTextFile');
  }

  async createChapter(_vp: string, _fn: string): Promise<string> { throwBrowserErr('createChapter'); }
  async renameChapter(_op: string, _nn: string): Promise<string> { throwBrowserErr('renameChapter'); }
  async deleteChapter(_path: string): Promise<void> { throwBrowserErr('deleteChapter'); }
  async createVolume(_rp: string, _vn: string): Promise<string> { throwBrowserErr('createVolume'); }
  async renameVolume(_vp: string, _nn: string): Promise<string> { throwBrowserErr('renameVolume'); }
  async deleteVolume(_vp: string): Promise<void> { throwBrowserErr('deleteVolume'); }
  async listDirectory(_dp: string): Promise<FileInfo[]> { throwBrowserErr('listDirectory'); }
}
