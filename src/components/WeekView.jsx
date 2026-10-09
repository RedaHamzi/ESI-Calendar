/* eslint-disable react/prop-types */
import { useMemo } from "react";
import {
  SCHOOL_DAY_NAMES,
  HOUR_SLOTS,
  formatHourLabel,
  formatTimeMs,
  formatDayNumber,
} from "../utils/week";

function parseRooms(roomsJson) {
  // Web (Dexie) rows carry rooms as a real array; native (SQLite) as JSON.
  if (Array.isArray(roomsJson)) return roomsJson;
  try {
    const rooms = JSON.parse(roomsJson);
    if (Array.isArray(rooms)) return rooms;
  } catch (e) {
    console.error(`WeekView/parseRooms: ${e && e.message ? e.message : e}`);
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

// Grid geometry. Rows are hourly (HOUR_SLOTS steps of 1h starting 08:30) and
// each row is exactly ROW_HEIGHT_PX tall, so event blocks are positioned and
// sized proportionally to the minute — never snapped to row boundaries.
// Do NOT revert to grid-row spans: arbitrary durations (e.g. 85 min) break.
const ROW_HEIGHT_PX = 44;
const ROW_MINUTES = 60;
const GRID_START_MIN = 8 * 60 + 30; // 08:30 in minutes since midnight
const GRID_TOTAL_PX = HOUR_SLOTS.length * ROW_HEIGHT_PX;
const MIN_BLOCK_PX = 24;

function minutesOfDay(startsAtSec) {
  const d = new Date(Number(startsAtSec) * 1000);
  return d.getHours() * 60 + d.getMinutes();
}

// sessions: DB rows (starts_at/ends_at in unix seconds).
// weekSundayMs: Sunday 00:00 local time of the week to render.
// onSessionClick: optional — when provided, event blocks become tappable
// buttons that report the clicked session.
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

  // Per-day absolute layout: exact top/height in px from session times plus
  // greedy lane assignment so overlapping sessions share the column width
  // instead of covering each other. Non-overlapping days use one full lane.
  const layoutByDay = useMemo(
    () =>
      byDay.map((bucket) => {
        const items = [];
        for (const s of bucket) {
          const startMin = minutesOfDay(s.starts_at);
          const endMin = minutesOfDay(s.ends_at);
          if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) continue;
          const top = ((startMin - GRID_START_MIN) / ROW_MINUTES) * ROW_HEIGHT_PX;
          const bottom = ((endMin - GRID_START_MIN) / ROW_MINUTES) * ROW_HEIGHT_PX;
          // Skip sessions entirely outside the rendered grid.
          if (!(bottom > 0 && top < GRID_TOTAL_PX)) continue;
          items.push({ s, top, bottom });
        }
        items.sort((a, b) => a.top - b.top || b.bottom - a.bottom);
        const laneEnds = [];
        for (const it of items) {
          let lane = laneEnds.findIndex((end) => end <= it.top);
          if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(it.bottom);
          } else {
            laneEnds[lane] = it.bottom;
          }
          it.lane = lane;
        }
        const lanes = Math.max(1, laneEnds.length);
        return items.map((it) => {
          const topPx = Math.max(0, it.top);
          const bottomPx = Math.min(it.bottom, GRID_TOTAL_PX);
          const heightPx = Math.max(MIN_BLOCK_PX, bottomPx - topPx);
          return {
            s: it.s,
            topPx,
            heightPx,
            leftPct: (it.lane / lanes) * 100,
            widthPct: 100 / lanes,
          };
        });
      }),
    [byDay],
  );

  const headerColor = isDark ? "text-slate-300" : "text-gray-600";
  const gridBorder = isDark ? "border-white/10" : "border-purple-100";
  const hourColor = isDark ? "text-slate-400" : "text-gray-500";

  const sunday = new Date(weekSundayMs);

  const renderBlock = (item) => {
    const { s, topPx, heightPx, leftPct, widthPct } = item;
    const st = styleFor(s.session_type, isDark);
    const rooms = parseRooms(s.rooms);
    const label = `${s.subject || "Session"} ${s.session_type || ""}`.trim();
    const blockClass = `rounded-md border px-1 py-0.5 text-[10px] leading-tight overflow-hidden ${st.block}`;
    const style = {
      position: "absolute",
      top: `${topPx}px`,
      height: `${heightPx}px`,
      left: `calc(${leftPct}% + 2px)`,
      width: `calc(${widthPct}% - 4px)`,
    };
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
          style={style}
          className={`block text-left cursor-pointer active:scale-[0.98] transition-transform ${blockClass}`}
        >
          {inner}
        </button>
      );
    }
    return (
      <div key={`${s.uid}|${s.recurrence_id}`} style={style} className={blockClass}>
        {inner}
      </div>
    );
  };

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
          <div>
            {HOUR_SLOTS.map((slot) => (
              <div
                key={`h-${slot}`}
                className={`border-b ${gridBorder} h-11 py-1 pr-1 text-right text-[10px] ${hourColor}`}
              >
                {formatHourLabel(slot)}
              </div>
            ))}
          </div>
          {[0, 1, 2, 3, 4].map((day) => (
            <div key={`day-${day}`} className="relative">
              {HOUR_SLOTS.map((slot) => (
                <div
                  key={`c-${slot}-${day}`}
                  className={`border-b border-l ${gridBorder} h-11`}
                />
              ))}
              {layoutByDay[day].map(renderBlock)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
