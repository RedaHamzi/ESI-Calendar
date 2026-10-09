// Pure sync-range helpers shared by BOTH storage adapters (native SQLite
// and web Dexie). No I/O here — the range business rule must live in exactly
// one place so the two backends can never diverge.
//
// Range filtering happens at INSERT time (parse stays pure): callers pass
// these bounds as opts to replaceSessionsForCalendar. Seconds, inclusive.

export const SYNC_RANGES = ['year', 'month', 'week'];

export const ACADEMIC_YEAR_BOUNDS = {
  minStartsAt: Math.floor(Date.UTC(2025, 8, 1) / 1000),
  maxStartsAt: Math.floor(Date.UTC(2026, 7, 31, 23, 59, 59) / 1000),
};

export function getSyncRangeBounds(range, nowMs) {
  const now = new Date(nowMs == null ? Date.now() : nowMs);
  if (range === 'month') {
    const min = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const max = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      minStartsAt: Math.floor(min.getTime() / 1000),
      maxStartsAt: Math.floor(max.getTime() / 1000),
    };
  }
  if (range === 'week') {
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59);
    return {
      minStartsAt: Math.floor(monday.getTime() / 1000),
      maxStartsAt: Math.floor(sunday.getTime() / 1000),
    };
  }
  return { ...ACADEMIC_YEAR_BOUNDS };
}
