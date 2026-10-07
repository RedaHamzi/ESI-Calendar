import { classes, groups } from '../data/data';
import { parseIcs } from './ics';
import { getCalendarMeta, upsertCalendarMeta, replaceSessionsForCalendar, getSyncRangeBounds, rebuildTeachersTable } from './db';
import { emitSync } from './syncEvents';
import { useAppStore } from '../store/appStore';

export const FETCH_DELAY_MS = 300;
export const DEFAULT_SYNC_RANGE = 'month';

export function calendarIdToIcsUrl(calendarId) {
  const id = String(calendarId || '').trim().replace(/&+$/, '');
  return `https://calendar.google.com/calendar/ical/${id}/public/basic.ics`;
}

// Google Calendar's ICS endpoint accepts only email-form calendar IDs
// ("xxx@group.calendar.google.com", URL-encoded here as "xxx%40...").
// It rejects the legacy base64 form ("ZXNpLmR6Xz...") with HTTP 404,
// even though the same calendar renders fine in the embed iframe.
// Data.js keeps both forms (the iframe uses the raw values), so every id
// is run through this normalizer before building the FETCH url only.
// DB keys, the ETag cache, and the calendars table keep the raw url.
export function normalizeCalendarId(id) {
  const raw = String(id || '');
  // Already email form (contains @ or %40) — keep as-is.
  if (raw.includes('@') || raw.includes('%40')) return raw;

  // Try base64 decode.
  try {
    const decoded = atob(raw);
    // Sanity: must look like a calendar id.
    // Real ids end in .calendar.google.com and have one @.
    if (/^[\w.\-]+@[\w.\-]+\.calendar\.google\.com$/.test(decoded)) {
      // URL-encode the @ for consistency with the rest of the file.
      return decoded.replace('@', '%40');
    }
  } catch {
    // Not base64, fall through.
  }

  // Unknown shape — return unchanged and let the fetch surface it.
  return raw;
}

const ICS_URL_RE = /^(https:\/\/calendar\.google\.com\/calendar\/ical\/)([^/]+)(\/public\/basic\.ics)$/;

// Map a raw (stable-key) ICS url to the actual fetch url. Returns the input
// unchanged when it does not match the expected ICS url shape.
export function fetchUrlForKey(rawUrl) {
  const m = ICS_URL_RE.exec(String(rawUrl || ''));
  if (!m) return String(rawUrl || '');
  return `${m[1]}${normalizeCalendarId(m[2])}${m[3]}`;
}

let fetchLogCount = 0;

export function getCalendarUrls() {
  const ids = new Set();
  for (const entry of classes) {
    if (entry && typeof entry.src === 'string' && entry.src.trim()) {
      ids.add(entry.src.trim().replace(/&+$/, ''));
    }
  }
  for (const entry of groups) {
    const list = entry && Array.isArray(entry.src) ? entry.src : [];
    for (const id of list) {
      if (typeof id === 'string' && id.trim()) {
        ids.add(id.trim().replace(/&+$/, ''));
      }
    }
  }
  return [...ids].map((id) => calendarIdToIcsUrl(id));
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function syncOne(url, options) {
  const force = !!(options && options.force);
  const range = (options && options.range) || DEFAULT_SYNC_RANGE;
  // DB comes from the Zustand store (App root is the only openDb() caller).
  const db = useAppStore.getState().db;
  if (!db) {
    const msg = 'syncOne: database not ready (db not opened yet)';
    console.error(`syncOne: ${msg} for ${url}`);
    return { url, status: 'error', error: msg };
  }
  const meta = force ? null : await getCalendarMeta(db, url);
  // A range switch must refetch even when the ETag is fresh, otherwise the
  // stored rows would keep the previous range's data under the new label.
  const rangeChanged = !!(meta && meta.sync_range && meta.sync_range !== range);
  const skipCache = force || rangeChanged;

  const headers = {};
  if (!skipCache && meta && meta.etag) {
    headers['If-None-Match'] = meta.etag;
  }

  // Normalize base64 ids to email form for the fetch only.
  // `url` stays raw everywhere else (DB key, ETag cache, calendars table).
  const fetchUrl = fetchUrlForKey(url);
  if (import.meta.env?.DEV && fetchLogCount < 5) {
    fetchLogCount += 1;
    const rawId = (ICS_URL_RE.exec(url) || [])[2] || url;
    console.log(`[sync] ${rawId}  ->  ${normalizeCalendarId(rawId)}`);
  }

  let response;
  try {
    response = await fetch(fetchUrl, { headers, cache: 'no-store' });
  } catch (err) {
    console.error(`syncOne: network error for ${url}: ${err.message}`);
    return { url, status: 'error', error: `network: ${err.message}` };
  }

  if (response.status === 304) {
    try {
      await db.run('UPDATE calendars SET last_synced = ? WHERE url = ?', [Date.now(), url]);
    } catch (err) {
      console.error(`syncOne: last_synced update failed for ${url}: ${err.message}`);
    }
    return { url, status: 'unchanged' };
  }

  if (!response.ok) {
    console.error(`syncOne: HTTP ${response.status} for ${url}`);
    return { url, status: 'error', error: `HTTP ${response.status}` };
  }

  let icsText;
  try {
    icsText = await response.text();
  } catch (err) {
    console.error(`syncOne: body read error for ${url}: ${err.message}`);
    return { url, status: 'error', error: `body: ${err.message}` };
  }

  let parsed;
  try {
    parsed = parseIcs(icsText, url);
  } catch (err) {
    console.error(`syncOne: parse error for ${url}: ${err.message}`);
    return { url, status: 'error', error: `parse: ${err.message}` };
  }

  try {
    const bounds = getSyncRangeBounds(range);
    const stored = await replaceSessionsForCalendar(db, url, parsed.sessions, bounds);
    await upsertCalendarMeta(db, {
      url,
      calname: parsed.calname || null,
      etag: response.headers.get('etag'),
      last_synced: Date.now(),
      event_count: stored,
      sync_range: range,
    });
  } catch (err) {
    const batchSize = 1 + parsed.sessions.length;
    console.error(`syncOne: DB error for ${url} (batch of ${batchSize} statements): ${err.message}`);
    return { url, status: 'error', error: `db: ${err.message}` };
  }

  return { url, status: 'updated', calname: parsed.calname, eventCount: parsed.sessions.length };
}

export async function syncAll(urls, onProgress, options) {
  const list = Array.isArray(urls) ? urls : getCalendarUrls();
  const total = list.length;
  const summary = { total, updated: 0, unchanged: 0, failed: 0, failures: [] };
  const range = (options && options.range) || DEFAULT_SYNC_RANGE;
  const store = useAppStore.getState();
  store.setSyncStatus("running");
  store.setSyncProgress({ done: 0, total, currentLabel: "" });
  store.setSyncError(null);
  emitSync({ type: 'start', range });

  try {
    for (let i = 0; i < list.length; i += 1) {
      const url = list[i];
      let result;
      try {
        result = await syncOne(url, options);
      } catch (err) {
        console.error(`syncAll: unexpected error for ${url}: ${err && err.message ? err.message : err}`);
        result = { url, status: 'error', error: (err && err.message) || String(err) };
      }

      if (result.status === 'updated') {
        summary.updated += 1;
      } else if (result.status === 'unchanged') {
        summary.unchanged += 1;
      } else {
        summary.failed += 1;
        summary.failures.push({ url, error: result.error || 'unknown' });
      }

      useAppStore.getState().setSyncProgress({ done: i + 1, total, currentLabel: url });
      emitSync({ type: 'progress', done: i + 1, total, url });

      if (typeof onProgress === 'function') {
        try {
          onProgress(i + 1, total, url);
        } catch (err) {
          // Progress callbacks must never break the sync loop.
        }
      }

      if (i < list.length - 1) {
        await delay(FETCH_DELAY_MS);
        await new Promise((r) => setTimeout(r, 0)); // yield to UI
      }
    }
  } catch (err) {
    const msg = (err && err.message) || String(err);
    console.error(`syncAll: fatal: ${msg}`);
    useAppStore.getState().setSyncError(msg);
    useAppStore.getState().setSyncStatus("error");
    emitSync({ type: 'error', message: msg });
    throw err;
  }

  try {
    await useAppStore.getState().refreshCounts();
  } catch (e) {
    console.error(`syncAll/refreshCounts: ${e && e.message ? e.message : e}`);
  }
  // Refresh the materialized teacher list once per sync (not per
  // calendar). Timed so C.4 before/after can be compared on device.
  try {
    const db = useAppStore.getState().db;
    if (db) {
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      await rebuildTeachersTable(db);
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      console.log(`[sync] rebuildTeachersTable ms=${Math.round(now - t0)}`);
      // Clear the cached list so TeachersPage re-queries the fresh table.
      useAppStore.getState().setTeachers(null);
      await useAppStore.getState().refreshCounts();
    }
  } catch (e) {
    console.error(`syncAll/rebuildTeachersTable: ${e && e.message ? e.message : e}`);
  }
  if (summary.failed > 0 && summary.updated === 0 && summary.unchanged === 0) {
    useAppStore.getState().setSyncError(`${summary.failed} calendar(s) failed`);
    useAppStore.getState().setSyncStatus("error");
  } else {
    useAppStore.getState().setSyncStatus("done");
  }
  emitSync({ type: 'done', updated: summary.updated, failed: summary.failed });
  return summary;
}
