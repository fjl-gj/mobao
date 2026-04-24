import { marked } from "marked";
import mammoth from "mammoth";
import { generateId, escapeHTML } from "./helpers";
import type { Volume, Chapter } from "../contexts/NovelContext";

/**
 * 将 Markdown 文本解析为卷与章节结构
 * # 一级标题 → 卷
 * ## 二级标题 → 章节
 */
export function parseMarkdownToVolumes(mdText: string): Volume[] {
  const lines = mdText.split("\n");
  const volumes: Volume[] = [];
  let currentVol: Volume | null = null;
  let currentChapter: Chapter | null = null;
  let chapterContent = "";
  let pendingContent = "";

  function flushChapter() {
    if (currentChapter && currentVol) {
      currentChapter.content = chapterContent.trim();
      currentVol.chapters.push(currentChapter);
    }
    chapterContent = "";
    currentChapter = null;
  }

  function flushVolume() {
    flushChapter();
    if (currentVol && currentVol.chapters.length > 0) {
      volumes.push(currentVol);
    }
    currentVol = null;
  }

  for (const line of lines) {
    if (/^# (.+)/.test(line) && !/^##/.test(line)) {
      // 新卷
      flushVolume();
      currentVol = {
        id: generateId(),
        title: line.replace(/^# /, "").trim(),
        chapters: [],
      };
    } else if (/^## (.+)/.test(line)) {
      // 新章节
      flushChapter();
      if (!currentVol) {
        currentVol = {
          id: generateId(),
          title: "导入的卷",
          chapters: [],
        };
      }
      currentChapter = {
        id: generateId(),
        title: line.replace(/^## /, "").trim(),
        content: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else if (currentChapter) {
      chapterContent += line + "\n";
    } else if (currentVol) {
      pendingContent += line + "\n";
    }
  }
  flushVolume();

  // 如果没有任何卷被创建，但有内容，则生成一个默认卷和章节
  if (volumes.length === 0 && (pendingContent || chapterContent)) {
    volumes.push({
      id: generateId(),
      title: "导入的卷",
      chapters: [
        {
          id: generateId(),
          title: "导入的章节",
          content: (pendingContent + chapterContent).trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
  }

  return volumes;
}

/**
 * 导入 Markdown 文件
 */
export function importMarkdownFile(file: File): Promise<Volume[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return reject(new Error("文件为空"));
      resolve(parseMarkdownToVolumes(text));
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * 导入 Word (.docx) 文件
 */
export function importWordFile(file: File): Promise<Volume[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) return reject(new Error("文件为空"));

      mammoth
        .convertToHtml({ arrayBuffer })
        .then((result) => {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = result.value;

          // 尝试将 HTML 转换为 Markdown 风格结构
          let mdContent = "";
          tempDiv.querySelectorAll("h1, h2, h3, p, blockquote").forEach((el) => {
            const tag = el.tagName.toLowerCase();
            const text = el.textContent?.trim() || "";
            if (tag === "h1") mdContent += `# ${text}\n\n`;
            else if (tag === "h2") mdContent += `## ${text}\n\n`;
            else if (tag === "h3") mdContent += `### ${text}\n\n`;
            else if (tag === "blockquote") mdContent += `> ${text}\n\n`;
            else mdContent += `${text}\n\n`;
          });

          // 如果没提取到任何内容，直接使用纯文本
          if (!mdContent.trim()) {
            mdContent = tempDiv.textContent || "";
          }

          resolve([
            {
              id: generateId(),
              title: `Word导入 - ${new Date().toLocaleDateString()}`,
              chapters: [
                {
                  id: generateId(),
                  title: file.name.replace(/\.docx?$/i, ""),
                  content: mdContent.trim(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          ]);
        })
        .catch(reject);
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 将所有卷和章节导出为 Markdown 字符串
 */
export function exportToMarkdown(volumes: Volume[]): string {
  let md = "";
  volumes.forEach((vol) => {
    md += `# ${vol.title}\n\n`;
    vol.chapters.forEach((ch) => {
      md += `## ${ch.title}\n\n${ch.content || ""}\n\n`;
    });
  });
  return md;
}

/**
 * 触发浏览器下载文件
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 将 Markdown 文本渲染为 HTML（用于预览）
 */
export function renderMarkdown(mdText: string): string {
  if (!mdText) return "";
  try {
    marked.setOptions({ breaks: true, gfm: true });
    return marked.parse(mdText) as string;
  } catch {
    return escapeHTML(mdText).replace(/\n/g, "<br>");
  }
}