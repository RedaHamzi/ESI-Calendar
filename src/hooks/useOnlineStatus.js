import { useState, useEffect } from "react";

export default function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    try {
      setOnline(navigator.onLine);
    } catch (e) {
      // keep current value when navigator is unavailable
    }
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
