// Tiny app-wide event channel for sync state. No dependencies, no React.
// Pages subscribe via onSync() to re-query when a background sync lands.
//
// event is one of:
//   { type: 'start', range }
//   { type: 'progress', done, total, url }
//   { type: 'done', updated, failed }
//   { type: 'error', message }

const listeners = new Set();
let inFlight = 0;

export function onSync(handler) {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

export function emitSync(event) {
  if (!event || typeof event !== 'object') return;
  if (event.type === 'start') {
    inFlight += 1;
  } else if (event.type === 'done' || event.type === 'error') {
    inFlight = Math.max(0, inFlight - 1);
  }
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch (e) {
      // A listener must never break the sync loop.
    }
  }
}

export function isSyncing() {
  return inFlight > 0;
}
