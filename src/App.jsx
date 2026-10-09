/* eslint-disable react/prop-types */
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Router, Route, Switch, useLocation } from "wouter";
import { App as CapApp } from "@capacitor/app";
import BottomTabBar from "./components/BottomTabBar";
import Toast from "./components/Toast";
import GlobalToast from "./components/GlobalToast";
import ConfirmDialog from "./components/ConfirmDialog";
import SyncBanner from "./components/SyncBanner";
import SchedulePage from "./pages/SchedulePage";
import TeachersPage from "./pages/TeachersPage";
import SessionsPage from "./pages/SessionsPage";
import MorePage from "./pages/MorePage";
import HelpPage from "./pages/HelpPage";
import AboutPage from "./pages/AboutPage";
import useOnlineStatus from "./hooks/useOnlineStatus";
import useBackButton from "./hooks/useBackButton";
import { classes, groups } from "./data/data";
import { applyStatusBarTheme } from "./utils/capacitor";
import { loadLastSelection } from "./utils/history";

import { useAppStore } from "./store/appStore";

const DebugSync = lazy(() => import("./pages/DebugSync"));
const SyncPage = lazy(() => import("./pages/SyncPage"));

const SCHEDULE_MODE_KEY = "esi-schedule-mode";

function tabForLocation(path) {
  if (path === "/") return "schedule";
  if (path.startsWith("/teachers")) return "teachers";
  if (path.startsWith("/sessions")) return "sessions";
  return "more";
}

function Shell({
  list,
  setList,
  type,
  setType,
  isDark,
  setIsDark,
  toast,
  setToast,
  teacherFocus,
  scheduleMode,
  effScheduleOffline,
  pickScheduleMode,
  goSync,
  seeTeacher,
  seeGroup,
}) {
  const [location, navigate] = useLocation();
  const [showExit, setShowExit] = useState(false);
  const requestExit = useCallback(() => setShowExit(true), []);
  const confirmExit = useCallback(() => {
    setShowExit(false);
    try {
      CapApp.exitApp();
    } catch (e) {
      console.error(`Shell/confirmExit: ${e && e.message ? e.message : e}`);
    }
  }, []);

  useBackButton({ location, navigate, onRequestExit: requestExit });

  const activeTab = tabForLocation(location);
  const changeTab = (id) => {
    if (id === "schedule") navigate("/");
    else if (id === "teachers") navigate("/teachers");
    else if (id === "sessions") navigate("/sessions");
    else navigate("/more");
  };

  const themeClasses = isDark
    ? "min-h-screen-mobile bg-slate-900"
    : "min-h-screen-mobile bg-blue-50";

  return (
    <div className={`${themeClasses} h-[100vh] flex flex-col overflow-hidden`}>
      <SyncBanner isDark={isDark} />
      {/* Main content scrolls; header (per page) and tab bar stay fixed */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <Switch>
          <Route path="/">
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
          </Route>
          <Route path="/teachers">
            <TeachersPage
              isDark={isDark}
              setIsDark={setIsDark}
              onGoSync={goSync}
              focusTeacher={teacherFocus}
            />
          </Route>
          <Route path="/sessions">
            <SessionsPage
              isDark={isDark}
              setIsDark={setIsDark}
              onGoSync={goSync}
              onSeeTeacher={seeTeacher}
              onSeeGroup={seeGroup}
            />
          </Route>
          <Route path="/more/sync">
            <Suspense fallback={null}>
              <SyncPage isDark={isDark} />
            </Suspense>
          </Route>
          <Route path="/more/help">
            <HelpPage isDark={isDark} />
          </Route>
          <Route path="/more/about">
            <AboutPage isDark={isDark} />
          </Route>
          <Route path="/more">
            <MorePage isDark={isDark} setIsDark={setIsDark} />
          </Route>
        </Switch>
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

      <GlobalToast isDark={isDark} />

      {showExit && (
        <ConfirmDialog
          title="Close ESI Calendar?"
          message="Are you sure you want to exit the app?"
          confirmLabel="Close"
          isDark={isDark}
          onCancel={() => setShowExit(false)}
          onConfirm={confirmExit}
        />
      )}

      <BottomTabBar active={activeTab} onChange={changeTab} isDark={isDark} />
    </div>
  );
}

function App() {
  const [list, setList] = useState(classes[0]);
  const [type, setType] = useState("class");
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

  // Single storage open for the whole app. App root is the ONLY
  // getStorage() caller — every other module reads the adapter from the
  // store (native: SQLite, web: Dexie/IndexedDB).
  // No silent sync: sync happens only when the user taps a Sync button.
  useEffect(() => {
    let cancelled = false;
    const initDb = async () => {
      try {
        const { getStorage } = await import("./services/storage/index");
        const storage = await getStorage();
        if (cancelled) return;
        useAppStore.getState().setDb(storage);
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

  if (typeof window !== 'undefined' &&
      window.localStorage.getItem('esi-debug') === '1') {
    return (
      <Suspense fallback={null}>
        <DebugSync />
      </Suspense>
    );
  }

  return (
    <Router>
      <RouteShell
        list={list}
        setList={setList}
        type={type}
        setType={setType}
        isDark={isDark}
        setIsDark={setIsDark}
        toast={toast}
        setToast={setToast}
        teacherFocus={teacherFocus}
        setTeacherFocus={setTeacherFocus}
        scheduleMode={scheduleMode}
        effScheduleOffline={effScheduleOffline}
        pickScheduleMode={pickScheduleMode}
      />
    </Router>
  );
}

// Route-aware navigations live here so they can call useLocation's
// navigate (hooks can't run in the Router-owning component itself).
function RouteShell(props) {
  const [, navigate] = useLocation();

  const goSync = () => {
    navigate("/more/sync");
  };

  const seeTeacher = (name) => {
    props.setTeacherFocus({ name, ts: Date.now() });
    navigate("/teachers");
  };

  const seeGroup = (entryType, entry) => {
    if (!entry) return;
    props.setType(entryType === "group" ? "group" : "class");
    props.setList(entry);
    navigate("/");
  };

  return (
    <Shell
      {...props}
      goSync={goSync}
      seeTeacher={seeTeacher}
      seeGroup={seeGroup}
    />
  );
}

export default App;
