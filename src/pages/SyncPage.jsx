/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiChevronDown, FiChevronUp } from "react-icons/fi";
import PageHeader from "../components/PageHeader";
import { classes, groups } from "../data/data";
import {
  openDb,
  countSessions,
  countSessionsInRange,
  getSyncOverview,
  getSyncRangeBounds,
} from "../services/db";
import {
  syncAll,
  getCalendarUrls,
  calendarIdToIcsUrl,
  DEFAULT_SYNC_RANGE,
} from "../services/sync";

const RANGE_KEY = "esi-sync-range";

const RANGES = [
  { id: "year", label: "Sync one year", hint: "Full academic year" },
  { id: "month", label: "Sync one month", hint: "Current calendar month" },
  { id: "week", label: "Sync one week", hint: "Current week, Monday to Sunday" },
];

function formatNumber(n) {
  if (n == null) return "—";
  try {
    return Number(n).toLocaleString("en-US");
  } catch (e) {
    return String(n);
  }
}

function formatRelativeTime(ms) {
  if (!ms) return "never";
  const diffSec = Math.max(0, Math.floor((Date.now() - Number(ms)) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? "" : "s"} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD} day${diffD === 1 ? "" : "s"} ago`;
  const diffMo = Math.floor(diffD / 30);
  return `${diffMo} month${diffMo === 1 ? "" : "s"} ago`;
}

const SyncPage = ({ isDark, onBack }) => {
  const [range, setRange] = useState(() => {
    try {
      return localStorage.getItem(RANGE_KEY) || DEFAULT_SYNC_RANGE;
    } catch (e) {
      return DEFAULT_SYNC_RANGE;
    }
  });
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState(null);
  const [counts, setCounts] = useState(null);
  const [overview, setOverview] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);

  const cardClass = isDark
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-purple-200";
  const textClass = isDark ? "text-white" : "text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";
  const mutedClass = isDark ? "text-slate-400" : "text-gray-500";

  const titleByUrl = useMemo(() => {
    const map = new Map();
    for (const entry of classes) {
      if (entry && typeof entry.src === "string") {
        const url = calendarIdToIcsUrl(entry.src);
        if (!map.has(url)) map.set(url, entry.title);
      }
    }
    for (const entry of groups) {
      const list = entry && Array.isArray(entry.src) ? entry.src : [];
      for (const id of list) {
        if (typeof id === "string") {
          const url = calendarIdToIcsUrl(id);
          if (!map.has(url)) map.set(url, entry.title);
        }
      }
    }
    return map;
  }, []);

  const labelFor = (url) => titleByUrl.get(url) || url;

  const loadStats = async () => {
    try {
      const db = await openDb();
      const [total, monthBounds, weekBounds] = [
        await countSessions(db),
        getSyncRangeBounds("month"),
        getSyncRangeBounds("week"),
      ];
      const [month, week] = await Promise.all([
        countSessionsInRange(db, monthBounds.minStartsAt, monthBounds.maxStartsAt),
        countSessionsInRange(db, weekBounds.minStartsAt, weekBounds.maxStartsAt),
      ]);
      setCounts({ total, month, week });
      setOverview({ ...(await getSyncOverview(db)), total });
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const runSync = async (nextRange) => {
    const chosen = nextRange || range;
    setRange(chosen);
    try {
      localStorage.setItem(RANGE_KEY, chosen);
    } catch (e) {
      // storage unavailable — range just won't survive a restart
    }
    setSyncing(true);
    setProgress(null);
    setSummary(null);
    setShowDetails(false);
    setError(null);
    try {
      const result = await syncAll(
        getCalendarUrls(),
        (done, total, currentUrl) => {
          setProgress({ done, total, current: labelFor(currentUrl) });
        },
        { range: chosen },
      );
      setSummary(result);
      await loadStats();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  };

  const countFor = (id) => {
    if (!counts) return null;
    if (id === "month") return counts.month;
    if (id === "week") return counts.week;
    return counts.total;
  };

  const failures = (summary && summary.failures) || [];

  return (
    <div>
      <PageHeader title="Sync" isDark={isDark} onBack={onBack} />
      <main className="content-area content-with-tabs px-4">
        <div className="max-w-md mx-auto space-y-4">
          <div className={`rounded-2xl p-4 border ${cardClass}`}>
            <p className={`text-sm font-semibold ${textClass}`}>
              How much to keep offline
            </p>
            <div className="mt-3 space-y-2">
              {RANGES.map(({ id, label, hint }) => {
                const selected = range === id;
                const n = countFor(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={syncing}
                    onClick={() => runSync(id)}
                    aria-label={label}
                    aria-pressed={selected}
                    className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left active:scale-[0.97] transition-transform disabled:opacity-50 ${
                      selected
                        ? isDark
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-indigo-500 border-indigo-500"
                        : isDark
                          ? "bg-white/5 border-white/20"
                          : "bg-white border-purple-200"
                    }`}
                  >
                    <span
                      className={`block font-semibold ${
                        selected ? "text-white" : textClass
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`block text-xs ${
                        selected
                          ? "text-white/80"
                          : subClass
                      }`}
                    >
                      {hint}
                      {counts
                        ? ` — ${formatNumber(n)} sessions stored`
                        : " — connect and sync to see counts"}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={syncing}
              onClick={() => runSync()}
              className={`w-full min-h-[48px] mt-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50 ${
                isDark
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-500 text-white"
              }`}
            >
              <FiRefreshCw size={18} />
              {syncing ? "Syncing…" : "Sync now"}
            </button>

            {syncing && progress && (
              <p className={`text-sm text-center mt-3 ${textClass}`}>
                Syncing {progress.done} / {progress.total} — {progress.current}
              </p>
            )}

            <p className={`text-xs text-center mt-3 ${mutedClass}`}>
              Last synced:{" "}
              {formatRelativeTime(overview && overview.lastSynced)}
              {overview && overview.calendars
                ? ` · ${overview.calendars} calendars`
                : ""}
            </p>
          </div>

          {error && (
            <p className="text-sm text-center text-red-400">{error}</p>
          )}

          {summary && (
            <div className={`rounded-2xl p-4 border ${cardClass}`}>
              <p className={`text-sm font-semibold ${textClass}`}>
                Last sync result
              </p>
              <p className={`text-sm ${subClass}`}>
                Updated: {summary.updated} · Unchanged: {summary.unchanged} ·
                Failed: {summary.failed}
              </p>
              {failures.length > 0 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowDetails((v) => !v)}
                    aria-label={showDetails ? "Hide details" : "Show details"}
                    className={`min-h-[44px] inline-flex items-center gap-1 text-sm font-medium active:scale-[0.97] transition-transform ${
                      isDark ? "text-purple-200" : "text-purple-600"
                    }`}
                  >
                    {showDetails ? "Hide details" : "Show details"}
                    {showDetails ? (
                      <FiChevronUp size={16} />
                    ) : (
                      <FiChevronDown size={16} />
                    )}
                  </button>
                  {showDetails && (
                    <ul className={`text-xs mt-1 space-y-1 ${mutedClass}`}>
                      {failures.map((f) => (
                        <li key={f.url}>{labelFor(f.url)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SyncPage;
