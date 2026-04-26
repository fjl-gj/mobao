import { invoke } from '@tauri-apps/api/core';

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

const isTauri = !!(window as any).__TAURI__;

// ---------- 通用 invoke 封装 ----------

async function safeInvoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    throw new Error(`[文件系统] 浏览器模式不支持「${cmd}」操作。请使用 yarn tauri dev 启动桌面应用。`);
  }
  return invoke<T>(cmd, args);
}

// ---------- 公开 API ----------

export async function scanNovelDirectory(rootPath: string): Promise<NovelStructure> {
  return safeInvoke<NovelStructure>('scan_novel_directory', { rootPath });
}

export async function createChapter(rootPath: string, volumeRelativePath: string, fileName: string): Promise<string> {
  return safeInvoke<string>('create_chapter', { rootPath, volumeRelativePath, fileName });
}

export async function renameChapter(rootPath: string, oldRelativePath: string, newName: string): Promise<string> {
  return safeInvoke<string>('rename_chapter', { rootPath, oldRelativePath, newName });
}

export async function deleteChapter(rootPath: string, relativePath: string): Promise<void> {
  return safeInvoke<void>('delete_chapter', { rootPath, relativePath });
}

export async function createVolume(rootPath: string, volumeName: string): Promise<string> {
  return safeInvoke<string>('create_volume', { rootPath, volumeName });
}

export async function renameVolume(rootPath: string, volumeRelativePath: string, newName: string): Promise<string> {
  return safeInvoke<string>('rename_volume', { rootPath, volumeRelativePath, newName });
}

export async function deleteVolume(rootPath: string, volumeRelativePath: string): Promise<void> {
  return safeInvoke<void>('delete_volume', { rootPath, volumeRelativePath });
}

export async function readTextFile(rootPath: string, relativePath: string): Promise<string> {
  return safeInvoke<string>('read_text_file', { rootPath, relativePath });
}

export async function writeTextFile(rootPath: string, relativePath: string, content: string): Promise<void> {
  return safeInvoke<void>('write_text_file', { rootPath, relativePath, content });
}

export async function listDirectory(rootPath: string, relativePath = ''): Promise<FileInfo[]> {
  return safeInvoke<FileInfo[]>('list_directory', { rootPath, relativePath });
}
