/* eslint-disable react/prop-types */
import { useToastStore } from "../store/toastStore";
import Toast from "./Toast";

// App-wide toast renderer. Mounted once in App.jsx's Shell next to
// SyncBanner so toasts triggered from non-component code (e.g. the sync
// store's offline gate) are visible on every page. Reuses the existing
// Toast component (fixed above the tab bar, tap to dismiss); the 4s
// auto-dismiss is owned by the toast store.
const GlobalToast = ({ isDark }) => {
  const toast = useToastStore((s) => s.toast);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (!toast) return null;

  return (
    <Toast
      key={toast.id}
      message={toast.message}
      onClose={dismissToast}
      isDark={isDark}
    />
  );
};

export default GlobalToast;
