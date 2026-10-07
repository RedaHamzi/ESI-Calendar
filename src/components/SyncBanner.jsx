/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  FiLoader,
  FiCheckCircle,
  FiAlertTriangle,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import { useSyncStore } from "../store/syncStore";

// Floating global sync banner. Reflects useSyncStore directly; mounted once
// at the app root so it survives tab navigation. Floats below the status
// bar with a shadow — the page header sits under it (no layout thrash).
const SyncBanner = ({ isDark }) => {
  const status = useSyncStore((s) => s.status);
  const progress = useSyncStore((s) => s.progress);
  const [, navigate] = useLocation();

  // "Syncing done." auto-dismisses after ~3 seconds.
  useEffect(() => {
    if (status !== "done") return undefined;
    const timer = setTimeout(() => {
      try {
        useSyncStore.getState().dismiss();
      } catch (e) {
        console.error(`SyncBanner/autoDismiss: ${e && e.message ? e.message : e}`);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [status]);

  if (status === "idle") return null;

  const done = Number(progress.done) || 0;
  const total = Number(progress.total) || 0;

  let message = "Syncing…";
  let Icon = FiLoader;
  let spinning = false;
  if (status === "running") {
    spinning = true;
    if (done > 0 && total > 0 && done >= total * 0.3) {
      message = "Syncing… Be patient.";
    } else if (done > 0) {
      message = "Syncing… This could take a couple of minutes.";
    } else {
      message = "Syncing…";
    }
  } else if (status === "done") {
    message = "Syncing done.";
    Icon = FiCheckCircle;
  } else if (status === "incomplete") {
    message = "Syncing not finished. Tap to resume.";
    Icon = FiAlertTriangle;
  } else if (status === "error") {
    message = "Syncing failed. Tap for details.";
    Icon = FiAlertCircle;
  }

  let barClass = "";
  if (status === "running") {
    barClass = isDark ? "bg-indigo-600 text-white" : "bg-indigo-500 text-white";
  } else if (status === "done") {
    barClass = isDark
      ? "bg-slate-800 border-white/20 text-slate-200"
      : "bg-white border-purple-200 text-gray-900";
  } else if (status === "incomplete") {
    barClass = isDark
      ? "bg-amber-800 border-amber-700 text-amber-100"
      : "bg-amber-100 border-amber-300 text-amber-900";
  } else {
    barClass = isDark
      ? "bg-red-900 border-red-700 text-red-100"
      : "bg-red-100 border-red-300 text-red-900";
  }

  const dismissible = status === "done" || status === "error";

  const goSync = () => {
    try {
      navigate("/more/sync");
    } catch (e) {
      console.error(`SyncBanner/goSync: ${e && e.message ? e.message : e}`);
    }
  };

  const dismiss = (e) => {
    if (e) e.stopPropagation();
    try {
      useSyncStore.getState().dismiss();
    } catch (err) {
      console.error(`SyncBanner/dismiss: ${err && err.message ? err.message : err}`);
    }
  };

  return (
    <div
      className="fixed left-0 right-0 z-40 px-4"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-md mx-auto">
        <div
          role="status"
          onClick={goSync}
          className={`min-h-[40px] w-full rounded-xl border shadow-lg px-3 py-2 flex items-center gap-2 cursor-pointer active:scale-[0.99] transition-transform ${barClass}`}
        >
          <Icon
            size={18}
            className={`shrink-0 ${spinning ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span className="flex-1 text-sm font-medium">{message}</span>
          {dismissible && (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="shrink-0 min-w-[44px] min-h-[44px] -my-2 flex items-center justify-center rounded-lg active:scale-[0.97] transition-transform"
            >
              <FiX size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncBanner;
