/* eslint-disable react/prop-types */
import {
  FiRefreshCw,
  FiHelpCircle,
  FiInfo,
  FiChevronRight,
  FiSun,
  FiMoon,
  FiCloud,
  FiCloudOff,
} from "react-icons/fi";
import { useLocation } from "wouter";
import PageHeader from "../components/PageHeader";
import ThemeToggle from "../components/ThemeToggle";

const MENU = [
  {
    id: "sync",
    label: "Sync",
    description: "Keep schedules available offline",
    Icon: FiRefreshCw,
    path: "/more/sync",
  },
  {
    id: "help",
    label: "Help",
    description: "What this app does and how to use it",
    Icon: FiHelpCircle,
    path: "/more/help",
  },
  {
    id: "about",
    label: "About",
    description: "Version and source",
    Icon: FiInfo,
    path: "/more/about",
  },
];

const MorePage = ({ isDark, setIsDark, isOffline, onPickScheduleMode }) => {
  const [, navigate] = useLocation();

  const cardClass = isDark
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-purple-200";
  const textClass = isDark ? "text-white" : "text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";
  const rowHover = isDark ? "hover:bg-white/10" : "hover:bg-purple-50";
  const chevronClass = isDark ? "text-slate-400" : "text-gray-400";
  // Segmented controls mirror MiniNavigator: solid indigo when active.
  const segWrap = isDark
    ? "bg-slate-900/60 border-white/20"
    : "bg-white border-purple-200";
  const segActive = isDark ? "bg-indigo-600 text-white" : "bg-indigo-500 text-white";
  const segInactive = isDark
    ? "text-purple-100 hover:text-white"
    : "text-purple-600 hover:text-purple-800";

  const segBtn =
    "flex-1 min-h-[44px] py-2.5 px-3 rounded-xl active:scale-[0.97] transition-all duration-200 font-medium text-sm";

  return (
    <div>
      <PageHeader
        title="More"
        isDark={isDark}
        action={<ThemeToggle isDark={isDark} setIsDark={setIsDark} />}
      />
      <main className="content-area page-content px-4">
        <div className="max-w-md mx-auto space-y-4">
          <div className={`rounded-2xl border p-4 ${cardClass}`}>
            <h2 className={`font-semibold text-base ${textClass}`}>
              Settings
            </h2>
            <div className="mt-3 space-y-4">
              <div>
                <p className={`font-medium text-sm ${textClass}`}>
                  Appearance
                </p>
                <p className={`text-xs mt-0.5 ${subClass}`}>
                  Switch the whole app between dark and light
                </p>
                <div
                  role="group"
                  aria-label="Appearance"
                  className={`mt-2 flex items-center rounded-2xl p-1 border ${segWrap}`}
                >
                  <button
                    type="button"
                    aria-pressed={!isDark}
                    onClick={() => setIsDark(false)}
                    className={`${segBtn} ${!isDark ? segActive : segInactive}`}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <FiSun size={16} /> Light
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={isDark}
                    onClick={() => setIsDark(true)}
                    className={`${segBtn} ${isDark ? segActive : segInactive}`}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <FiMoon size={16} /> Dark
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <p className={`font-medium text-sm ${textClass}`}>
                  Schedule mode
                </p>
                <p className={`text-xs mt-0.5 ${subClass}`}>
                  Live Google Calendar or the synced offline copy
                </p>
                <div
                  role="group"
                  aria-label="Schedule mode"
                  className={`mt-2 flex items-center rounded-2xl p-1 border ${segWrap}`}
                >
                  <button
                    type="button"
                    aria-pressed={!isOffline}
                    onClick={() => onPickScheduleMode && onPickScheduleMode("online")}
                    className={`${segBtn} ${!isOffline ? segActive : segInactive}`}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <FiCloud size={16} /> Online
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={!!isOffline}
                    onClick={() => onPickScheduleMode && onPickScheduleMode("offline")}
                    className={`${segBtn} ${isOffline ? segActive : segInactive}`}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <FiCloudOff size={16} /> Offline
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
            {MENU.map(({ id, label, description, Icon, path }) => (
              <button
                key={id}
                type="button"
                onClick={() => navigate(path)}
                aria-label={label}
                className={`w-full min-h-[56px] px-4 py-3 flex items-center gap-3 text-left active:scale-[0.97] transition-transform ${rowHover}`}
              >
                <span
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                    isDark ? "bg-indigo-600" : "bg-indigo-500"
                  }`}
                >
                  <Icon size={18} className="text-white" />
                </span>
                <span className="flex-1">
                  <span className={`block font-medium ${textClass}`}>
                    {label}
                  </span>
                  <span className={`block text-xs ${subClass}`}>
                    {description}
                  </span>
                </span>
                <FiChevronRight size={18} className={chevronClass} />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MorePage;
