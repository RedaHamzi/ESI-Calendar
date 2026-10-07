// School-week helpers. The school week runs Dimanche → Jeudi.

export const SCHOOL_DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
];

// Hour-slot start times (08:30 → 17:00, one row per hour).
export const HOUR_SLOTS = [8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5];

// Sunday 00:00 of the school week containing `date`. On Friday/Saturday the
// current school week is over, so the *next* week's Sunday is returned.
export function getSchoolWeekSunday(date, offsetWeeks) {
  const base = date instanceof Date ? new Date(date) : new Date();
  const dow = base.getDay();
  let delta = -dow;
  if (dow === 5 || dow === 6) delta += 7;
  const sunday = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta, 0, 0, 0);
  if (offsetWeeks) {
    sunday.setDate(sunday.getDate() + offsetWeeks * 7);
  }
  return sunday;
}

export function formatHourLabel(slot) {
  const h = Math.floor(slot);
  const m = slot % 1 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}

export function formatTimeMs(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDayNumber(date) {
  return String(date.getDate()).padStart(2, "0");
}
