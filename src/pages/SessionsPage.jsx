/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiWifiOff } from "react-icons/fi";
import PageHeader from "../components/PageHeader";
import ThemeToggle from "../components/ThemeToggle";
import SessionDetailModal from "../components/SessionDetailModal";
import { classes, groups } from "../data/data";
import {
  getSchoolWeekSunday,
  formatTimeMs,
} from "../utils/week";
import { onSync } from "../services/syncEvents";
import PullToRefresh from "../components/PullToRefresh";
import { useAppStore } from "../store/appStore";
import { useAppState } from "../hooks/useAppState";

const TYPE_OPTIONS = ["All", "Cours", "TD", "TP"];
const RANGE_OPTIONS = [
  { id: "this", label: "This week" },
  { id: "next", label: "Next week" },
  { id: "all", label: "All" },
];
const SHORT_DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const TYPE_BAR = {
  Cours: "bg-indigo-500",
  TD: "bg-emerald-500",
  TP: "bg-amber-500",
};

function parseRooms(roomsJson) {
  try {
    const rooms = JSON.parse(roomsJson);
    if (Array.isArray(rooms)) return rooms;
  } catch (e) {
    // fall through to empty
  }
  return [];
}

function formatDayTime(session) {
  const start = new Date(Number(session.starts_at) * 1000);
  const end = new Date(Number(session.ends_at) * 1000);
  const dayName = SHORT_DAYS[start.getDay()] || "";
  return `${dayName} ${String(start.getDate()).padStart(2, "0")} · ${formatTimeMs(
    start.getTime(),
  )}–${formatTimeMs(end.getTime())}`;
}

function rangeBounds(rangeId) {
  if (rangeId === "all") {
    const sunday = getSchoolWeekSunday(new Date(), 0);
    return { minMs: sunday.getTime(), maxMs: null };
  }
  const offset = rangeId === "next" ? 1 : 0;
  const sunday = getSchoolWeekSunday(new Date(), offset);
  const end = new Date(
    sunday.getFullYear(),
    sunday.getMonth(),
    sunday.getDate() + 4,
    23,
    59,
    59,
  );
  return { minMs: sunday.getTime(), maxMs: end.getTime() };
}

// Map a stored session back to its catalog entry (class or group) so the
// detail sheet can jump to it. Matches on ICS url first, calname second.
async function entryForSession(session) {
  if (!session) return null;
  const { calendarIdToIcsUrl } = await import("../services/sync");
  const toUrl = (id) => {
    try {
      return calendarIdToIcsUrl(id);
    } catch (e) {
      return null;
    }
  };
  for (const entry of classes) {
    if (typeof entry.src === "string") {
      if (toUrl(entry.src) === session.cal_url) {
        return { type: "class", entry };
      }
    }
  }
  for (const entry of groups) {
    const list = Array.isArray(entry.src) ? entry.src : [];
    for (const id of list) {
      if (typeof id !== "string") continue;
      if (toUrl(id) === session.cal_url) {
        return { type: "group", entry };
      }
    }
  }
  if (session.calname) {
    const byTitle =
      groups.find((e) => e.title === session.calname) ||
      classes.find((e) => e.title === session.calname);
    if (byTitle) {
      return {
        type: groups.includes(byTitle) ? "group" : "class",
        entry: byTitle,
      };
    }
  }
  return null;
}

const SessionsPage = ({
  isDark,
  setIsDark,
  onGoSync,
  onSeeTeacher,
  onSeeGroup,
}) => {
  const [sessionType, setSessionType] = useState("All");
  const [subject, setSubject] = useState("");
  const [rangeId, setRangeId] = useState("this");
  const [sessions, setSessions] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const { online, hasData, dbReady, showSyncCTA, canQueryDb } = useAppState();

  const cardClass = isDark
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-purple-200";
  const textClass = isDark ? "text-white" : "text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";
  const inputClass = isDark
    ? "bg-white/10 border-white/20 text-white placeholder-purple-200"
    : "bg-white/80 border-purple-200 text-gray-900 placeholder-purple-400";
  const rowClass = isDark ? "hover:bg-white/10" : "hover:bg-purple-50";
  const segInactive = isDark ? "text-purple-100" : "text-purple-600";

  const bounds = useMemo(() => rangeBounds(rangeId), [rangeId]);

  const handleRefresh = async () => {
    setRefreshSeq((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSessions(null);
      setLoadError(null);
      try {
        const db = useAppStore.getState().db;
        if (!db) {
          if (!cancelled) {
            setLoadError("Database is not ready yet.");
            setSessions([]);
          }
          return;
        }
        const { querySessionsFiltered } = await import(
          "../services/db"
        );
        if (cancelled) return;
        const rows = await querySessionsFiltered(db, {
          type: sessionType,
          subject: subject.trim(),
          minMs: bounds.minMs,
          maxMs: bounds.maxMs,
          limit: 200,
        });
        if (!cancelled) setSessions(rows);
      } catch (e) {
        console.error(`SessionsPage/load: ${e && e.message ? e.message : e}`);
        if (!cancelled) {
          setLoadError((e && e.message) || String(e));
          setSessions([]);
        }
      }
    };
    if (!canQueryDb) return () => { cancelled = true; };
    const timer = setTimeout(load, subject ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionType, subject, bounds, refreshSeq, canQueryDb]);

  // Re-run the current filter when a user-triggered sync lands.
  useEffect(() => {
    return onSync((event) => {
      if (!event) return;
      if (event.type === "done" || event.type === "error") {
        setRefreshSeq((n) => n + 1);
      }
    });
  }, []);

  const openDetail = async (session) => {
    setDetail({ session, entry: null });
    try {
      const entry = await entryForSession(session);
      setDetail((prev) =>
        prev && prev.session === session ? { session, entry } : prev,
      );
    } catch (e) {
      console.error(`SessionsPage/entryForSession: ${e && e.message ? e.message : e}`);
      // entry stays null — the sheet still shows full session info
    }
  };

  // E.4: global loading state while the DB connection opens.
  if (!dbReady) {
    return (
      <div>
        <PageHeader
          title="Sessions"
          isDark={isDark}
          action={<ThemeToggle isDark={isDark} setIsDark={setIsDark} />}
        />
        <main className="content-area page-content px-4">
          <div className="max-w-md mx-auto text-center py-10">
            <span
              aria-hidden="true"
              className={`inline-block w-6 h-6 rounded-full border-2 animate-spin ${
                isDark
                  ? "border-white/30 border-t-white"
                  : "border-purple-200 border-t-purple-600"
              }`}
            />
            <p className={`text-sm mt-3 ${subClass}`}>Loading…</p>
          </div>
        </main>
      </div>
    );
  }

  // CASE B/D: without synced data there is nothing to filter.
  if (showSyncCTA || !hasData) {
    return (
      <div>
        <PageHeader
          title="Sessions"
          isDark={isDark}
          action={<ThemeToggle isDark={isDark} setIsDark={setIsDark} />}
        />
        <main className="content-area page-content px-4">
          <div className="max-w-md mx-auto space-y-4">
            <div className={`rounded-2xl p-6 border text-center ${cardClass}`}>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  isDark ? "bg-indigo-600" : "bg-indigo-500"
                }`}
              >
                <FiWifiOff size={22} className="text-white" />
              </div>
              <h2 className={`font-semibold text-lg ${textClass}`}>
                {online
                  ? "Database is empty."
                  : "No data available. Connect to the internet and sync to use the app offline."}
              </h2>
              <p className={`text-sm mt-1 ${subClass}`}>
                {online
                  ? "Sync the database to browse sessions offline."
                  : "Your sessions will appear here after a sync."}
              </p>
              <button
                type="button"
                onClick={onGoSync}
                aria-label="Sync database"
                className={`mt-4 min-h-[48px] px-6 rounded-xl font-semibold text-white active:scale-[0.97] transition-transform ${
                  isDark ? "bg-indigo-600" : "bg-indigo-500"
                }`}
              >
                Sync database
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sessions"
        isDark={isDark}
        action={<ThemeToggle isDark={isDark} setIsDark={setIsDark} />}
      />
      <main className="content-area page-content px-4">
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-md mx-auto space-y-4">
          <div className={`flex items-center rounded-2xl p-1 border ${cardClass}`}>
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSessionType(t)}
                aria-label={`Filter ${t}`}
                aria-pressed={sessionType === t}
                className={`flex-1 min-h-[44px] min-w-[44px] py-2.5 px-1 rounded-xl active:scale-[0.97] transition-transform font-medium text-sm ${
                  sessionType === t
                    ? isDark
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-500 text-white"
                    : segInactive
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <FiSearch
                size={18}
                className={isDark ? "text-purple-400" : "text-purple-500"}
              />
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Search subjects..."
              aria-label="Search subjects"
              className={`w-full min-h-[48px] pl-12 pr-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base ${inputClass}`}
            />
          </div>

          <div className={`flex items-center rounded-2xl p-1 border ${cardClass}`}>
            {RANGE_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRangeId(id)}
                aria-label={label}
                aria-pressed={rangeId === id}
                className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl active:scale-[0.97] transition-transform font-medium text-sm ${
                  rangeId === id
                    ? isDark
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-500 text-white"
                    : segInactive
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loadError && (
            <p className="text-sm text-center text-red-400">{loadError}</p>
          )}

          {sessions === null && !loadError ? (
            <p className={`text-sm text-center ${subClass}`}>
              Loading sessions…
            </p>
          ) : sessions.length > 0 ? (
            <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
              {sessions.map((s) => {
                const rooms = parseRooms(s.rooms);
                return (
                  <button
                    key={`${s.uid}|${s.recurrence_id}`}
                    type="button"
                    onClick={() => openDetail(s)}
                    aria-label={`${s.subject || "Session"} ${s.session_type}`}
                    className={`w-full min-h-[56px] flex items-stretch gap-3 text-left active:scale-[0.97] transition-transform ${rowClass}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-1.5 shrink-0 ${TYPE_BAR[s.session_type] || "bg-indigo-500"}`}
                    />
                    <span className="flex-1 py-3 pr-4">
                      <span className={`block font-medium ${textClass}`}>
                        {s.subject || "(no subject)"} · {s.session_type}
                      </span>
                      <span className={`block text-xs ${subClass}`}>
                        {[s.teacher, rooms.join(", "), formatDayTime(s)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`rounded-2xl p-6 border text-center ${cardClass}`}>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  isDark ? "bg-indigo-600" : "bg-indigo-500"
                }`}
              >
                <FiWifiOff size={22} className="text-white" />
              </div>
              <h2 className={`font-semibold text-lg ${textClass}`}>
                No sessions found
              </h2>
              <p className={`text-sm mt-1 ${subClass}`}>
                Try widening the filters.
              </p>
            </div>
          )}
        </div>
        </PullToRefresh>
      </main>
      {detail && detail.session && (
        <SessionDetailModal
          session={detail.session}
          onClose={() => setDetail(null)}
          isDark={isDark}
          onSeeTeacher={
            onSeeTeacher
              ? (name) => {
                  setDetail(null);
                  onSeeTeacher(name);
                }
              : undefined
          }
          onSeeGroup={
            detail.entry && onSeeGroup
              ? () => {
                  const target = detail.entry;
                  setDetail(null);
                  onSeeGroup(target.type, target.entry);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default SessionsPage;
