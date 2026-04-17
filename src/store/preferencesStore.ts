import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemePreset, UserPreferences } from '@/types/preferences';
import { DEFAULT_PREFERENCES } from '@/types/preferences';

interface PreferencesState {
  preferences: UserPreferences;
  setThemePreset: (preset: ThemePreset) => void;
  hydrateFromServer: (prefs: UserPreferences) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,

      setThemePreset: (themePreset) =>
        set({ preferences: { themePreset } }),

      hydrateFromServer: (prefs) =>
        set({ preferences: prefs }),
    }),
    { name: 'newsforge-theme' }
  )
);
