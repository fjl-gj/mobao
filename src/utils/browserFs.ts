// ---------- 浏览器模式：文件夹选择 & 目录扫描 ----------

import type { NovelStructure, ChapterEntry } from '../core/fs';

function isMdOrTxt(name: string) {
  return /\.(md|txt)$/i.test(name);
}

function isPrologue(name: string) {
  const base = name.replace(/\.(md|txt)$/i, '');
  return /^(小序|序章|楔子|prologue)$/i.test(base);
}

/** 排序函数：自然排序 */
function naturalSort(a: string, b: string) {
  return a.localeCompare(b, 'zh-CN', { numeric: true });
}

// ---------- API 1: showDirectoryPicker (Chrome/Edge/Opera) ----------

async function pickWithShowPicker(): Promise<NovelStructure | null> {
  if (typeof (window as any).showDirectoryPicker !== 'function') return null;

  try {
    const rootHandle = await (window as any).showDirectoryPicker();

    const structure: NovelStructure = {
      mode: 'flat',
      prologue: null,
      volumes: [],
      root_chapters: [],
    };

    const entries: { name: string; kind: string; handle: any }[] = [];
    for await (const entry of rootHandle.values()) {
      entries.push(entry);
    }
    entries.sort((a, b) => naturalSort(a.name, b.name));

    const subdirs = entries.filter(e => e.kind === 'directory' && !e.name.startsWith('.'));

    if (subdirs.length > 0) {
      // 有分卷模式
      structure.mode = 'volume';

      for (const dir of subdirs) {
        const chapters: ChapterEntry[] = [];
        const dirEntries: any[] = [];
        for await (const e of dir.handle.values()) {
          dirEntries.push(e);
        }
        dirEntries.sort((a, b) => naturalSort(a.name, b.name));

        for (const file of dirEntries) {
          if (file.kind === 'file' && isMdOrTxt(file.name)) {
            chapters.push({
              name: file.name,
              relative_path: `${dir.name}/${file.name}`,
            });
          }
        }

        structure.volumes.push({ name: dir.name, chapters });
      }
    }

    // 根目录文件
    const rootFiles = entries.filter(e => e.kind === 'file' && isMdOrTxt(e.name));
    for (const file of rootFiles) {
      if (isPrologue(file.name)) {
        structure.prologue = { name: file.name, relative_path: file.name };
      } else if (subdirs.length === 0) {
        structure.root_chapters.push({ name: file.name, relative_path: file.name });
      }
    }

    // 扁平模式默认标题
    if (structure.volumes.length === 0 && structure.root_chapters.length === 0 && !structure.prologue) {
      return null;
    }

    return structure;
  } catch (e: any) {
    if (e.name === 'AbortError' || e.message?.includes('abort')) return null;
    throw e;
  }
}

// ---------- API 2: webkitdirectory input (所有浏览器) ----------

function pickWithWebkitDir(): Promise<NovelStructure | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', () => {
      document.body.removeChild(input);
      const files = input.files;
      if (!files || files.length === 0) { resolve(null); return; }

      // 用 Map 重建目录结构
      const dirMap = new Map<string, string[]>();
      for (const file of files) {
        const relPath = (file as any).webkitRelativePath as string;
        if (!relPath || !isMdOrTxt(file.name)) continue;
        const parts = relPath.split('/');
        if (parts.length >= 2) {
          const dirName = parts[0];
          if (dirName.startsWith('.')) continue;
          if (!dirMap.has(dirName)) dirMap.set(dirName, []);
          dirMap.get(dirName)!.push(relPath);
        }
      }

      const structure: NovelStructure = {
        mode: 'flat',
        prologue: null,
        volumes: [],
        root_chapters: [],
      };

      const dirNames = [...dirMap.keys()].sort(naturalSort);

      if (dirNames.length > 0) {
        // 判断是否为分卷模式：至少有一个目录包含文本文件
        const hasVolumes = dirNames.some(d => dirMap.get(d)!.length > 0 && !d.startsWith('.'));

        if (hasVolumes) {
          structure.mode = 'volume';
          for (const dirName of dirNames) {
            const paths = dirMap.get(dirName)!.sort(naturalSort);
            const chapters: ChapterEntry[] = [];
            for (const relPath of paths) {
              const fileName = relPath.split('/').pop()!;
              if (isPrologue(fileName)) {
                structure.prologue = { name: fileName, relative_path: relPath };
              } else {
                chapters.push({ name: fileName, relative_path: relPath });
              }
            }
            if (chapters.length > 0) {
              structure.volumes.push({ name: dirName, chapters });
            }
          }
        } else {
          // 扁平：所有文件直接到 root_chapters
          for (const dirName of dirNames) {
            for (const relPath of dirMap.get(dirName)!) {
              const fileName = relPath.split('/').pop()!;
              if (isPrologue(fileName)) {
                structure.prologue = { name: fileName, relative_path: relPath };
              } else {
                structure.root_chapters.push({ name: fileName, relative_path: relPath });
              }
            }
          }
        }
      }

      if (structure.volumes.length === 0 && structure.root_chapters.length === 0 && !structure.prologue) {
        resolve(null);
        return;
      }

      resolve(structure);
    });

    input.addEventListener('cancel', () => {
      document.body.removeChild(input);
      resolve(null);
    });

    input.click();
  });
}

export function scanBrowserFiles(files: File[]): { rootName: string; structure: NovelStructure } | null {
  if (files.length === 0) return null;

  const firstPath = (files[0] as any).webkitRelativePath as string | undefined;
  const rootName = firstPath ? firstPath.split('/')[0] : '导入作品';
  const dirMap = new Map<string, string[]>();
  const rootFiles: string[] = [];

  for (const file of files) {
    if (!isMdOrTxt(file.name)) continue;
    const relPath = ((file as any).webkitRelativePath as string | undefined) || file.name;
    const parts = relPath.split('/').filter(Boolean);
    const withoutRoot = parts[0] === rootName ? parts.slice(1) : parts;
    if (withoutRoot.length > 1) {
      const dirName = withoutRoot[0];
      if (dirName.startsWith('.')) continue;
      const chapterPath = withoutRoot.join('/');
      if (!dirMap.has(dirName)) dirMap.set(dirName, []);
      dirMap.get(dirName)!.push(chapterPath);
    } else {
      rootFiles.push(withoutRoot[0] || file.name);
    }
  }

  const structure: NovelStructure = {
    mode: 'flat',
    prologue: null,
    volumes: [],
    root_chapters: [],
  };

  const dirNames = [...dirMap.keys()].sort(naturalSort);
  if (dirNames.length > 0) {
    structure.mode = 'volume';
    for (const dirName of dirNames) {
      const chapters: ChapterEntry[] = [];
      for (const relPath of dirMap.get(dirName)!.sort(naturalSort)) {
        const fileName = relPath.split('/').pop()!;
        if (isPrologue(fileName)) {
          structure.prologue = { name: fileName, relative_path: relPath };
        } else {
          chapters.push({ name: fileName, relative_path: relPath });
        }
      }
      if (chapters.length > 0) structure.volumes.push({ name: dirName, chapters });
    }
  } else {
    for (const relPath of rootFiles.sort(naturalSort)) {
      const fileName = relPath.split('/').pop()!;
      if (isPrologue(fileName)) {
        structure.prologue = { name: fileName, relative_path: relPath };
      } else {
        structure.root_chapters.push({ name: fileName, relative_path: relPath });
      }
    }
  }

  if (structure.volumes.length === 0 && structure.root_chapters.length === 0 && !structure.prologue) return null;
  return { rootName, structure };
}

// ---------- 统一入口 ----------

export async function pickAndScanDirectory(): Promise<{ rootName: string; structure: NovelStructure } | null> {
  // 优先使用 showDirectoryPicker
  let structure = await pickWithShowPicker();
  let rootName = '导入作品';

  if (!structure) {
    structure = await pickWithWebkitDir();
  }

  if (!structure) return null;

  return { rootName, structure };
}
