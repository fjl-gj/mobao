// ---------- 平台检测 ----------

export type Platform = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'browser';
export type Runtime = 'tauri' | 'browser';

// 运行时环境
export const isTauri = !!(window as any).__TAURI__;
export const runtime: Runtime = isTauri ? 'tauri' : 'browser';

// 操作系统平台
export function detectPlatform(): Platform {
  if (!isTauri) return 'browser';

  const ua = navigator.userAgent.toLowerCase();
  // Tauri 环境下的平台检测
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'windows';
}

export const platform = detectPlatform();

export function isMobilePlatform() {
  return platform === 'android' || platform === 'ios' || platform === 'browser';
}
