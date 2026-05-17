// ---------- 文件系统接口 ----------

export interface ChapterEntry {
  name: string;
  relative_path: string;
}

export interface VolumeEntry {
  name: string;
  chapters: ChapterEntry[];
}

export interface NovelStructure {
  mode: 'volume' | 'flat';
  prologue: ChapterEntry | null;
  volumes: VolumeEntry[];
  root_chapters: ChapterEntry[];
}

export interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

export interface IFileSystem {
  readonly type: string;
  scanDirectory(path: string): Promise<NovelStructure>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
  createChapter(volumePath: string, fileName: string): Promise<string>;
  renameChapter(oldPath: string, newName: string): Promise<string>;
  deleteChapter(path: string): Promise<void>;
  createVolume(rootPath: string, volumeName: string): Promise<string>;
  renameVolume(volumePath: string, newName: string): Promise<string>;
  deleteVolume(volumePath: string): Promise<void>;
  listDirectory(dirPath: string): Promise<FileInfo[]>;
}
