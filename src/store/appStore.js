import { create } from "zustand";

const initialSyncProgress = { done: 0, total: 0, currentLabel: "" };

export const useAppStore = create((set, get) => ({
  // Persistent connection (set once by App root)
  db: null,
  dbReady: false,
  dbError: null,

  // Data volume — drives CASE A/B/C/D
  sessionCount: 0,
  calendarsSynced: 0,
  lastSyncedAt: null,

  // Sync progress
  syncStatus: "idle", // "idle" | "running" | "done" | "error"
  syncProgress: { ...initialSyncProgress },
  syncError: null,

  // Actions
  setDb: (db) => set({ db, dbReady: true, dbError: null }),
  setDbError: (e) => set({ dbError: String(e && e.message ? e.message : e), dbReady: false }),

  refreshCounts: async () => {
    const { db } = get();
    if (!db) {
      console.warn("appStore/refreshCounts: no db connection yet");
      return;
    }
    try {
      const { countSessions, getSyncOverview } = await import("../services/db");
      const sessionCount = await countSessions(db);
      const overview = await getSyncOverview(db);
      set({
        sessionCount,
        calendarsSynced: Number(overview.calendars) || 0,
        lastSyncedAt: overview.lastSynced != null ? Number(overview.lastSynced) : null,
      });
    } catch (e) {
      console.error(`appStore/refreshCounts: ${e && e.message ? e.message : e}`);
    }
  },

  setSyncStatus: (s) => set({ syncStatus: s }),
  setSyncProgress: (p) => set({ syncProgress: { ...initialSyncProgress, ...p } }),
  setSyncError: (e) => set({ syncError: e == null ? null : String(e && e.message ? e.message : e) }),

  reset: () =>
    set({
      db: null,
      dbReady: false,
      dbError: null,
      sessionCount: 0,
      calendarsSynced: 0,
      lastSyncedAt: null,
      syncStatus: "idle",
      syncProgress: { ...initialSyncProgress },
      syncError: null,
    }),
}));

export default useAppStore;
