'use client';

import { useEffect, useCallback } from 'react';
import { usePreferencesStore } from '@/store/preferencesStore';
import type { ThemePreset } from '@/types/preferences';

export function useUserPreferences() {
  const { preferences, setThemePreset, hydrateFromServer } = usePreferencesStore();

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        if (res.ok) {
          const data = await res.json();
          hydrateFromServer(data);
        }
      } catch (e) {
        console.error('Failed to fetch preferences:', e);
      }
    };
    fetchPrefs();
  }, [hydrateFromServer]);

  const saveThemePreset = useCallback(
    async (preset: ThemePreset) => {
      setThemePreset(preset);
      try {
        await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themePreset: preset }),
        });
      } catch (e) {
        console.error('Failed to save theme:', e);
      }
    },
    [setThemePreset]
  );

  return { themePreset: preferences.themePreset, saveThemePreset };
}
