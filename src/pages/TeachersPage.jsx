/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FiUser, FiSearch, FiWifiOff } from "react-icons/fi";
import PageHeader from "../components/PageHeader";
import ThemeToggle from "../components/ThemeToggle";
import WeekView from "../components/WeekView";
import PullToRefresh from "../components/PullToRefresh";
import { getSchoolWeekSunday } from "../utils/week";
import { onSync, isSyncing } from "../services/syncEvents";
import { useAppStore } from "../store/appStore";

const WEEK_OPTIONS = [
  { id: 0, label: "This week" },
  { id: 1, label: "Next week" },
];

function weekBounds(offset) {
  const sunday = getSchoolWeekSunday(new Date(), offset);
  const end = new Date(
    sunday.getFullYear(),
    sunday.getMonth(),
    sunday.getDate() + 4,
    23,
    59,
    59,
  );
  return { startMs: sunday.getTime(), endMs: end.getTime() };
}

const TeachersPage = ({ isDark, setIsDark, onGoSync, focusTeacher }) => {
  const [teachers, setTeachers] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [sessions, setSessions] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [syncActive, setSyncActive] = useState(() => isSyncing());
  const [refreshSeq, setRefreshSeq] = useState(0);
  const dbReady = useAppStore((s) => s.dbReady);
  const cachedTeachers = useAppStore((s) => s.teachers);

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // C.4: reuse the store cache when a sync hasn't invalidated it.
        if (cachedTeachers && refreshSeq === 0) {
          if (!cancelled) {
            setLoadError(null);
            setTeachers(cachedTeachers);
          }
          return;
        }
        const db = useAppStore.getState().db;
        if (!db) {
          if (!cancelled) setLoadError("Database is not ready yet.");
          return;
        }
        const { listTeachers } = await import("../services/db");
        if (cancelled) return;
        setLoadError(null);
        const names = await listTeachers(db);
        if (!cancelled) {
          setTeachers(names);
          useAppStore.getState().setTeachers(names);
        }
      } catch (e) {
        console.error(`TeachersPage/loadTeachers: ${e && e.message ? e.message : e}`);
        if (!cancelled) setLoadError((e && e.message) || String(e));
      }
    };
    if (dbReady) load();
    return () => {
      cancelled = true;
    };
  }, [refreshSeq, dbReady, cachedTeachers]);

  // Re-query when a sync lands: the mount-time query races the silent
  // first-launch sync, so without this the list stays stale-empty.
  // Progress refreshes at most once per second so the list fills in live.
  useEffect(() => {
    let lastProgress = 0;
    return onSync((event) => {
      if (!event) return;
      if (event.type === "start") {
        setSyncActive(true);
      } else if (event.type === "done" || event.type === "error") {
        setSyncActive(false);
        setRefreshSeq((n) => n + 1);
      } else if (event.type === "progress") {
        const now = Date.now();
        if (now - lastProgress >= 1000) {
          lastProgress = now;
          setRefreshSeq((n) => n + 1);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (focusTeacher && focusTeacher.name) {
      setSelected(focusTeacher.name);
      setWeekOffset(0);
    }
  }, [focusTeacher]);

  useEffect(() => {
    if (!selected) {
      setSessions(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setSessions(null);
      try {
        console.log(`[teachers] detail teacher=${JSON.stringify(selected)} weekOffset=${weekOffset}`);
        const db = useAppStore.getState().db;
        if (!db) {
          if (!cancelled) setSessions([]);
          return;
        }
        const { queryTeacherWeek } = await import("../services/db");
        if (cancelled) return;
        const { startMs, endMs } = weekBounds(weekOffset);
        setSessions(await queryTeacherWeek(db, selected, startMs, endMs));
      } catch (e) {
        console.error(`TeachersPage/loadTeacherWeek: ${e && e.message ? e.message : e}`);
        if (!cancelled) setSessions([]);
      }
    };
    if (dbReady) load();
    return () => {
      cancelled = true;
    };
  }, [selected, weekOffset, refreshSeq, dbReady]);

  const filtered = useMemo(() => {
    if (!Array.isArray(teachers)) return [];
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => t.toLowerCase().includes(q));
  }, [teachers, query]);

  const bounds = useMemo(() => weekBounds(weekOffset), [weekOffset]);

  const handleRefresh = async () => {
    setRefreshSeq((n) => n + 1);
  };

  // First-time setup: the DB is still empty because the background sync
  // hasn't landed yet. Show progress instead of a dead "no data" state.
  const showSyncing = syncActive && !query && filtered.length === 0;
  const spinnerClass = isDark
    ? "border-white/30 border-t-white"
    : "border-purple-200 border-t-purple-600";

  if (selected) {
    return (
      <div>
        <PageHeader
          title={selected}
          isDark={isDark}
          onBack={() => setSelected(null)}
        />
        <main className="content-area page-content px-4">
          <PullToRefresh onRefresh={handleRefresh}>
          <div className="max-w-md mx-auto space-y-4">
            <div
              className={`flex items-center rounded-2xl p-1 border ${cardClass}`}
            >
              {WEEK_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWeekOffset(id)}
                  aria-label={label}
                  aria-pressed={weekOffset === id}
                  className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl active:scale-[0.97] transition-transform font-medium text-sm ${
                    weekOffset === id
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
            <div
              className={`rounded-2xl shadow-xl overflow-hidden border ${
                isDark
                  ? "bg-white border-white/20"
                  : "bg-white border-purple-200"
              }`}
            >
              {sessions === null ? (
                <p className={`p-4 text-sm text-center ${subClass}`}>
                  Loading sessions…
                </p>
              ) : sessions.length > 0 ? (
                <div className="p-2">
                  <WeekView
                    sessions={sessions}
                    weekSundayMs={bounds.startMs}
                    isDark={isDark}
                  />
                </div>
              ) : (
                <p className={`p-4 text-sm text-center ${subClass}`}>
                  No sessions for this teacher this week.
                </p>
              )}
            </div>
          </div>
          </PullToRefresh>
        </main>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Teachers"
        isDark={isDark}
        action={<ThemeToggle isDark={isDark} setIsDark={setIsDark} />}
      />
      <main className="content-area page-content px-4">
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-md mx-auto space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <FiSearch
                size={18}
                className={isDark ? "text-purple-400" : "text-purple-500"}
              />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teachers..."
              aria-label="Search teachers"
              className={`w-full min-h-[48px] pl-12 pr-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base ${inputClass}`}
            />
          </div>

          {loadError && (
            <p className="text-sm text-center text-red-400">{loadError}</p>
          )}

          {filtered.length > 0 ? (
            <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
              {filtered.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setSelected(name);
                    setWeekOffset(0);
                  }}
                  aria-label={name}
                  className={`w-full min-h-[56px] px-4 py-3 flex items-center gap-3 text-left border-b last:border-b-0 active:scale-[0.97] transition-transform ${
                    isDark ? "border-white/10" : "border-purple-100"
                  } ${rowClass}`}
                >
                  <span
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                      isDark ? "bg-indigo-600" : "bg-indigo-500"
                    }`}
                  >
                    <FiUser size={18} className="text-white" />
                  </span>
                  <span className={`flex-1 font-medium truncate ${textClass}`}>
                    {name}
                  </span>
                </button>
              ))}
            </div>
          ) : showSyncing ? (
            <div className={`rounded-2xl p-6 border text-center ${cardClass}`}>
              <span
                aria-hidden="true"
                className={`inline-block w-6 h-6 rounded-full border-2 animate-spin ${spinnerClass}`}
              />
              <h2 className={`font-semibold text-lg mt-3 ${textClass}`}>
                Syncing… (first-time setup)
              </h2>
              <p className={`text-sm mt-1 ${subClass}`}>
                Your schedules are downloading. The list fills in automatically.
              </p>
            </div>
          ) : teachers === null && !query ? (
            <p className={`text-sm text-center ${subClass}`}>
              Loading teachers…
            </p>
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
                {query ? "No teacher matches your search" : "No teacher data yet"}
              </h2>
              <p className={`text-sm mt-1 ${subClass}`}>
                {query
                  ? "Try a different name."
                  : "Connect to the internet and sync to load teachers."}
              </p>
              {!query && (
                <button
                  type="button"
                  onClick={onGoSync}
                  className={`mt-4 min-h-[48px] px-6 rounded-xl font-semibold text-white active:scale-[0.97] transition-transform ${
                    isDark ? "bg-indigo-600" : "bg-indigo-500"
                  }`}
                >
                  Sync now
                </button>
              )}
            </div>
          )}
        </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default TeachersPage;
