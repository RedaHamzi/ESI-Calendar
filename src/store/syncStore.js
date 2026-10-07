import { create } from "zustand";

// Global sync state. This store lives at the module level, so the sync
// promise created by start() survives any component unmount — navigating
// to another tab mid-sync keeps the state (and the banner) updating.
// Truly continuing while the APP is backgrounded (Android home button) is
// out of scope: this only covers in-app navigation.

const RANGE_KEY = "esi-sync-range";
const INCOMPLETE_KEY = "esi-sync-incomplete";

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

const storedIncomplete = readStoredIncomplete();

export const useSyncStore = create((set, get) => ({
  // "idle" | "running" | "done" | "incomplete" | "error"
  status: storedIncomplete ? "incomplete" : "idle",
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
      : readStoredRange(),
  lastSummary: null,

  cancelRequested: false,
  requestCancel: () => set({ cancelRequested: true }),

  dismiss: () => set({ status: "idle", lastError: null }),

  start: async (range) => {
    if (get().status === "running") return null;
    const chosen = range === "week" ? "week" : "month";
    try {
      localStorage.setItem(RANGE_KEY, chosen);
    } catch (e) {
      console.error(`syncStore/start: persist range failed: ${e && e.message ? e.message : e}`);
    }
    writeIncomplete(null);
    set({
      status: "running",
      progress: { done: 0, total: 0, currentLabel: "" },
      lastError: null,
      lastSummary: null,
      cancelRequested: false,
      lastRange: chosen,
    });

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const msg = "You are offline. Connect to sync.";
      console.error(`syncStore/start: ${msg}`);
      set({ status: "error", lastError: msg });
      return null;
    }

    // Dynamic import keeps the heavy ICS/SQLite sync chunk out of the
    // initial bundle (SyncPage lazy-loads it today for the same reason).
    let progressSeen = false;
    try {
      const { syncAll, getCalendarUrls } = await import("../services/sync");
      const result = await syncAll(
        getCalendarUrls(),
        (done, total, currentUrl) => {
          progressSeen = true;
          set({ progress: { done, total, currentLabel: currentUrl } });
        },
        { range: chosen },
      );
      if (get().cancelRequested) {
        const p = get().progress;
        writeIncomplete({ range: chosen, done: p.done, total: p.total, at: Date.now() });
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
        set({ status: "error", lastError: msg, lastSummary: result });
        return result;
      }
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
        set({ status: "incomplete", lastError: msg });
      } else {
        set({ status: "error", lastError: msg });
      }
      return null;
    }
  },
}));

export default useSyncStore;
