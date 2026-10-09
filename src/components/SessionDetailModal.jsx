/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { SCHOOL_DAY_NAMES, formatTimeMs } from "../utils/week";

const TYPE_BADGE = {
  Cours: "bg-indigo-500",
  TD: "bg-emerald-500",
  TP: "bg-amber-500",
};

function parseRooms(roomsJson) {
  // Web (Dexie) rows carry rooms as a real array; native (SQLite) as JSON.
  if (Array.isArray(roomsJson)) return roomsJson;
  try {
    const rooms = JSON.parse(roomsJson);
    if (Array.isArray(rooms)) return rooms;
  } catch (e) {
    console.error(`SessionDetailModal/parseRooms: ${e && e.message ? e.message : e}`);
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
//
// Rendered via a portal to document.body so the sheet's touch gestures can
// never bubble into a parent PullToRefresh wrapper (native listeners on the
// PullToRefresh element only see events from its own DOM subtree).
//
// Drag-to-dismiss (touch only): downward drags on the sheet translate it
// 1:1 via direct DOM mutation (rAF-throttled, never React state) with a
// rubber-band past ~120px. Release past ~80px (or a fast flick > 0.5px/ms
// past 30px) dismisses; otherwise the sheet snaps back. Upward drags are
// ignored and content scroll (scrollTop > 0) always wins over the drag.
const SessionDetailModal = ({ session, onClose, isDark, onSeeTeacher, onSeeGroup }) => {
  const sheetRef = useRef(null);
  const backdropRef = useRef(null);
  const drag = useRef({
    active: false,
    startY: 0,
    raw: 0,
    effective: 0,
    raf: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
  });
  const closingRef = useRef(false);
  const closeTimer = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Animated close: slide the sheet down + fade the backdrop, then call
  // onClose() so the parent unmounts. All dismiss paths go through here.
  const finishClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      const sheet = sheetRef.current;
      if (sheet) {
        const h = sheet.getBoundingClientRect().height || window.innerHeight;
        sheet.style.transition = "transform 200ms ease-out";
        sheet.style.transform = `translateY(${h}px)`;
      }
      const backdrop = backdropRef.current;
      if (backdrop) {
        backdrop.style.transition = "opacity 200ms ease-out";
        backdrop.style.opacity = "0";
      }
    } catch (e) {
      console.error(`SessionDetailModal/finishClose: ${e && e.message ? e.message : e}`);
    }
    closeTimer.current = setTimeout(() => {
      try {
        if (typeof onCloseRef.current === "function") onCloseRef.current();
      } catch (e) {
        console.error(`SessionDetailModal/closeTimer: ${e && e.message ? e.message : e}`);
      }
    }, 200);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") finishClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishClose]);

  // Enter animation: sheet slides up from translateY(100%), backdrop fades
  // in. Runs each time a new session opens the sheet.
  useEffect(() => {
    if (!session) return undefined;
    closingRef.current = false;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const sheet = sheetRef.current;
          if (sheet) {
            sheet.style.transition = "transform 250ms ease-out";
            sheet.style.transform = "translateY(0)";
          }
          const backdrop = backdropRef.current;
          if (backdrop) {
            backdrop.style.transition = "opacity 250ms ease-out";
            backdrop.style.opacity = "1";
          }
        } catch (e) {
          console.error(`SessionDetailModal/enter: ${e && e.message ? e.message : e}`);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = 0;
      }
    };
  }, [session]);

  // Drag-to-dismiss wiring. Listeners live on the sheet element itself so a
  // touch that starts inside child content still drives the sheet, while the
  // scrollTop guard yields to any scrolled inner region.
  useEffect(() => {
    if (!session) return undefined;
    const sheet = sheetRef.current;
    if (!sheet) return undefined;
    const d = drag.current;

    const paint = () => {
      const el = sheetRef.current;
      if (!el) return;
      try {
        el.style.transform =
          d.effective > 0 ? `translateY(${d.effective}px)` : "translateY(0)";
      } catch (e) {
        console.error(`SessionDetailModal/paint: ${e && e.message ? e.message : e}`);
      }
    };

    const schedulePaint = () => {
      if (d.raf) return;
      d.raf = requestAnimationFrame(() => {
        d.raf = 0;
        paint();
      });
    };

    const hasScrolledAncestor = (target) => {
      let node = target;
      while (node && node !== sheet) {
        if (
          node.scrollHeight &&
          node.scrollHeight > node.clientHeight + 1 &&
          node.scrollTop > 0
        ) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const onTouchStart = (e) => {
      if (closingRef.current) return;
      if (!e.touches || e.touches.length !== 1) {
        d.active = false;
        return;
      }
      d.active = true;
      d.startY = e.touches[0].clientY;
      d.lastY = d.startY;
      d.lastT = performance.now();
      d.velocity = 0;
      d.raw = 0;
      d.effective = 0;
      try {
        sheet.style.transition = "none";
      } catch (err) {
        console.error(`SessionDetailModal/touchStart: ${err && err.message ? err.message : err}`);
      }
      if (d.raf) {
        cancelAnimationFrame(d.raf);
        d.raf = 0;
      }
    };

    const onTouchMove = (e) => {
      if (!d.active) return;
      const y = e.touches[0].clientY;
      const dy = y - d.startY;
      // Upward drags are ignored (natural scroll-up attempt inside the sheet).
      if (dy <= 0) return;
      // Yield to inner scrolled content — drag only from the very top.
      if (hasScrolledAncestor(e.target)) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      const now = performance.now();
      const dt = now - d.lastT;
      if (dt > 0) d.velocity = (y - d.lastY) / dt;
      d.lastY = y;
      d.lastT = now;
      d.raw = dy;
      d.effective = dy > 120 ? 120 + (dy - 120) * 0.3 : dy;
      schedulePaint();
    };

    const settle = (shouldDismiss) => {
      const el = sheetRef.current;
      d.raw = 0;
      d.effective = 0;
      d.velocity = 0;
      if (!el) {
        finishClose();
        return;
      }
      try {
        if (shouldDismiss) {
          const h = el.getBoundingClientRect().height || window.innerHeight;
          el.style.transition = "transform 200ms ease-out";
          el.style.transform = `translateY(${h}px)`;
          const backdrop = backdropRef.current;
          if (backdrop) {
            backdrop.style.transition = "opacity 200ms ease-out";
            backdrop.style.opacity = "0";
          }
          closingRef.current = true;
          closeTimer.current = setTimeout(() => {
            try {
              if (typeof onCloseRef.current === "function") onCloseRef.current();
            } catch (err) {
              console.error(`SessionDetailModal/settle: ${err && err.message ? err.message : err}`);
            }
          }, 200);
        } else {
          el.style.transition = "transform 200ms ease-out";
          el.style.transform = "translateY(0)";
        }
      } catch (err) {
        console.error(`SessionDetailModal/settle: ${err && err.message ? err.message : err}`);
      }
    };

    const onTouchEnd = (e) => {
      if (!d.active) return;
      d.active = false;
      if (e) e.stopPropagation();
      if (d.raf) {
        cancelAnimationFrame(d.raf);
        d.raf = 0;
      }
      const eff = d.effective;
      const vel = d.velocity;
      settle(eff >= 80 || (vel > 0.5 && eff > 30));
    };

    const onTouchCancel = () => {
      if (!d.active) return;
      d.active = false;
      if (d.raf) {
        cancelAnimationFrame(d.raf);
        d.raf = 0;
      }
      settle(false);
    };

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", onTouchEnd);
    sheet.addEventListener("touchcancel", onTouchCancel);
    return () => {
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", onTouchEnd);
      sheet.removeEventListener("touchcancel", onTouchCancel);
      if (d.raf) {
        cancelAnimationFrame(d.raf);
        d.raf = 0;
      }
    };
  }, [session, finishClose]);

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

  const node = (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        ref={backdropRef}
        aria-hidden="true"
        onClick={finishClose}
        className="absolute inset-0 bg-black/40"
        style={{ opacity: 0 }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Session details"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-t-2xl md:rounded-2xl border p-4 pt-0 ${sheetClass}`}
        style={{
          transform: "translateY(100%)",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex justify-center py-2" aria-hidden="true">
          <div
            className={`w-10 h-1 rounded-full ${isDark ? "bg-slate-400/50" : "bg-slate-300"}`}
          />
        </div>
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
            onClick={finishClose}
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
            onClick={finishClose}
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

  if (typeof document !== "undefined" && document.body) {
    return createPortal(node, document.body);
  }
  return node;
};

export default SessionDetailModal;
