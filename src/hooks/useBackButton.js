import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";

// Android hardware back button wired to wouter-style navigation.
// - On "/" → ask the caller to show the exit confirmation.
// - Else if the browser history has an in-app entry → go back.
// - Else → navigate home.
// The handler is intentionally framework-light: location + navigate are
// passed in so this hook stays testable without wouter in scope.
export function useBackButton({ location, navigate, onRequestExit }) {
  useEffect(() => {
    let handle = null;
    let cancelled = false;
    const setup = async () => {
      try {
        handle = await CapApp.addListener("backButton", () => {
          try {
            if (location === "/") {
              if (typeof onRequestExit === "function") onRequestExit();
              return;
            }
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
              return;
            }
            navigate("/");
          } catch (e) {
            console.error(`useBackButton: ${e && e.message ? e.message : e}`);
          }
        });
      } catch (e) {
        if (!cancelled) {
          console.error(`useBackButton/setup: ${e && e.message ? e.message : e}`);
        }
      }
    };
    setup();
    return () => {
      cancelled = true;
      if (handle && typeof handle.remove === "function") {
        handle.remove().catch((e) => {
          console.error(`useBackButton/cleanup: ${e && e.message ? e.message : e}`);
        });
      }
    };
  }, [location, navigate, onRequestExit]);
}

export default useBackButton;
