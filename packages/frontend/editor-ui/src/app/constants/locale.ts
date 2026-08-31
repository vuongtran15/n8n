export const LOCAL_STORAGE_LOCALE = 'N8N_LOCALE';

/** UI locales selectable in Settings → Personal (kito fork). */
export const UI_LOCALE_OPTIONS = ['en', 'zh', 'vi'] as const;

export type UiLocaleOption = (typeof UI_LOCALE_OPTIONS)[number];
