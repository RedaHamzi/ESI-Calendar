import { create } from "zustand";

// Global toast state. SyncPage and App.jsx previously owned separate local
// toasts, which the sync store could not reach — so an offline sync started
// from anywhere but SyncPage showed no feedback. This store is the single
// mechanism any module (including syncStore.start) can trigger.
//
// Exact offline message (capital W, no trailing period — do not alter):
export const OFFLINE_MESSAGE = "Open Wi-Fi or mobile data first";

const AUTO_DISMISS_MS = 4000;

let timer = 0;

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = 0;
  }
}

export const useToastStore = create((set, get) => ({
  toast: null,

  showToast: (message) => {
    const id = Date.now();
    clearTimer();
    set({ toast: { id, message } });
    timer = setTimeout(() => {
      timer = 0;
      try {
        const current = get().toast;
        if (current && current.id === id) set({ toast: null });
      } catch (e) {
        console.error(`toastStore/autoDismiss: ${e && e.message ? e.message : e}`);
      }
    }, AUTO_DISMISS_MS);
  },

  dismissToast: () => {
    clearTimer();
    set({ toast: null });
  },
}));

// Central offline notifier: shows the exact offline message. Called by the
// sync store's start() gate and by SyncPage/SyncBanner before navigating.
export function notifyOffline() {
  try {
    useToastStore.getState().showToast(OFFLINE_MESSAGE);
  } catch (e) {
    console.error(`toastStore/notifyOffline: ${e && e.message ? e.message : e}`);
  }
}

export default useToastStore;
