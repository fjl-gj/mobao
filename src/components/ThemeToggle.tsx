import { useSettings } from '../hooks/useSettings';

const THEMES = [
  { value: 'default', label: '☀️ 宣纸' },
  { value: 'dark', label: '🌙 暗色' },
  { value: 'eye-care', label: '👁 护眼' },
] as const;

export default function ThemeToggle() {
  const { settings, updateSettings } = useSettings();

  const cycleTheme = () => {
    const idx = THEMES.findIndex(t => t.value === settings.theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    updateSettings({ theme: next.value as 'default' | 'dark' | 'eye-care' });
  };

  const current = THEMES.find(t => t.value === settings.theme);

  return (
    <button onClick={cycleTheme} title="切换主题" className="toolbar-btn">
      {current?.label || '☀️'}
    </button>
  );
}
