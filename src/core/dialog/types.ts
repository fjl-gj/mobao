// ---------- 对话框接口 ----------

export interface IDialog {
  readonly type: string;
  pickDirectory(title?: string): Promise<string | null>;
  pickFile(extensions?: string[]): Promise<string | null>;
}

export interface DirectoryScanResult {
  rootName: string;
  structure: import('../fs/types').NovelStructure;
}
