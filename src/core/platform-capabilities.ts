import { platform, runtime } from './platform';

export const platformCapabilities = {
  platform,
  runtime,
  isNativeApp: runtime === 'tauri',
  hasNativeFileSystem: runtime === 'tauri',
  hasSystemDirectoryPicker: runtime === 'tauri',
  usesBrowserWorkspace: runtime === 'browser',
  canPersistBrowserFiles: runtime === 'browser',
  prefersDrawerSidebar: platform === 'android' || platform === 'ios' || platform === 'browser',
};

export type PlatformCapabilities = typeof platformCapabilities;
