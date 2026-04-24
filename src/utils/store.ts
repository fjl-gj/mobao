import type { NovelState } from "../contexts/NovelContext";

const STORAGE_KEY = "mobao_novel_data_v1";

/**
 * 从 localStorage 加载应用核心状态
 */
export function loadState(): NovelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        volumes: data.volumes || [],
        outline: data.outline || [],
        activeChapterId: data.activeChapterId || null,
        previewMode: data.previewMode || "preview",
        toasts: [],
        modal: null,
      };
    }
  } catch (e) {
    console.warn("无法加载本地数据，将使用初始状态", e);
  }
  // 初始空状态
  return {
    volumes: [],
    outline: [],
    activeChapterId: null,
    previewMode: "preview",
    toasts: [],
    modal: null,
  };
}

/**
 * 持久化核心数据（去掉 UI 状态 toasts/modal）
 */
export function persistState(state: NovelState): void {
  try {
    const { toasts, modal, ...core } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(core));
  } catch (e) {
    console.error("保存数据失败", e);
  }
}