import type { IFileSystem, NovelStructure, FileInfo } from './types';
import { invoke } from '@tauri-apps/api/core';

export class TauriFS implements IFileSystem {
  readonly type = 'tauri';

  private invoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    return invoke<T>(cmd, args);
  }

  private splitPath(path: string): { rootPath: string; relativePath: string } {
    const normalized = path.replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    if (idx < 0) return { rootPath: '.', relativePath: normalized };
    return {
      rootPath: normalized.slice(0, idx) || '/',
      relativePath: normalized.slice(idx + 1),
    };
  }

  async scanDirectory(path: string): Promise<NovelStructure> {
    return this.invoke<NovelStructure>('scan_novel_directory', { rootPath: path });
  }

  async readTextFile(path: string): Promise<string> {
    return this.invoke<string>('read_text_file', this.splitPath(path));
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    return this.invoke<void>('write_text_file', { ...this.splitPath(path), content });
  }

  async createChapter(volumePath: string, fileName: string): Promise<string> {
    return this.invoke<string>('create_chapter', { rootPath: volumePath, volumeRelativePath: '', fileName });
  }

  async renameChapter(oldPath: string, newName: string): Promise<string> {
    const { rootPath, relativePath } = this.splitPath(oldPath);
    return this.invoke<string>('rename_chapter', { rootPath, oldRelativePath: relativePath, newName });
  }

  async deleteChapter(path: string): Promise<void> {
    const { rootPath, relativePath } = this.splitPath(path);
    return this.invoke<void>('delete_chapter', { rootPath, relativePath });
  }

  async createVolume(rootPath: string, volumeName: string): Promise<string> {
    return this.invoke<string>('create_volume', { rootPath, volumeName });
  }

  async renameVolume(volumePath: string, newName: string): Promise<string> {
    const { rootPath, relativePath } = this.splitPath(volumePath);
    return this.invoke<string>('rename_volume', { rootPath, volumeRelativePath: relativePath, newName });
  }

  async deleteVolume(volumePath: string): Promise<void> {
    const { rootPath, relativePath } = this.splitPath(volumePath);
    return this.invoke<void>('delete_volume', { rootPath, volumeRelativePath: relativePath });
  }

  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    return this.invoke<FileInfo[]>('list_directory', { rootPath: dirPath, relativePath: '' });
  }
}
