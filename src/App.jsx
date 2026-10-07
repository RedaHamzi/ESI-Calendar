import { useState, useEffect, lazy, Suspense } from "react";
import BottomTabBar from "./components/BottomTabBar";
import SchedulePage from "./pages/SchedulePage";
import TeachersPage from "./pages/TeachersPage";
import SessionsPage from "./pages/SessionsPage";
import MorePage from "./pages/MorePage";
import { classes, groups } from "./data/data";
import { applyStatusBarTheme } from "./utils/capacitor";
import { loadLastSelection } from "./utils/history";

const DebugSync = lazy(() => import("./pages/DebugSync"));

function App() {
  const [list, setList] = useState(classes[0]);
  const [type, setType] = useState("class");
  const [tab, setTab] = useState("schedule");
  const [isDark, setIsDark] = useState(true);

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
          />
        </div>
        <div className={tab === "teachers" ? "" : "hidden"}>
          <TeachersPage isDark={isDark} setIsDark={setIsDark} />
        </div>
        <div className={tab === "sessions" ? "" : "hidden"}>
          <SessionsPage isDark={isDark} setIsDark={setIsDark} />
        </div>
        <div className={tab === "more" ? "" : "hidden"}>
          <MorePage isDark={isDark} setIsDark={setIsDark} />
        </div>
      </div>

      <BottomTabBar active={tab} onChange={setTab} isDark={isDark} />
    </div>
  );
}

export default App;
