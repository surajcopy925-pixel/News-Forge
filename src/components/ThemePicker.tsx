'use client';

import { useUserPreferences } from '@/hooks/useUserPreferences';
import { THEME_PRESETS, type ThemePreset } from '@/types/preferences';

const PREVIEW_COLORS: Record<ThemePreset, { bg: string; bar: string; text: string; border: string }> = {
  'dark-professional': { bg: '#18181b', bar: '#3b82f6', text: '#e4e4e7', border: '#3f3f46' },
  'light-clean': { bg: '#f9fafb', bar: '#3b82f6', text: '#111827', border: '#d1d5db' },
  'dark-high-contrast': { bg: '#000000', bar: '#60a5fa', text: '#ffffff', border: '#8a8a8a' },
  'light-warm': { bg: '#fffbeb', bar: '#ea580c', text: '#1c1917', border: '#d6d3d1' },
};

export function ThemePicker() {
  const { themePreset, saveThemePreset } = useUserPreferences();

  return (
    <div className="grid grid-cols-2 gap-3">
      {THEME_PRESETS.map((theme) => {
        const isActive = themePreset === theme.id;
        const preview = PREVIEW_COLORS[theme.id];

        return (
          <button
            key={theme.id}
            onClick={() => saveThemePreset(theme.id)}
            className={`group relative rounded-lg border p-3 text-left transition-all ${
              isActive
                ? 'border-blue-500 ring-1 ring-blue-500/50'
                : 'border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {/* Mini Preview */}
            <div
              className="mb-3 h-16 w-full rounded overflow-hidden border"
              style={{ backgroundColor: preview.bg, borderColor: preview.border }}
            >
              {/* Fake top bar */}
              <div
                className="h-2.5 w-full"
                style={{ backgroundColor: preview.border }}
              />
              {/* Fake content lines */}
              <div className="p-2 space-y-1.5">
                <div className="flex gap-1.5">
                  <div className="h-1.5 w-6 rounded" style={{ backgroundColor: preview.bar }} />
                  <div className="h-1.5 w-10 rounded" style={{ backgroundColor: preview.text, opacity: 0.3 }} />
                </div>
                <div className="h-1.5 w-14 rounded" style={{ backgroundColor: preview.text, opacity: 0.2 }} />
                <div className="h-1.5 w-8 rounded" style={{ backgroundColor: preview.text, opacity: 0.15 }} />
              </div>
            </div>

            {/* Label */}
            <div className="text-sm font-medium text-zinc-100">{theme.name}</div>
            <div className="text-xs text-zinc-500">{theme.description}</div>

            {/* Active badge */}
            {isActive && (
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5">
                <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[10px] font-medium text-blue-400">Active</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
