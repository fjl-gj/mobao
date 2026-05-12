import type { IFileSystem, NovelStructure, FileInfo } from './types';
import { invoke } from '@tauri-apps/api/core';

export class TauriFS implements IFileSystem {
  readonly type = 'tauri';

  private invoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    return invoke<T>(cmd, args);
  }

  async scanDirectory(path: string): Promise<NovelStructure> {
    return this.invoke<NovelStructure>('scan_novel_directory', { rootPath: path });
  }

  async readTextFile(path: string): Promise<string> {
    return this.invoke<string>('read_text_file', { path });
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    return this.invoke<void>('write_text_file', { path, content });
  }

  async createChapter(volumePath: string, fileName: string): Promise<string> {
    return this.invoke<string>('create_chapter', { volumePath, fileName });
  }

  async renameChapter(oldPath: string, newName: string): Promise<string> {
    return this.invoke<string>('rename_chapter', { oldPath, newName });
  }

  async deleteChapter(path: string): Promise<void> {
    return this.invoke<void>('delete_chapter', { path });
  }

  async createVolume(rootPath: string, volumeName: string): Promise<string> {
    return this.invoke<string>('create_volume', { rootPath, volumeName });
  }

  async renameVolume(volumePath: string, newName: string): Promise<string> {
    return this.invoke<string>('rename_volume', { volumePath, newName });
  }

  async deleteVolume(volumePath: string): Promise<void> {
    return this.invoke<void>('delete_volume', { volumePath });
  }

  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    return this.invoke<FileInfo[]>('list_directory', { dirPath });
  }
}
