/* eslint-disable react/prop-types */
import { FiCalendar, FiUser, FiList, FiMenu } from "react-icons/fi";

const TABS = [
  { id: "schedule", label: "Schedule", Icon: FiCalendar },
  { id: "teachers", label: "Teachers", Icon: FiUser },
  { id: "sessions", label: "Sessions", Icon: FiList },
  { id: "more", label: "More", Icon: FiMenu },
];

const BottomTabBar = ({ active, onChange, isDark }) => {
  const barBg = isDark ? "bg-slate-900" : "bg-white";
  const barBorder = isDark ? "border-white/10" : "border-purple-200";

  return (
    <nav
      aria-label="Primary"
      className={`fixed bottom-0 left-0 right-0 z-50 ${barBg} border-t ${barBorder}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-md mx-auto flex" role="tablist">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          const color = isActive
            ? isDark
              ? "text-white"
              : "text-indigo-600"
            : isDark
              ? "text-slate-400"
              : "text-gray-500";
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              onClick={() => onChange(id)}
              className={`relative flex-1 min-w-[44px] min-h-[60px] flex flex-col items-center justify-center gap-0.5 py-2 active:scale-[0.97] transition-transform ${color}`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full ${
                    isDark ? "bg-indigo-500" : "bg-indigo-600"
                  }`}
                />
              )}
              <Icon size={20} />
              <span className="text-[11px] leading-tight font-medium whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
