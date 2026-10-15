import { describe, it, expect } from 'vitest';
import {
  getStoredTheme, setStoredTheme, THEME_STORAGE_KEY, DEFAULT_THEME,
  getStoredValueColorMode, setStoredValueColorMode, VALUE_COLOR_STORAGE_KEY, DEFAULT_VALUE_COLOR_MODE,
} from './theme.js';

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    _map: map,
  };
}

describe('getStoredTheme', () => {
  it('falls back to the default theme when nothing is stored', () => {
    expect(getStoredTheme(makeStorage())).toBe(DEFAULT_THEME);
  });

  it('falls back to the default theme on an invalid stored value', () => {
    expect(getStoredTheme(makeStorage({ [THEME_STORAGE_KEY]: 'nonexistent' }))).toBe(DEFAULT_THEME);
  });

  it('returns a valid stored theme unchanged', () => {
    expect(getStoredTheme(makeStorage({ [THEME_STORAGE_KEY]: 'cool' }))).toBe('cool');
    expect(getStoredTheme(makeStorage({ [THEME_STORAGE_KEY]: 'acid' }))).toBe('acid');
  });
});

describe('setStoredTheme', () => {
  it('round-trips a valid selection', () => {
    const storage = makeStorage();
    setStoredTheme(storage, 'cool');
    expect(getStoredTheme(storage)).toBe('cool');
  });

  it('ignores an invalid theme rather than storing it', () => {
    const storage = makeStorage();
    setStoredTheme(storage, 'nonexistent');
    expect(storage._map.has(THEME_STORAGE_KEY)).toBe(false);
  });
});

describe('getStoredValueColorMode', () => {
  it('falls back to the default mode when nothing is stored', () => {
    expect(getStoredValueColorMode(makeStorage())).toBe(DEFAULT_VALUE_COLOR_MODE);
  });

  it('falls back to the default mode on an invalid stored value', () => {
    expect(getStoredValueColorMode(makeStorage({ [VALUE_COLOR_STORAGE_KEY]: 'nonexistent' }))).toBe(DEFAULT_VALUE_COLOR_MODE);
  });

  it('returns a valid stored mode unchanged', () => {
    expect(getStoredValueColorMode(makeStorage({ [VALUE_COLOR_STORAGE_KEY]: 'theme' }))).toBe('theme');
  });
});

describe('setStoredValueColorMode', () => {
  it('round-trips a valid selection', () => {
    const storage = makeStorage();
    setStoredValueColorMode(storage, 'theme');
    expect(getStoredValueColorMode(storage)).toBe('theme');
  });

  it('ignores an invalid mode rather than storing it', () => {
    const storage = makeStorage();
    setStoredValueColorMode(storage, 'nonexistent');
    expect(storage._map.has(VALUE_COLOR_STORAGE_KEY)).toBe(false);
  });
});
