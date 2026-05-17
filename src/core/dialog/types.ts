// ---------- 对话框接口 ----------

export type DirectoryPickPurpose = 'storage' | 'import';
export type DirectoryPickSource = 'native' | 'browser-upload' | 'browser-storage';

export interface DirectoryPickResult {
  source: DirectoryPickSource;
  path: string;
  name: string;
  files?: File[];
}

export interface IDialog {
  readonly type: string;
  pickDirectory(title?: string, purpose?: DirectoryPickPurpose): Promise<DirectoryPickResult | null>;
  pickFile(extensions?: string[]): Promise<string | null>;
}

export interface DirectoryScanResult {
  rootName: string;
  structure: import('../fs/types').NovelStructure;
}
