/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FiUser, FiSearch, FiWifiOff } from "react-icons/fi";
import PageHeader from "../components/PageHeader";
import ThemeToggle from "../components/ThemeToggle";
import WeekView from "../components/WeekView";
import { getSchoolWeekSunday } from "../utils/week";

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
        const { openDb, listTeachers } = await import("../services/db");
        const db = await openDb();
        if (cancelled) return;
        setTeachers(await listTeachers(db));
      } catch (e) {
        if (!cancelled) setLoadError(e.message || String(e));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
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
        const { openDb, queryTeacherWeek } = await import("../services/db");
        const db = await openDb();
        if (cancelled) return;
        const { startMs, endMs } = weekBounds(weekOffset);
        setSessions(await queryTeacherWeek(db, selected, startMs, endMs));
      } catch (e) {
        if (!cancelled) setSessions([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selected, weekOffset]);

  const filtered = useMemo(() => {
    if (!Array.isArray(teachers)) return [];
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => t.toLowerCase().includes(q));
  }, [teachers, query]);

  const bounds = useMemo(() => weekBounds(weekOffset), [weekOffset]);

  if (selected) {
    return (
      <div>
        <PageHeader
          title={selected}
          isDark={isDark}
          onBack={() => setSelected(null)}
        />
        <main className="content-area page-content px-4">
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

          {teachers === null && !loadError ? (
            <p className={`text-sm text-center ${subClass}`}>
              Loading teachers…
            </p>
          ) : filtered.length > 0 ? (
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
      </main>
    </div>
  );
};

export default TeachersPage;
