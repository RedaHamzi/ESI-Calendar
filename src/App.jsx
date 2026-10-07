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

const DebugSync = lazy(() => import("./pages/DebugSync"));

const FIRST_SYNC_KEY = "esi-first-sync-done";

function App() {
  const [list, setList] = useState(classes[0]);
  const [type, setType] = useState("class");
  const [tab, setTab] = useState("schedule");
  const [moreView, setMoreView] = useState("menu");
  const [isDark, setIsDark] = useState(true);
  const [toast, setToast] = useState(null);
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

  // Silent first-launch background sync (default year range). Never blocks
  // the UI and never shows user-facing errors.
  useEffect(() => {
    let cancelled = false;
    const maybeFirstSync = async () => {
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        if (localStorage.getItem(FIRST_SYNC_KEY)) return;
        const { openDb, countSessions } = await import("./services/db");
        const db = await openDb();
        if (cancelled) return;
        const total = await countSessions(db);
        if (total > 0) {
          try {
            localStorage.setItem(FIRST_SYNC_KEY, "1");
          } catch (e) {
            // storage unavailable — will retry next launch
          }
          return;
        }
        const { syncAll, getCalendarUrls } = await import("./services/sync");
        if (cancelled) return;
        await syncAll(getCalendarUrls(), undefined, { range: "year" });
        if (!cancelled) {
          try {
            localStorage.setItem(FIRST_SYNC_KEY, "1");
          } catch (e) {
            // storage unavailable — will retry next launch
          }
        }
      } catch (e) {
        console.warn("first-launch background sync skipped:", e?.message || e);
      }
    };
    maybeFirstSync();
    return () => {
      cancelled = true;
    };
  }, []);

  const goSync = () => {
    setMoreView("sync");
    setTab("more");
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
      <div className="flex-1 overflow-y-auto">
        <div className={tab === "schedule" ? "" : "hidden"}>
          <SchedulePage
            list={list}
            setList={setList}
            type={type}
            setType={setType}
            isDark={isDark}
            setIsDark={setIsDark}
            isOffline={!online}
            onGoSync={goSync}
          />
        </div>
        <div className={tab === "teachers" ? "" : "hidden"}>
          <TeachersPage isDark={isDark} setIsDark={setIsDark} />
        </div>
        <div className={tab === "sessions" ? "" : "hidden"}>
          <SessionsPage isDark={isDark} setIsDark={setIsDark} />
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
