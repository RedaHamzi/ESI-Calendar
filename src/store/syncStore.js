import { create } from "zustand";
import { notifyOffline, useToastStore } from "./toastStore";
import { listYears } from "../services/years";

// Global sync state. This store lives at the module level, so the sync
// promise created by start() survives any component unmount — navigating
// to another tab mid-sync keeps the state (and the banner) updating.
// Truly continuing while the APP is backgrounded (Android home button) is
// out of scope: this only covers in-app navigation.

const RANGE_KEY = "esi-sync-range";
const YEARS_KEY = "esi-sync-years";
const INCOMPLETE_KEY = "esi-sync-incomplete";
const IN_PROGRESS_KEY = "esi-sync-in-progress";
const IN_PROGRESS_STALE_MS = 7 * 24 * 3600 * 1000;

function readStoredYears() {
  try {
    const raw = localStorage.getItem(YEARS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const known = new Set(listYears());
    const kept = parsed.filter((y) => known.has(y));
    if (kept.length === 0) return null;
    return kept;
  } catch (e) {
    return null;
  }
}

function writeStoredYears(years) {
  try {
    if (years == null) localStorage.removeItem(YEARS_KEY);
    else localStorage.setItem(YEARS_KEY, JSON.stringify(years));
  } catch (e) {
    console.error(`syncStore/writeStoredYears: ${e && e.message ? e.message : e}`);
  }
}

function readStoredRange() {
  try {
    const stored = localStorage.getItem(RANGE_KEY);
    if (stored === "week" || stored === "month") return stored;
    return "month";
  } catch (e) {
    return "month";
  }
}

function readStoredIncomplete() {
  try {
    const raw = localStorage.getItem(INCOMPLETE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return null;
  } catch (e) {
    console.error(`syncStore/readStoredIncomplete: ${e && e.message ? e.message : e}`);
    return null;
  }
}

function writeIncomplete(info) {
  try {
    if (!info) localStorage.removeItem(INCOMPLETE_KEY);
    else localStorage.setItem(INCOMPLETE_KEY, JSON.stringify(info));
  } catch (e) {
    console.error(`syncStore/writeIncomplete: ${e && e.message ? e.message : e}`);
  }
}

function writeInProgress(info) {
  try {
    if (!info) localStorage.removeItem(IN_PROGRESS_KEY);
    else localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(info));
  } catch (e) {
    console.error(`syncStore/writeInProgress: ${e && e.message ? e.message : e}`);
  }
}

// Killed-app detection: if a previous sync wrote the in-progress flag but
// the app died before reaching a terminal state, the flag is still here on
// the next launch. Stale (>7 days) or corrupt flags are cleared silently and
// show no banner. A live flag is NEVER cleared here — only a successful
// fresh sync (or an explicit in-app terminal state) removes it.
function readStoredInProgress() {
  let raw = null;
  try {
    raw = localStorage.getItem(IN_PROGRESS_KEY);
  } catch (e) {
    console.error(`syncStore/readStoredInProgress: ${e && e.message ? e.message : e}`);
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("bad shape");
    const startedAt = Number(parsed.startedAt);
    if (!Number.isFinite(startedAt)) throw new Error("bad startedAt");
    if (Date.now() - startedAt > IN_PROGRESS_STALE_MS) {
      try {
        localStorage.removeItem(IN_PROGRESS_KEY);
      } catch (e) {
        console.error(`syncStore/readStoredInProgress: clear stale failed: ${e && e.message ? e.message : e}`);
      }
      return null;
    }
    return parsed;
  } catch (e) {
    console.error(`syncStore/readStoredInProgress: ${e && e.message ? e.message : e}`);
    try {
      localStorage.removeItem(IN_PROGRESS_KEY);
    } catch (err) {
      console.error(`syncStore/readStoredInProgress: clear corrupt failed: ${err && err.message ? err.message : err}`);
    }
    return null;
  }
}

const storedIncomplete = readStoredIncomplete();
const storedInProgress = storedIncomplete ? null : readStoredInProgress();
const interruptedLaunch =
  !!storedInProgress &&
  (storedInProgress.range === "week" || storedInProgress.range === "month");

export const useSyncStore = create((set, get) => ({
  // "idle" | "running" | "done" | "incomplete" | "error"
  status: storedIncomplete || interruptedLaunch ? "incomplete" : "idle",
  // True only when this launch found a live in-progress flag (killed app).
  // Drives the "Sync stopped. Tap to continue." banner copy.
  interrupted: interruptedLaunch,
  progress: {
    done: storedIncomplete ? Number(storedIncomplete.done) || 0 : 0,
    total: storedIncomplete ? Number(storedIncomplete.total) || 0 : 0,
    currentLabel: "",
  },
  lastError: null,
  lastCompletedAt: null,
  lastRange:
    storedIncomplete && (storedIncomplete.range === "week" || storedIncomplete.range === "month")
      ? storedIncomplete.range
      : interruptedLaunch
        ? storedInProgress.range
        : readStoredRange(),
  // null = all years (default); otherwise the last-used year selection.
  // Persisted in localStorage['esi-sync-years']; unknown values dropped on read.
  lastYears: readStoredYears(),
  lastSummary: null,

  cancelRequested: false,
  requestCancel: () => set({ cancelRequested: true }),

  dismiss: () => set({ status: "idle", lastError: null, interrupted: false }),

  start: async (range, { years } = {}) => {
    if (get().status === "running") return null;
    const chosen = range === "week" ? "week" : "month";
    // Empty-selection guard: never start a sync with no years picked.
    // Status is left untouched; the Sync page also disables the button.
    if (Array.isArray(years) && years.length === 0) {
      console.error("syncStore/start: no years selected, sync not started");
      try {
        useToastStore.getState().showToast("Pick at least one year.");
      } catch (e) {
        console.error(`syncStore/start: toast failed: ${e && e.message ? e.message : e}`);
      }
      return null;
    }
    const chosenYears = years == null ? null : [...years];
    writeStoredYears(chosenYears);
    // Central offline gate: no caller can bypass this. Shows the exact
    // offline toast, leaves status untouched, never calls syncAll.
    // Mid-sync disconnects keep the existing per-URL error path in syncAll.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      console.error("syncStore/start: offline, sync not started");
      notifyOffline();
      return null;
    }
    // NOTE: the production-web sync gate lives after the sync chunk loads
    // (see below) so the in-progress flag written above is always cleared
    // on that early return.
    try {
      localStorage.setItem(RANGE_KEY, chosen);
    } catch (e) {
      console.error(`syncStore/start: persist range failed: ${e && e.message ? e.message : e}`);
    }
    writeIncomplete(null);
    writeInProgress({ startedAt: Date.now(), range: chosen });
    set({
      status: "running",
      progress: { done: 0, total: 0, currentLabel: "" },
      lastError: null,
      lastSummary: null,
      cancelRequested: false,
      lastRange: chosen,
      lastYears: chosenYears,
      interrupted: false,
    });

    // Dynamic import keeps the heavy ICS/SQLite sync chunk out of the
    // initial bundle (SyncPage lazy-loads it today for the same reason).
    let progressSeen = false;
    try {
      const { syncAll, getCalendarUrls, getCalendarUrlsByYears } = await import("../services/sync");
      const urls = chosenYears == null ? getCalendarUrls() : getCalendarUrlsByYears(chosenYears);
      const result = await syncAll(
        urls,
        (done, total, currentUrl) => {
          progressSeen = true;
          set({ progress: { done, total, currentLabel: currentUrl } });
        },
        { range: chosen },
      );
      if (get().cancelRequested) {
        const p = get().progress;
        writeIncomplete({ range: chosen, done: p.done, total: p.total, at: Date.now() });
        writeInProgress(null);
        set({ status: "incomplete" });
        return result;
      }
      if (
        result &&
        Number(result.failed) > 0 &&
        Number(result.updated) === 0 &&
        Number(result.unchanged) === 0
      ) {
        const msg = `${result.failed} calendar(s) failed`;
        console.error(`syncStore/start: ${msg}`);
        writeInProgress(null);
        set({ status: "error", lastError: msg, lastSummary: result });
        return result;
      }
      writeInProgress(null);
      set({ status: "done", lastCompletedAt: Date.now(), lastSummary: result });
      return result;
    } catch (e) {
      const msg = (e && e.message) || String(e);
      console.error(`syncStore/start: ${msg}`);
      // Resume is a plain re-run: ETag caching 304-skips already-synced
      // calendars, so no per-calendar resume cursor is needed. progress
      // (done/total at failure time) is the record of what is pending.
      if (progressSeen || get().cancelRequested) {
        const p = get().progress;
        writeIncomplete({ range: chosen, done: p.done, total: p.total, at: Date.now() });
        writeInProgress(null);
        set({ status: "incomplete", lastError: msg });
      } else {
        writeInProgress(null);
        set({ status: "error", lastError: msg });
      }
      return null;
    }
  },
}));

export default useSyncStore;
