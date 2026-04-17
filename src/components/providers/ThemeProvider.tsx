'use client';

import { useEffect } from 'react';
import { usePreferencesStore } from '@/store/preferencesStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { preferences } = usePreferencesStore();

  useEffect(() => {
    // This is the ONLY thing needed.
    // CSS handles the rest via [data-theme] selectors.
    console.log('🎨 ThemeProvider: Setting theme to', preferences.themePreset);
    document.documentElement.setAttribute('data-theme', preferences.themePreset);
  }, [preferences.themePreset]);

  return <>{children}</>;
}
