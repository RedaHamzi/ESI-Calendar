import { useAppStore } from "../store/appStore";
import useOnlineStatus from "./useOnlineStatus";

// Central CASE A/B/C/D hook. hasInternet comes from navigator.onLine,
// hasData from the store (dbReady + sessionCount > 0). Pages consume the
// convenience flags instead of re-deriving them.
export function useAppState() {
  const dbReady = useAppStore((s) => s.dbReady);
  const sessionCount = useAppStore((s) => s.sessionCount);
  const online = useOnlineStatus();
  const hasData = dbReady && sessionCount > 0;
  return {
    online,
    hasData,
    dbReady,
    sessionCount,
    // true when we should push the user to /more/sync
    showSyncCTA: dbReady && !hasData,
    // pages should only query when true
    canQueryDb: hasData,
  };
}

export default useAppState;
