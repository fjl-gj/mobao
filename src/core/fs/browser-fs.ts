import type { IFileSystem, NovelStructure, FileInfo } from './types';

function isMdOrTxt(name: string) { return /\.(md|txt)$/i.test(name); }
function isPrologue(name: string) {
  return /^(小序|序章|楔子|prologue)/i.test(name.replace(/\.(md|txt)$/i, ''));
}
function naturalSort(a: string, b: string) { return a.localeCompare(b, 'zh-CN', { numeric: true }); }

const STORAGE_PREFIX = 'mobao_browser_fs_';
const directoryFiles = new Map<string, File[]>();

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function splitRoot(path: string): { root: string; rel: string } {
  const normalized = normalizePath(path);
  const storagePrefix = 'browser:/storage/';
  if (normalized.startsWith(storagePrefix)) {
    const rest = normalized.slice(storagePrefix.length);
    const parts = rest.split('/');
    return {
      root: `${storagePrefix}${parts[0]}`,
      rel: parts.slice(1).join('/'),
    };
  }
  const firstSlash = normalized.indexOf('/');
  if (firstSlash < 0) return { root: normalized, rel: '' };
  return { root: normalized.slice(0, firstSlash), rel: normalized.slice(firstSlash + 1) };
}

function storageKey(path: string): string {
  return STORAGE_PREFIX + normalizePath(path);
}

function indexKey(root: string): string {
  return STORAGE_PREFIX + 'index_' + normalizePath(root);
}

function getIndex(root: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(indexKey(root)) || '[]');
  } catch {
    return [];
  }
}

function setIndex(root: string, paths: string[]) {
  localStorage.setItem(indexKey(root), JSON.stringify([...new Set(paths)].sort(naturalSort)));
}

function addToIndex(path: string) {
  const { root, rel } = splitRoot(path);
  if (!rel) return;
  setIndex(root, [...getIndex(root), rel]);
}

function buildStructure(paths: string[]): NovelStructure {
  const structure: NovelStructure = { mode: 'flat', prologue: null, volumes: [], root_chapters: [] };
  const textPaths = paths.filter(isMdOrTxt).sort(naturalSort);
  const hasVolume = textPaths.some(path => path.includes('/'));

  if (hasVolume) {
    structure.mode = 'volume';
    const volumeMap = new Map<string, string[]>();
    for (const relPath of textPaths) {
      const parts = relPath.split('/');
      const fileName = parts.pop() || relPath;
      const volumeName = parts[0] || '文稿';
      if (isPrologue(fileName)) {
        structure.prologue = { name: fileName, relative_path: relPath };
        continue;
      }
      if (!volumeMap.has(volumeName)) volumeMap.set(volumeName, []);
      volumeMap.get(volumeName)!.push(relPath);
    }
    for (const [name, chapterPaths] of [...volumeMap.entries()].sort(([a], [b]) => naturalSort(a, b))) {
      structure.volumes.push({
        name,
        chapters: chapterPaths.sort(naturalSort).map(relative_path => ({
          name: relative_path.split('/').pop() || relative_path,
          relative_path,
        })),
      });
    }
  } else {
    for (const relPath of textPaths) {
      const name = relPath.split('/').pop() || relPath;
      if (isPrologue(name)) {
        structure.prologue = { name, relative_path: relPath };
      } else {
        structure.root_chapters.push({ name, relative_path: relPath });
      }
    }
  }

  return structure;
}

function getFileRelativePath(rootPath: string, file: File): string {
  const raw = ((file as any).webkitRelativePath as string | undefined) || file.name;
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === rootPath) return parts.slice(1).join('/');
  return parts.length > 1 ? parts.slice(1).join('/') : parts.join('/');
}

export async function registerBrowserDirectory(rootPath: string, files: File[]) {
  const normalized = normalizePath(rootPath);
  directoryFiles.set(normalized, files);
  const paths: string[] = [];

  for (const file of files) {
    if (!isMdOrTxt(file.name)) continue;
    const rel = getFileRelativePath(normalized, file);
    paths.push(rel);
  }

  setIndex(normalized, paths);
}

export class BrowserFS implements IFileSystem {
  readonly type = 'browser';

  async scanDirectory(path: string): Promise<NovelStructure> {
    const normalized = normalizePath(path);
    const files = directoryFiles.get(normalized);
    if (files) {
      return buildStructure(files.map(file => getFileRelativePath(normalized, file)));
    }

    const storedPaths = getIndex(normalized);
    return buildStructure(storedPaths);
  }

  async readTextFile(path: string): Promise<string> {
    const normalized = normalizePath(path);
    const { root, rel } = splitRoot(normalized);
    const files = directoryFiles.get(root);
    if (files) {
      const file = files.find(item => getFileRelativePath(root, item) === rel);
      if (file) return await file.text();
    }

    const stored = localStorage.getItem(storageKey(normalized));
    if (stored !== null) return stored;
    throw new Error('浏览器工作区中未找到该文件');
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const normalized = normalizePath(path);
    localStorage.setItem(storageKey(normalized), content);
    addToIndex(normalized);
  }

  async createChapter(volumePath: string, fileName: string): Promise<string> {
    const filePath = `${normalizePath(volumePath)}/${fileName.replace(/\.md$/i, '')}.md`;
    await this.writeTextFile(filePath, `# ${fileName}\n\n`);
    return filePath;
  }

  async renameChapter(oldPath: string, newName: string): Promise<string> {
    const oldNormalized = normalizePath(oldPath);
    const content = await this.readTextFile(oldNormalized);
    const { root, rel } = splitRoot(oldNormalized);
    const parent = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    const nextRel = `${parent ? `${parent}/` : ''}${newName.replace(/\.md$/i, '')}.md`;
    const nextPath = `${root}/${nextRel}`;
    await this.writeTextFile(nextPath, content);
    await this.deleteChapter(oldNormalized);
    return nextPath;
  }

  async deleteChapter(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const { root, rel } = splitRoot(normalized);
    localStorage.removeItem(storageKey(normalized));
    setIndex(root, getIndex(root).filter(item => item !== rel));
  }

  async createVolume(rootPath: string, volumeName: string): Promise<string> {
    const root = normalizePath(rootPath);
    if (!volumeName.trim()) {
      setIndex(root, getIndex(root));
      return root;
    }
    return `${root}/${volumeName.trim()}`;
  }

  async renameVolume(volumePath: string, newName: string): Promise<string> {
    const normalized = normalizePath(volumePath);
    const { root, rel } = splitRoot(normalized);
    const oldPrefix = rel ? `${rel}/` : '';
    const nextPrefix = `${newName.trim()}/`;
    const paths = getIndex(root);
    setIndex(root, paths.map(path => path.startsWith(oldPrefix) ? `${nextPrefix}${path.slice(oldPrefix.length)}` : path));
    return `${root}/${newName.trim()}`;
  }

  async deleteVolume(volumePath: string): Promise<void> {
    const normalized = normalizePath(volumePath);
    const { root, rel } = splitRoot(normalized);
    const prefix = rel ? `${rel}/` : '';
    const paths = getIndex(root);
    for (const path of paths.filter(item => item.startsWith(prefix))) {
      localStorage.removeItem(storageKey(`${root}/${path}`));
    }
    setIndex(root, paths.filter(item => !item.startsWith(prefix)));
  }

  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    const normalized = normalizePath(dirPath);
    const structure = await this.scanDirectory(normalized);
    return [
      ...structure.volumes.map(volume => ({ name: volume.name, path: `${normalized}/${volume.name}`, is_dir: true, size: 0 })),
      ...structure.root_chapters.map(chapter => ({ name: chapter.name, path: `${normalized}/${chapter.relative_path}`, is_dir: false, size: 0 })),
    ];
  }
}
