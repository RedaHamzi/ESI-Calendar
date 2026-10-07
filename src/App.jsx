import { useState, useEffect, useRef, lazy, Suspense } from "react";
import BottomTabBar from "./components/BottomTabBar";
import Toast from "./components/Toast";
import SchedulePage from "./pages/SchedulePage";
import TeachersPage from "./pages/TeachersPage";
import SessionsPage from "./pages/SessionsPage";
import MorePage from "./pages/MorePage";
import useOnlineStatus from "./hooks/useOnlineStatus";
import { classes, groups } from "./data/data";
import { applyStatusBarTheme } from "./utils/capacitor";
import { loadLastSelection } from "./utils/history";

import { useAppStore } from "./store/appStore";

const DebugSync = lazy(() => import("./pages/DebugSync"));

const SCHEDULE_MODE_KEY = "esi-schedule-mode";

function App() {
  const [list, setList] = useState(classes[0]);
  const [type, setType] = useState("class");
  const [tab, setTab] = useState("schedule");
  const [moreView, setMoreView] = useState("menu");
  const [isDark, setIsDark] = useState(true);
  const [toast, setToast] = useState(null);
  const [teacherFocus, setTeacherFocus] = useState(null);
  const [scheduleMode, setScheduleMode] = useState(() => {
    try {
      return localStorage.getItem(SCHEDULE_MODE_KEY);
    } catch (e) {
      return null;
    }
  });
  // Ephemeral auto-switch: Online picked while offline renders the cached
  // view for this session only. Never persisted.
  const [offlineOverride, setOfflineOverride] = useState(false);
  const online = useOnlineStatus();
  const prevOnline = useRef(null);

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem("esi-calendar-theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    } else {
      setIsDark(true);
    }

    // Restore the last selected class/group across restarts
    const last = loadLastSelection();
    if (last) {
      const catalog = last.type === "class" ? classes : groups;
      const found = catalog.find((entry) => entry.title === last.title);
      if (found) {
        setType(last.type);
        setList(found);
      }
    }

    // Add mobile-specific classes
    document.body.classList.add("no-select", "scroll-smooth");

    return () => {
      document.body.classList.remove("no-select", "scroll-smooth");
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("esi-calendar-theme", isDark ? "dark" : "light");

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    applyStatusBarTheme(isDark);
  }, [isDark]);

  // Offline toast: on first launch while offline, and on online → offline.
  useEffect(() => {
    if (prevOnline.current === null) {
      prevOnline.current = online;
      if (!online) {
        setToast({ id: "offline-first", message: "You're offline. Connect to sync." });
      }
      return;
    }
    if (prevOnline.current && !online) {
      setToast({ id: `offline-${Date.now()}`, message: "You're offline. Showing cached schedule.", action: "Sync" });
    }
    prevOnline.current = online;
  }, [online]);

  // The ephemeral offline render ends as soon as connectivity returns.
  useEffect(() => {
    if (online) setOfflineOverride(false);
  }, [online]);

  // Manual schedule mode: 'offline' ignores navigator.onLine; anything else
  // follows it. Picking Online while offline only auto-switches this render.
  const effScheduleOffline =
    scheduleMode === "offline" || offlineOverride || (scheduleMode !== "online" && !online);

  const pickScheduleMode = (mode) => {
    if (mode === "online" && !online) {
      setToast({ id: `offline-toggle-${Date.now()}`, message: "You're offline. Showing cached schedule.", action: "Sync" });
      setOfflineOverride(true);
      return;
    }
    setOfflineOverride(false);
    setScheduleMode(mode);
    try {
      localStorage.setItem(SCHEDULE_MODE_KEY, mode);
    } catch (e) {
      // storage unavailable — choice lasts this session only
    }
  };

  // Single DB open for the whole app. App root is the ONLY openDb()
  // caller — every other module reads the connection from the store.
  // No silent sync: sync happens only when the user taps a Sync button.
  useEffect(() => {
    let cancelled = false;
    const initDb = async () => {
      try {
        const { openDb } = await import("./services/db");
        const db = await openDb();
        if (cancelled) return;
        useAppStore.getState().setDb(db);
        await useAppStore.getState().refreshCounts();
      } catch (e) {
        if (!cancelled) {
          console.error(`App/initDb: ${e && e.message ? e.message : e}`);
          useAppStore.getState().setDbError(e && e.message ? e.message : String(e));
        }
      }
    };
    initDb();
    return () => {
      cancelled = true;
    };
  }, []);

  const goSync = () => {
    setMoreView("sync");
    setTab("more");
  };

  const seeTeacher = (name) => {
    setTeacherFocus({ name, ts: Date.now() });
    setTab("teachers");
  };

  const seeGroup = (entryType, entry) => {
    if (!entry) return;
    setType(entryType === "group" ? "group" : "class");
    setList(entry);
    setTab("schedule");
  };

  const themeClasses = isDark
    ? "min-h-screen-mobile bg-slate-900"
    : "min-h-screen-mobile bg-blue-50";

  if (typeof window !== 'undefined' &&
      window.localStorage.getItem('esi-debug') === '1') {
    return (
      <Suspense fallback={null}>
        <DebugSync />
      </Suspense>
    );
  }

  return (
    <div className={`${themeClasses} h-[100vh] flex flex-col overflow-hidden`}>
      {/* Main content scrolls; header (per page) and tab bar stay fixed */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className={tab === "schedule" ? "" : "hidden"}>
          <SchedulePage
            list={list}
            setList={setList}
            type={type}
            setType={setType}
            isDark={isDark}
            setIsDark={setIsDark}
            isOffline={effScheduleOffline}
            scheduleMode={scheduleMode}
            onPickScheduleMode={pickScheduleMode}
            onGoSync={goSync}
          />
        </div>
        <div className={tab === "teachers" ? "" : "hidden"}>
          <TeachersPage
            isDark={isDark}
            setIsDark={setIsDark}
            onGoSync={goSync}
            focusTeacher={teacherFocus}
          />
        </div>
        <div className={tab === "sessions" ? "" : "hidden"}>
          <SessionsPage
            isDark={isDark}
            setIsDark={setIsDark}
            onGoSync={goSync}
            onSeeTeacher={seeTeacher}
            onSeeGroup={seeGroup}
          />
        </div>
        <div className={tab === "more" ? "" : "hidden"}>
          <MorePage
            isDark={isDark}
            setIsDark={setIsDark}
            view={moreView}
            setView={setMoreView}
          />
        </div>
      </div>

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.action}
          onAction={toast.action ? goSync : undefined}
          onClose={() => setToast(null)}
          isDark={isDark}
        />
      )}

      <BottomTabBar active={tab} onChange={setTab} isDark={isDark} />
    </div>
  );
}

export default App;
