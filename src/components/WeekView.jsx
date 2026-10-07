/* eslint-disable react/prop-types */
import { useMemo, Fragment } from "react";
import {
  SCHOOL_DAY_NAMES,
  HOUR_SLOTS,
  formatHourLabel,
  formatTimeMs,
  formatDayNumber,
} from "../utils/week";

function parseRooms(roomsJson) {
  try {
    const rooms = JSON.parse(roomsJson);
    if (Array.isArray(rooms)) return rooms;
  } catch (e) {
    // fall through to empty
  }
  return [];
}

const TYPE_STYLES = {
  Cours: {
    dark: "bg-indigo-500/20 border-indigo-400/30 text-indigo-100",
    light: "bg-indigo-50 border-indigo-200 text-indigo-900",
    badgeDark: "bg-indigo-500/30 text-indigo-100",
    badgeLight: "bg-indigo-100 text-indigo-700",
  },
  TD: {
    dark: "bg-emerald-500/20 border-emerald-400/30 text-emerald-100",
    light: "bg-emerald-50 border-emerald-200 text-emerald-900",
    badgeDark: "bg-emerald-500/30 text-emerald-100",
    badgeLight: "bg-emerald-100 text-emerald-700",
  },
  TP: {
    dark: "bg-amber-500/20 border-amber-400/30 text-amber-100",
    light: "bg-amber-50 border-amber-200 text-amber-900",
    badgeDark: "bg-amber-500/30 text-amber-100",
    badgeLight: "bg-amber-100 text-amber-700",
  },
};

function styleFor(sessionType, isDark) {
  const entry = TYPE_STYLES[sessionType] || TYPE_STYLES.Cours;
  return {
    block: isDark ? entry.dark : entry.light,
    badge: isDark ? entry.badgeDark : entry.badgeLight,
  };
}

// sessions: DB rows (starts_at/ends_at in unix seconds).
// weekSundayMs: Sunday 00:00 local time of the week to render.
// onSessionClick: optional — when provided, event blocks become tappable
// buttons (44px min touch area) that report the clicked session.
const WeekView = ({ sessions, weekSundayMs, isDark, onSessionClick }) => {
  const byDay = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];
    const buckets = [[], [], [], [], []];
    const sunday = new Date(weekSundayMs);
    const dayStart = (offset) =>
      new Date(
        sunday.getFullYear(),
        sunday.getMonth(),
        sunday.getDate() + offset,
        0,
        0,
        0,
      ).getTime();
    for (const s of list) {
      const ms = Number(s.starts_at) * 1000;
      if (!Number.isFinite(ms)) continue;
      for (let d = 0; d < 5; d += 1) {
        const start = dayStart(d);
        const end = start + 24 * 3600 * 1000;
        if (ms >= start && ms < end) {
          buckets[d].push(s);
          break;
        }
      }
    }
    for (const bucket of buckets) {
      bucket.sort((a, b) => Number(a.starts_at) - Number(b.starts_at));
    }
    return buckets;
  }, [sessions, weekSundayMs]);

  const slotOf = (startsAtSec) => {
    const d = new Date(Number(startsAtSec) * 1000);
    const value = d.getHours() + d.getMinutes() / 60;
    for (let i = HOUR_SLOTS.length - 1; i >= 0; i -= 1) {
      if (value >= HOUR_SLOTS[i]) return i;
    }
    return 0;
  };

  const headerColor = isDark ? "text-slate-300" : "text-gray-600";
  const gridBorder = isDark ? "border-white/10" : "border-purple-100";
  const hourColor = isDark ? "text-slate-400" : "text-gray-500";

  const sunday = new Date(weekSundayMs);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        <div className="grid grid-cols-[40px_repeat(5,minmax(0,1fr))]">
          <div className={`border-b ${gridBorder}`} />
          {SCHOOL_DAY_NAMES.map((name, i) => {
            const date = new Date(
              sunday.getFullYear(),
              sunday.getMonth(),
              sunday.getDate() + i,
            );
            return (
              <div
                key={name}
                className={`border-b ${gridBorder} px-0.5 py-1.5 text-center`}
              >
                <div className={`text-[10px] font-medium truncate ${headerColor}`}>
                  {name.slice(0, 3)}
                </div>
                <div className={`text-xs font-bold ${headerColor}`}>
                  {formatDayNumber(date)}
                </div>
              </div>
            );
          })}
          {HOUR_SLOTS.map((slot, row) => (
            <Fragment key={`row-${slot}`}>
              <div
                className={`border-b ${gridBorder} py-1 pr-1 text-right text-[10px] ${hourColor}`}
              >
                {formatHourLabel(slot)}
              </div>
              {[0, 1, 2, 3, 4].map((day) => (
                <div
                  key={`c-${slot}-${day}`}
                  className={`border-b border-l ${gridBorder} p-0.5 min-h-[44px]`}
                >
                  {byDay[day]
                    .filter((s) => slotOf(s.starts_at) === row)
                    .map((s) => {
                      const st = styleFor(s.session_type, isDark);
                      const rooms = parseRooms(s.rooms);
                      const label = `${s.subject || "Session"} ${s.session_type || ""}`.trim();
                      const blockClass = `rounded-md border px-1 py-0.5 mb-0.5 text-[10px] leading-tight ${st.block}`;
                      const inner = (
                        <>
                          <div className="font-bold truncate">
                            {s.subject || "(no subject)"}
                          </div>
                          <div className="truncate opacity-80">
                            {formatTimeMs(Number(s.starts_at) * 1000)}
                            {"–"}
                            {formatTimeMs(Number(s.ends_at) * 1000)}
                            {rooms.length > 0 ? ` · ${rooms.join(", ")}` : ""}
                          </div>
                          <span
                            className={`inline-block mt-0.5 rounded px-1 text-[9px] font-semibold ${st.badge}`}
                          >
                            {s.session_type}
                          </span>
                        </>
                      );
                      if (typeof onSessionClick === "function") {
                        return (
                          <button
                            key={`${s.uid}|${s.recurrence_id}`}
                            type="button"
                            onClick={() => onSessionClick(s)}
                            aria-label={label}
                            className={`block w-full min-h-[44px] text-left cursor-pointer active:scale-[0.98] transition-transform ${blockClass}`}
                          >
                            {inner}
                          </button>
                        );
                      }
                      return (
                        <div
                          key={`${s.uid}|${s.recurrence_id}`}
                          className={blockClass}
                        >
                          {inner}
                        </div>
                      );
                    })}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
