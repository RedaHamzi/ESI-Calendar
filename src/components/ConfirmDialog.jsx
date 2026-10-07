/* eslint-disable react/prop-types */
export default function ConfirmDialog({ title, message, confirmLabel, isDark, onCancel, onConfirm }) {
  const sheetClass = isDark
    ? "bg-slate-900 border-white/20 text-white"
    : "bg-white border-purple-200 text-gray-900";
  const subClass = isDark ? "text-purple-200" : "text-purple-600";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full max-w-sm rounded-2xl border p-5 ${sheetClass}`}
      >
        <h2 className="font-bold text-lg">{title}</h2>
        {message && <p className={`text-sm mt-2 ${subClass}`}>{message}</p>}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className={`flex-1 min-h-[48px] rounded-xl font-semibold border active:scale-[0.97] transition-transform ${
              isDark
                ? "border-white/20 text-white"
                : "border-purple-200 text-gray-900"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            aria-label={confirmLabel || "Confirm"}
            className={`flex-1 min-h-[48px] rounded-xl font-semibold text-white active:scale-[0.97] transition-transform ${
              isDark ? "bg-indigo-600" : "bg-indigo-500"
            }`}
          >
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
