/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { FiWifiOff } from "react-icons/fi";
import WeekView from "./WeekView";
import { getSchoolWeekSunday } from "../utils/week";
import { calendarIdToIcsUrl } from "../services/sync";
import { useAppStore } from "../store/appStore";

function urlsForSelection(list, type) {
  if (!list) return [];
  if (type === "class" && typeof list.src === "string") {
    return [calendarIdToIcsUrl(list.src)];
  }
  if (Array.isArray(list.src)) {
    return list.src
      .filter((id) => typeof id === "string" && id.trim())
      .map((id) => calendarIdToIcsUrl(id));
  }
  return [];
}

const OfflineSchedule = ({ list, type, isDark, onGoSync, refreshTick }) => {
  const [state, setState] = useState({ loading: true, sessions: [], weekSundayMs: null });
  const dbReady = useAppStore((s) => s.dbReady);
  const sessionCount = useAppStore((s) => s.sessionCount);

  const cardClass = isDark
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-purple-200";
  const textClass = isDark ? "text-white" : "text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState((prev) => ({ ...prev, loading: true }));
      const sunday = getSchoolWeekSunday(new Date());
      const weekSundayMs = sunday.getTime();
      const thursdayEnd = new Date(
        sunday.getFullYear(),
        sunday.getMonth(),
        sunday.getDate() + 4,
        23,
        59,
        59,
      ).getTime();
      try {
        const db = useAppStore.getState().db;
        if (!db) {
          if (!cancelled) setState({ loading: false, sessions: [], weekSundayMs });
          return;
        }
        const { querySessionsByCalUrls, queryGroupWeekByCalname } =
          await import("../services/db");
        if (cancelled) return;
        const urls = urlsForSelection(list, type);
        const minSec = Math.floor(weekSundayMs / 1000);
        const maxSec = Math.floor(thursdayEnd / 1000);
        let sessions = await querySessionsByCalUrls(db, urls, minSec, maxSec);
        if (sessions.length === 0 && list && list.title) {
          sessions = await queryGroupWeekByCalname(
            db,
            list.title,
            weekSundayMs,
            thursdayEnd,
          );
        }
        if (!cancelled) setState({ loading: false, sessions, weekSundayMs });
      } catch (e) {
        console.error(`schedule/offline: ${e && e.message ? e.message : e}`);
        if (!cancelled) {
          setState({ loading: false, sessions: [], weekSundayMs });
        }
      }
    };
    if (!dbReady) return () => { cancelled = true; };
    load();
    return () => {
      cancelled = true;
    };
  }, [list, type, dbReady, sessionCount, refreshTick]);

  return (
    <div
      className={`rounded-2xl shadow-xl overflow-hidden border ${
        isDark ? "bg-white border-white/20" : "bg-white border-purple-200"
      }`}
    >
      {state.loading ? (
        <p className={`p-4 text-sm text-center ${subClass}`}>
          Loading cached schedule…
        </p>
      ) : state.sessions.length > 0 ? (
        <div className="p-2">
          <WeekView
            sessions={state.sessions}
            weekSundayMs={state.weekSundayMs}
            isDark={isDark}
          />
        </div>
      ) : (
        <div className={`p-6 text-center ${cardClass}`}>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
              isDark ? "bg-indigo-600" : "bg-indigo-500"
            }`}
          >
            <FiWifiOff size={22} className="text-white" />
          </div>
          <h3 className={`font-semibold text-lg ${textClass}`}>
            No offline data for this {type === "class" ? "class" : "group"}
          </h3>
          <p className={`text-sm mt-1 ${subClass}`}>
            Connect to the internet to sync.
          </p>
          <button
            type="button"
            onClick={onGoSync}
            className={`mt-4 min-h-[48px] px-6 rounded-xl font-semibold text-white active:scale-[0.97] transition-transform ${
              isDark ? "bg-indigo-600" : "bg-indigo-500"
            }`}
          >
            Sync now
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineSchedule;
