import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// ---------- 设置项 ----------

export interface AppSettings {
  theme: 'default' | 'dark' | 'eye-care';
  editorMode: 'markdown' | 'richtext';
  editorFontSize: number;
  editorFontFamily: string;
  editorLineHeight: number;
  tabSize: number;
  autoSave: boolean;
  autoSaveInterval: number;
  showLineNumbers: boolean;
  enableSpellCheck: boolean;
  cloudSyncEnabled: boolean;
  aiEnabled: boolean;
  aiProvider: 'mobao' | 'openai' | 'custom';
  aiDefaultModel: string;
  aiUseCurrentChapter: boolean;
  aiUseWritingContext: boolean;
  aiSaveHistory: boolean;
  sidebarWidth: number;
  previewVisible: boolean;
  lastSeriesId: string | null;
  lastNovelId: string | null;
}

const defaultSettings: AppSettings = {
  theme: 'default',
  editorMode: 'markdown',
  editorFontSize: 15,
  editorFontFamily: 'var(--font-mono)',
  editorLineHeight: 1.7,
  tabSize: 4,
  autoSave: true,
  autoSaveInterval: 60,
  showLineNumbers: false,
  enableSpellCheck: false,
  cloudSyncEnabled: false,
  aiEnabled: false,
  aiProvider: 'mobao',
  aiDefaultModel: '',
  aiUseCurrentChapter: true,
  aiUseWritingContext: true,
  aiSaveHistory: true,
  sidebarWidth: 240,
  previewVisible: true,
  lastSeriesId: null,
  lastNovelId: null,
};

// ---------- 状态 ----------

interface SettingsState {
  settings: AppSettings;
}

const initialState: SettingsState = {
  settings: loadSettings(),
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('mobao_settings_v2');
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored), aiEnabled: false };
    }
  } catch { /* ignore */ }
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem('mobao_settings_v2', JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ---------- Actions ----------

type SettingsAction =
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'RESET_SETTINGS' };

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return { settings: { ...state.settings, ...action.payload } };
    case 'RESET_SETTINGS':
      return { settings: defaultSettings };
    default:
      return state;
  }
}

// ---------- Context ----------

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (data: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const SettingsContext = createContext<SettingsContextType>(null!);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  const updateSettings = useCallback((data: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: data });
  }, []);

  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' });
  }, []);

  return (
    <SettingsContext.Provider value={{
      settings: state.settings,
      updateSettings,
      resetSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
