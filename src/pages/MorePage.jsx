/* eslint-disable react/prop-types */
import {
  FiRefreshCw,
  FiHelpCircle,
  FiInfo,
  FiChevronRight,
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

const MorePage = ({ isDark, setIsDark }) => {
  const [, navigate] = useLocation();

  const cardClass = isDark
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-purple-200";
  const textClass = isDark ? "text-white" : "text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";
  const rowHover = isDark ? "hover:bg-white/10" : "hover:bg-purple-50";
  const chevronClass = isDark ? "text-slate-400" : "text-gray-400";

  return (
    <div>
      <PageHeader
        title="More"
        isDark={isDark}
        action={<ThemeToggle isDark={isDark} setIsDark={setIsDark} />}
      />
      <main className="content-area page-content px-4">
        <div className="max-w-md mx-auto space-y-4">
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
