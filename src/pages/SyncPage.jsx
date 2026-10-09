/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiChevronDown, FiChevronUp } from "react-icons/fi";
import PageHeader from "../components/PageHeader";
import PullToRefresh from "../components/PullToRefresh";
import { notifyOffline, notifyBrowserSyncUnavailable } from "../store/toastStore";
import { classes, groups } from "../data/data";
import {
  countSessions,
  countSessionsInRange,
  getSyncOverview,
  getSyncRangeBounds,
} from "../services/db";
import { useAppStore } from "../store/appStore";
import { useLocation } from "wouter";
import useOnlineStatus from "../hooks/useOnlineStatus";
import {
  calendarIdToIcsUrl,
  DEFAULT_SYNC_RANGE,
  canSyncOnThisPlatform,
  BROWSER_SYNC_UNAVAILABLE,
} from "../services/sync";
import { useSyncStore } from "../store/syncStore";

const RANGE_KEY = "esi-sync-range";

const RANGES = [
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
  const [, navigate] = useLocation();
  const handleBack = onBack || (() => navigate("/more"));
  const [range, setRange] = useState(() => {
    try {
      // After an interrupted sync, preselect the range that was running.
      const st = useSyncStore.getState();
      if (
        st.status === "incomplete" &&
        (st.lastRange === "week" || st.lastRange === "month")
      ) {
        return st.lastRange;
      }
      const stored = localStorage.getItem(RANGE_KEY) || DEFAULT_SYNC_RANGE;
      // The 'year' range option was removed — migrate to the new default.
      return stored === "year" ? "month" : stored;
    } catch (e) {
      return DEFAULT_SYNC_RANGE;
    }
  });
  const [counts, setCounts] = useState(null);
  const [overview, setOverview] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [notice, setNotice] = useState(null);
  // Sync state is global (useSyncStore) so progress survives navigation;
  // this page only reads the store, never owns the sync promise.
  const status = useSyncStore((s) => s.status);
  const syncProgress = useSyncStore((s) => s.progress);
  const lastError = useSyncStore((s) => s.lastError);
  const lastSummary = useSyncStore((s) => s.lastSummary);
  const lastCompletedAt = useSyncStore((s) => s.lastCompletedAt);
  const syncing = status === "running";
  const progress = syncing ? syncProgress : null;
  const summary = lastSummary;
  const error = lastError || notice;

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

  const dbReady = useAppStore((s) => s.dbReady);
  const online = useOnlineStatus();
  // Production web has no ICS proxy (CORS) — sync is unavailable there.
  // Dev web syncs through the Vite /ics proxy; native always syncs.
  const canSync = canSyncOnThisPlatform();

  const labelFor = (url) => titleByUrl.get(url) || url;

  const loadStats = async () => {
    try {
      const db = useAppStore.getState().db;
      if (!db) {
        setNotice("Database is not ready yet. Reopen the app.");
        return;
      }
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
      console.error(`SyncPage/loadStats: ${e && e.message ? e.message : e}`);
      setNotice("Couldn't read the local database yet. Try reopening the app.");
    }
  };

  useEffect(() => {
    if (dbReady) loadStats();
  }, [dbReady]);

  const runSync = async (nextRange) => {
    if (syncing) return;
    if (!canSync) {
      // Reachable via pull-to-refresh when the buttons are disabled.
      notifyBrowserSyncUnavailable(BROWSER_SYNC_UNAVAILABLE);
      return;
    }
    if (!online) {
      // Instant feedback; the store's start() gate re-checks and toasts
      // too, so no entry point can bypass the message.
      notifyOffline();
      return;
    }
    const chosen = nextRange || range;
    setRange(chosen);
    setNotice(null);
    setShowDetails(false);
    try {
      await useSyncStore.getState().start(chosen);
      await loadStats();
    } catch (e) {
      console.error(`SyncPage/runSync: ${e && e.message ? e.message : e}`);
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
      <PageHeader title="Sync" isDark={isDark} onBack={handleBack} />
      <main className="content-area page-content px-4">
        <PullToRefresh onRefresh={() => runSync()}>
        <div className="max-w-md mx-auto space-y-4">
          {/* Production web: no ICS proxy exists, so sync cannot run here. */}
          {!canSync && (
            <div className={`rounded-2xl p-4 border ${cardClass}`}>
              <h2 className={`font-semibold text-lg ${textClass}`}>
                Browser sync unavailable
              </h2>
              <p className={`text-sm mt-1 ${subClass}`}>
                {BROWSER_SYNC_UNAVAILABLE}
              </p>
            </div>
          )}
          {/* Interrupted sync: resume is a plain re-run of any range. */}
          {status === "incomplete" && (
            <div className={`rounded-2xl p-4 border ${cardClass}`}>
              <h2 className={`font-semibold text-lg ${textClass}`}>
                Previous sync was interrupted.
              </h2>
              <p className={`text-sm mt-1 ${subClass}`}>
                Tap any sync option to continue. Already-synced calendars
                will be skipped.
              </p>
            </div>
          )}
          {/* CASE D: the Sync page itself shows a "No internet" state. */}
          {!online && (
            <div className={`rounded-2xl p-6 border text-center ${cardClass}`}>
              <h2 className={`font-semibold text-lg ${textClass}`}>
                You are offline. Connect to sync.
              </h2>
              <p className={`text-sm mt-1 ${subClass}`}>
                Sync needs an internet connection. Your saved schedules stay
                available in the meantime.
              </p>
            </div>
          )}
          <div className={`rounded-2xl p-4 border ${cardClass}`}>
            <p className={`text-sm font-semibold ${textClass}`}>
              How much to keep offline
            </p>
            <div className="mt-3 space-y-2">
              {RANGES.map(({ id, label, hint }) => {
                const selected = range === id;
                const n = countFor(id);
                const offlineDisabled = !online && !syncing;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={syncing || !canSync}
                    aria-disabled={!online || !canSync}
                    onClick={() => runSync(id)}
                    aria-label={label}
                    aria-pressed={selected}
                    className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left active:scale-[0.97] transition-transform disabled:opacity-50 ${offlineDisabled ? "opacity-50 cursor-not-allowed" : ""} ${
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
              disabled={syncing || !canSync}
              aria-disabled={!online || !canSync}
              onClick={() => runSync()}
              aria-label="Sync now"
              className={`w-full min-h-[48px] mt-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50 ${!online && !syncing ? "opacity-50 cursor-not-allowed" : ""} ${
                isDark
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-500 text-white"
              }`}
            >
              <FiRefreshCw size={18} />
              {syncing ? "Sync in progress…" : "Sync now"}
            </button>

            {syncing && progress && progress.total > 0 && (
              <p className={`text-sm text-center mt-3 ${textClass}`}>
                Syncing {progress.done} / {progress.total} — {labelFor(progress.currentLabel)}
              </p>
            )}
            {syncing && (!progress || progress.total === 0) && (
              <p className={`text-sm text-center mt-3 ${textClass}`}>
                Syncing…
              </p>
            )}

            <p className={`text-xs text-center mt-3 ${mutedClass}`}>
              {(lastCompletedAt || (overview && overview.lastSynced)) ? (
                <>
                  Last synced: {formatRelativeTime(lastCompletedAt || overview.lastSynced)}
                  {overview && overview.calendars
                    ? ` · ${overview.calendars} calendars`
                    : ""}
                </>
              ) : (
                "Not synced yet — tap Sync now to save schedules offline."
              )}
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
        </PullToRefresh>
      </main>
    </div>
  );
};

export default SyncPage;
