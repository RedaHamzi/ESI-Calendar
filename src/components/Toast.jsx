/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import { FiWifiOff } from "react-icons/fi";

const Toast = ({ message, actionLabel, onAction, onClose, isDark }) => {
  const touchX = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const barClass = isDark
    ? "bg-slate-800 border-white/20 text-white"
    : "bg-white border-purple-200 text-gray-900";

  return (
    <div
      role="status"
      onClick={() => onClose && onClose()}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40 && onClose) onClose();
      }}
      className="fixed left-0 right-0 z-[60] px-4"
      style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className={`max-w-md mx-auto rounded-2xl border shadow-xl px-4 py-3 min-h-[48px] flex items-center gap-3 ${barClass}`}
      >
        <FiWifiOff size={18} className="shrink-0" aria-hidden="true" />
        <span className="flex-1 text-sm">{message}</span>
        {actionLabel && (
          <button
            type="button"
            aria-label={actionLabel}
            onClick={(e) => {
              e.stopPropagation();
              if (onAction) onAction();
              if (onClose) onClose();
            }}
            className={`shrink-0 min-h-[44px] px-3 text-sm font-semibold active:scale-[0.97] transition-transform ${
              isDark ? "text-indigo-300" : "text-indigo-600"
            }`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
