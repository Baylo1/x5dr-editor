// Theme and value-colour preferences: localStorage persistence only (no DOM),
// so it can be unit-tested.

export const THEME_STORAGE_KEY = 'x5dr-theme';
export const VALID_THEMES = ['warm', 'cool', 'acid'];
export const DEFAULT_THEME = 'warm';

/**
 * @param {{getItem(key: string): string|null}} storage - e.g. window.localStorage
 * @returns {string} a valid theme id, falling back to DEFAULT_THEME
 */
export function getStoredTheme(storage) {
  const value = storage?.getItem(THEME_STORAGE_KEY);
  return VALID_THEMES.includes(value) ? value : DEFAULT_THEME;
}

/**
 * @param {{setItem(key: string, value: string): void}} storage - e.g. window.localStorage
 * @param {string} theme
 */
export function setStoredTheme(storage, theme) {
  if (!VALID_THEMES.includes(theme)) return;
  storage?.setItem(THEME_STORAGE_KEY, theme);
}

// Value colour, independent of the theme: 'neutral' = --text-primary,
// 'theme' = the theme's accent colour.
export const VALUE_COLOR_STORAGE_KEY = 'x5dr-value-color';
export const VALID_VALUE_COLOR_MODES = ['neutral', 'theme'];
export const DEFAULT_VALUE_COLOR_MODE = 'neutral';

/**
 * @param {{getItem(key: string): string|null}} storage - e.g. window.localStorage
 * @returns {string} a valid value-color mode, falling back to DEFAULT_VALUE_COLOR_MODE
 */
export function getStoredValueColorMode(storage) {
  const value = storage?.getItem(VALUE_COLOR_STORAGE_KEY);
  return VALID_VALUE_COLOR_MODES.includes(value) ? value : DEFAULT_VALUE_COLOR_MODE;
}

/**
 * @param {{setItem(key: string, value: string): void}} storage - e.g. window.localStorage
 * @param {string} mode
 */
export function setStoredValueColorMode(storage, mode) {
  if (!VALID_VALUE_COLOR_MODES.includes(mode)) return;
  storage?.setItem(VALUE_COLOR_STORAGE_KEY, mode);
}
