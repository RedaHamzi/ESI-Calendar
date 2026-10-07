/* eslint-disable react/prop-types */
import { Suspense, lazy, useState } from "react";
import { FiCloud, FiCloudOff } from "react-icons/fi";
import SearchBar from "../components/SearchBar";
import MiniNavigator from "../components/MiniNavigator";
import PageHeader from "../components/PageHeader";
import ThemeToggle from "../components/ThemeToggle";
import PullToRefresh from "../components/PullToRefresh";

const OfflineSchedule = lazy(() => import("../components/OfflineSchedule"));

const SchedulePage = ({ list, setList, type, setType, isDark, setIsDark, isOffline, onPickScheduleMode, onGoSync }) => {
  const nextMode = isOffline ? "online" : "offline";
  const modeLabel = isOffline ? "Offline" : "Online";
  // Iframe reload key (online refresh) + offline query tick. Kept separate
  // so an online refresh never touches the DB and an offline refresh never
  // hits the network.
  const [iframeKey, setIframeKey] = useState(0);
  const [offlineTick, setOfflineTick] = useState(0);

  // Pull-to-refresh per the state matrix: ONLINE reloads the iframe(s) by
  // bumping their key; OFFLINE re-runs the DB query via offlineTick.
  const handleRefresh = async () => {
    if (isOffline) {
      setOfflineTick((n) => n + 1);
      return;
    }
    setIframeKey((n) => n + 1);
  };
  return (
    <div>
      <PageHeader
        title="Schedule"
        isDark={isDark}
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPickScheduleMode && onPickScheduleMode(nextMode)}
              aria-label={isOffline ? "Switch to online schedule" : "Switch to offline schedule"}
              title={isOffline ? "Showing cached schedule" : "Showing live schedule"}
              className={`flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 rounded-xl text-xs font-semibold active:scale-[0.97] transition-transform ${
                isOffline
                  ? isDark
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-500 text-white"
                  : isDark
                    ? "text-purple-200"
                    : "text-purple-600"
              }`}
            >
              {isOffline ? <FiCloudOff size={16} /> : <FiCloud size={16} />}
              {modeLabel}
            </button>
            <ThemeToggle isDark={isDark} setIsDark={setIsDark} />
          </div>
        }
      />
      <main className="content-area page-content px-4">
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-md mx-auto">
          {/* Search and Navigation */}
          <div className="space-y-4 mb-6">
            <SearchBar setList={setList} type={type} isDark={isDark} />
            <MiniNavigator
              type={type}
              setType={setType}
              setList={setList}
              isDark={isDark}
            />
          </div>

          {/* Selected Item Display */}
          <div
            className={`rounded-2xl p-4 mb-4 border ${
              isDark
                ? "bg-white/10 backdrop-blur-lg border-white/20"
                : "bg-white/80 backdrop-blur-lg border-purple-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p
                  className={`text-xs uppercase tracking-wider ${
                    isDark ? "text-purple-200" : "text-purple-600"
                  }`}
                >
                  Selected {type}
                </p>
                <h3
                  className={`font-semibold text-lg truncate ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {list.title}
                </h3>
              </div>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 ${
                  isDark ? "bg-indigo-600" : "bg-indigo-500"
                }`}
              >
                <span className="text-white font-bold text-sm">
                  {type === "class" ? "C" : "G"}
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Frame with better spacing */}
          {isOffline ? (
            <Suspense
              fallback={
                <div
                  className={`rounded-2xl shadow-xl overflow-hidden border p-4 ${
                    isDark
                      ? "bg-white border-white/20"
                      : "bg-white border-purple-200"
                  }`}
                >
                  <p
                    className={`text-sm text-center ${
                      isDark ? "text-purple-200" : "text-purple-600"
                    }`}
                  >
                    Loading cached schedule…
                  </p>
                </div>
              }
            >
              <OfflineSchedule
                list={list}
                type={type}
                isDark={isDark}
                onGoSync={onGoSync}
                refreshTick={offlineTick}
              />
            </Suspense>
          ) : (
          <div
            className={`rounded-2xl shadow-xl overflow-hidden border ${
              isDark ? "bg-white border-white/20" : "bg-white border-purple-200"
            }`}
          >
            <iframe
              key={`desktop-${iframeKey}`}
              src={`https://calendar.google.com/calendar/embed?showTz=0${
                type == "class"
                  ? `&src=${list.src}`
                  : `${list?.src
                      ?.map((e) => `&src=${e}`)
                      .join("")}&color=%23E67C73&color=%23616161`
              }&showPrint=0&showCalendars=0&mode=WEEK`}
              className="hidden md:block w-full h-[60vh]"
              loading="lazy"
              title="Weekly Calendar View"
            ></iframe>
            <iframe
              key={`mobile-${iframeKey}`}
              src={`https://calendar.google.com/calendar/embed?showTz=0${
                type == "class"
                  ? `&src=${list.src}`
                  : `${list?.src
                      ?.map((e) => `&src=${e}`)
                      .join("")}&color=%23E67C73&color=%23616161`
              }&showPrint=0&showTitle=1&showDate=0&showTabs=1&showCalendars=0&mode=AGENDA&dates=20090401/20501231`}
              className="block md:hidden w-full h-[65vh]"
              loading="lazy"
              title="Mobile Calendar View"
            ></iframe>
          </div>
          )}
        </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default SchedulePage;
