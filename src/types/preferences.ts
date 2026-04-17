export type ThemePreset = 'dark-professional' | 'light-clean' | 'dark-high-contrast' | 'light-warm';

export interface UserPreferences {
  themePreset: ThemePreset;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  themePreset: 'dark-professional',
};

export const THEME_PRESETS: {
  id: ThemePreset;
  name: string;
  description: string;
}[] = [
  { id: 'dark-professional', name: 'Dark Professional', description: 'Default dark theme' },
  { id: 'light-clean', name: 'Light Clean', description: 'Light theme for bright offices' },
  { id: 'dark-high-contrast', name: 'Dark High-Contrast', description: 'Accessibility focused' },
  { id: 'light-warm', name: 'Light Warm', description: 'Reduced eye strain' },
];
