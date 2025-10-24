import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';

export const initializeApp = () => {
  // Set status bar style
  if (typeof StatusBar !== 'undefined') {
    StatusBar.setStyle({ style: 'DARK' });
    StatusBar.setBackgroundColor({ color: '#0f172a' });
  }

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