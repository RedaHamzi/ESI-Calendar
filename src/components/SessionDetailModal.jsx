/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import { SCHOOL_DAY_NAMES, formatTimeMs } from "../utils/week";

const TYPE_BADGE = {
  Cours: "bg-indigo-500",
  TD: "bg-emerald-500",
  TP: "bg-amber-500",
};

function parseRooms(roomsJson) {
  try {
    const rooms = JSON.parse(roomsJson);
    if (Array.isArray(rooms)) return rooms;
  } catch (e) {
    // fall through to empty
  }
  return [];
}

function formatDayTime(session) {
  const start = new Date(Number(session.starts_at) * 1000);
  const end = new Date(Number(session.ends_at) * 1000);
  const dayName = SCHOOL_DAY_NAMES[start.getDay()] || "";
  const dayNum = String(start.getDate()).padStart(2, "0");
  return `${dayName} ${dayNum} · ${formatTimeMs(start.getTime())}–${formatTimeMs(end.getTime())}`;
}

// Shared session detail modal: bottom sheet on mobile, centered modal on
// desktop. Reused by SessionsPage, OfflineSchedule and TeachersPage.
const SessionDetailModal = ({ session, onClose, isDark, onSeeTeacher, onSeeGroup }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && typeof onClose === "function") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!session) return null;

  const rooms = parseRooms(session.rooms);
  const sheetClass = isDark
    ? "bg-slate-900 border-white/20 text-white"
    : "bg-white border-purple-200 text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";
  const linkClass = isDark ? "text-indigo-300" : "text-indigo-600";
  const secondaryBtn = isDark
    ? "border-white/20 text-white"
    : "border-purple-200 text-gray-900";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Session details"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-t-2xl md:rounded-2xl border p-4 ${sheetClass}`}
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <span
              className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold text-white ${
                TYPE_BADGE[session.session_type] || "bg-indigo-500"
              }`}
            >
              {session.session_type}
            </span>
            <h2 className="font-bold text-lg mt-1">
              {session.subject || "(no subject)"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl active:scale-[0.97] transition-transform"
          >
            <FiX size={20} />
          </button>
        </div>
        <div className="mt-2 space-y-1 text-sm">
          {session.teacher && (
            <p>
              <span className={subClass}>Teacher: </span>
              {onSeeTeacher ? (
                <button
                  type="button"
                  onClick={() => onSeeTeacher(session.teacher)}
                  className={`font-medium underline min-h-[44px] active:scale-[0.97] transition-transform ${linkClass}`}
                >
                  {session.teacher}
                </button>
              ) : (
                session.teacher
              )}
            </p>
          )}
          {rooms.length > 0 && (
            <p>
              <span className={subClass}>Room: </span>
              {rooms.join(", ")}
            </p>
          )}
          <p>
            <span className={subClass}>When: </span>
            {formatDayTime(session)}
          </p>
          {session.calname && (
            <p>
              <span className={subClass}>Group: </span>
              {onSeeGroup ? (
                <button
                  type="button"
                  onClick={() => onSeeGroup()}
                  className={`font-medium underline min-h-[44px] active:scale-[0.97] transition-transform ${linkClass}`}
                >
                  {session.calname}
                </button>
              ) : (
                session.calname
              )}
            </p>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex-1 min-h-[48px] rounded-xl font-semibold border active:scale-[0.97] transition-transform ${secondaryBtn}`}
          >
            Close
          </button>
          {session.teacher && onSeeTeacher && (
            <button
              type="button"
              onClick={() => onSeeTeacher(session.teacher)}
              className={`flex-1 min-h-[48px] rounded-xl font-semibold text-white active:scale-[0.97] transition-transform ${
                isDark ? "bg-indigo-600" : "bg-indigo-500"
              }`}
            >
              See this teacher
            </button>
          )}
          {onSeeGroup && (
            <button
              type="button"
              onClick={() => onSeeGroup()}
              className={`flex-1 min-h-[48px] rounded-xl font-semibold border active:scale-[0.97] transition-transform ${secondaryBtn}`}
            >
              See this group
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetailModal;
