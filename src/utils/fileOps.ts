// ---------- 文件系统适配器 ----------
// 内部使用 core/fs 工厂模块，对外保持原有 API 不变

import { createFS, getFS } from '../core/fs';
import type { IFileSystem, NovelStructure, ChapterEntry, VolumeEntry, FileInfo } from '../core/fs';

let fs: IFileSystem | null = null;

async function ensure(): Promise<IFileSystem> {
  if (!fs) fs = await createFS();
  return fs;
}

export type { NovelStructure, ChapterEntry, VolumeEntry, FileInfo };

export async function scanNovelDirectory(rootPath: string): Promise<NovelStructure> {
  return (await ensure()).scanDirectory(rootPath);
}

export async function createChapter(volumePath: string, fileName: string): Promise<string> {
  return (await ensure()).createChapter(volumePath, fileName);
}

export async function renameChapter(oldPath: string, newName: string): Promise<string> {
  return (await ensure()).renameChapter(oldPath, newName);
}

export async function deleteChapter(path: string): Promise<void> {
  return (await ensure()).deleteChapter(path);
}

export async function createVolume(rootPath: string, volumeName: string): Promise<string> {
  return (await ensure()).createVolume(rootPath, volumeName);
}

export async function renameVolume(volumePath: string, newName: string): Promise<string> {
  return (await ensure()).renameVolume(volumePath, newName);
}

export async function deleteVolume(volumePath: string): Promise<void> {
  return (await ensure()).deleteVolume(volumePath);
}

export async function readTextFile(path: string): Promise<string> {
  return (await ensure()).readTextFile(path);
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  return (await ensure()).writeTextFile(path, content);
}

export async function listDirectory(dirPath: string): Promise<FileInfo[]> {
  return (await ensure()).listDirectory(dirPath);
}
