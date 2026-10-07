const KEYS = {
  class: 'esi-calendar-recent-classes',
  group: 'esi-calendar-recent-groups',
};

const LAST_SELECTION_KEY = 'esi-calendar-last-selection';

const MAX_ITEMS = 5;

const isValidEntry = (entry) =>
  entry !== null &&
  typeof entry === 'object' &&
  typeof entry.title === 'string';

const copyEntry = (item) => ({
  title: item.title,
  src: Array.isArray(item.src) ? [...item.src] : item.src,
});

export const getRecent = (type) => {
  try {
    const raw = localStorage.getItem(KEYS[type]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry).slice(0, MAX_ITEMS);
  } catch (e) {
    return [];
  }
};

export const pushRecent = (type, item) => {
  const list = getRecent(type).filter((entry) => entry.title !== item.title);
  list.unshift(copyEntry(item));
  const trimmed = list.slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(KEYS[type], JSON.stringify(trimmed));
  } catch (e) {
    // storage full or unavailable — keep in-memory list only
  }
  return trimmed;
};

export const clearRecent = (type) => {
  try {
    localStorage.setItem(KEYS[type], JSON.stringify([]));
  } catch (e) {
    // ignore — history stays empty for this session
  }
  return [];
};

export const loadLastSelection = () => {
  try {
    const raw = localStorage.getItem(LAST_SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      (parsed.type !== 'class' && parsed.type !== 'group') ||
      typeof parsed.title !== 'string'
    ) {
      return null;
    }
    return { type: parsed.type, title: parsed.title };
  } catch (e) {
    return null;
  }
};

export const saveLastSelection = (type, title) => {
  try {
    localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify({ type, title }));
  } catch (e) {
    // storage unavailable — selection just won't survive a restart
  }
};
