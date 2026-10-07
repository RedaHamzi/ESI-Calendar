import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export const initializeApp = () => {
  // First paint uses the persisted theme from localStorage (default dark)
  const savedTheme = typeof localStorage !== 'undefined'
    ? localStorage.getItem('esi-calendar-theme')
    : null;
  applyStatusBarTheme(savedTheme ? savedTheme === 'dark' : true);

  // Handle app state changes
  if (typeof App !== 'undefined') {
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
    });

    // Handle back button on Android
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  }
};

export const isRunningInCapacitor = () => {
  return typeof window !== 'undefined' && 
         (window.Capacitor || 
          window.androidBridge || 
          /Capacitor/.test(navigator.userAgent));
};

/**
 * Sync the native status bar with the app theme. No-op on web.
 * @param {boolean} isDark - true for dark theme, false for light
 */
export const applyStatusBarTheme = async (isDark) => {
  if (!isRunningInCapacitor()) return;
  try {
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: isDark ? '#0f172a' : '#ffffff' });
  } catch (e) {
    console.warn('applyStatusBarTheme failed', e);
  }
};