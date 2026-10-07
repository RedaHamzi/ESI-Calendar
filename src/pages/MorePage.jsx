/* eslint-disable react/prop-types */
import { Suspense, lazy } from "react";
import {
  FiRefreshCw,
  FiHelpCircle,
  FiInfo,
  FiChevronRight,
} from "react-icons/fi";
import PageHeader from "../components/PageHeader";
import ThemeToggle from "../components/ThemeToggle";
import HelpPage from "./HelpPage";

const SyncPage = lazy(() => import("./SyncPage"));

const MENU = [
  {
    id: "sync",
    label: "Sync",
    description: "Keep schedules available offline",
    Icon: FiRefreshCw,
  },
  {
    id: "help",
    label: "Help",
    description: "What this app does and how to use it",
    Icon: FiHelpCircle,
  },
  {
    id: "about",
    label: "About",
    description: "Version and source",
    Icon: FiInfo,
  },
];

const MorePage = ({ isDark, setIsDark, view, setView }) => {
  const current = view || "menu";
  const goMenu = () => setView("menu");

  const cardClass = isDark
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-purple-200";
  const textClass = isDark ? "text-white" : "text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";
  const rowHover = isDark ? "hover:bg-white/10" : "hover:bg-purple-50";
  const chevronClass = isDark ? "text-slate-400" : "text-gray-400";

  if (current === "sync") {
    return (
      <Suspense fallback={null}>
        <SyncPage isDark={isDark} onBack={goMenu} />
      </Suspense>
    );
  }
  if (current === "help") {
    return <HelpPage isDark={isDark} onBack={goMenu} />;
  }

  return (
    <div>
      <PageHeader
        title={current === "about" ? "About" : "More"}
        isDark={isDark}
        onBack={current === "about" ? goMenu : undefined}
        action={
          current === "menu" ? (
            <ThemeToggle isDark={isDark} setIsDark={setIsDark} />
          ) : undefined
        }
      />
      <main className="content-area content-with-tabs px-4">
        <div className="max-w-md mx-auto space-y-4">
          {current === "menu" && (
            <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
              {MENU.map(({ id, label, description, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
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
          )}

          {current === "about" && (
            <div className={`rounded-2xl p-6 border text-center ${cardClass}`}>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  isDark ? "bg-indigo-600" : "bg-indigo-500"
                }`}
              >
                <FiInfo size={22} className="text-white" />
              </div>
              <h2 className={`font-semibold text-lg ${textClass}`}>
                ESI Calendar
              </h2>
              <p className={`text-sm mt-1 ${subClass}`}>
                Your academic schedule, simplified. Schedules load online
                from Google Calendar and stay available offline after a
                sync.
              </p>
              <a
                className={`inline-flex items-center justify-center gap-2 mt-4 text-sm min-h-[44px] px-4 ${
                  isDark ? "text-purple-300" : "text-purple-500"
                }`}
                href="https://github.com/RedaHamzi/ESI-Calendar"
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub Repository
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MorePage;
