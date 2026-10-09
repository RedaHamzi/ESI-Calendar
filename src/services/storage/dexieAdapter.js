// Web storage adapter (IndexedDB via Dexie).
//
// Mirrors the native SQLite tables as Dexie object stores. Same behavior
// contract as sqliteAdapter.js:
//
// Units: starts_at / ends_at are unix SECONDS (identical numbers to the
// SQLite columns). Functions that take MILLISECONDS convert at the boundary
// (queryGroupWeekByCalname, queryTeacherWeek, querySessionsFiltered) — same
// convention as the native adapter, so callers work on both backends.
//
// Differences from SQLite (documented, intentional):
//   - `rooms` is stored as a real JS array, NOT a JSON string. Readers
//     (WeekView, SessionDetailModal, SessionsPage, DebugSync) accept both.
//   - `uid` is NOT the primary key: the same UID can exist in two calendars
//     and we keep per-occurrence rows. Primary key is auto-increment `++id`.
//   - `teachers` is a materialized table rebuilt once per sync via
//     rebuildTeachersTable() (called by syncAll, not per calendar).

import Dexie from 'dexie';

export { SYNC_RANGES, ACADEMIC_YEAR_BOUNDS, getSyncRangeBounds } from '../syncRange.js';

export const DB_NAME = 'esi_calendar';

let _db = null;

function dex() {
  if (!_db) {
    const next = new Dexie(DB_NAME);
    next.version(1).stores({
      calendars:
        'url, calname, etag, last_synced, event_count, sync_range',
      sessions:
        '++id, uid, recurrence_id, cal_url, calname, subject, session_type, teacher, starts_at, ends_at, is_online, [cal_url+starts_at], [teacher+starts_at], [calname+starts_at], [session_type+starts_at]',
      teachers:
        'name',
    });
    _db = next;
  }
  return _db;
}

export async function open() {
  // Dexie opens lazily; await once to fail fast when IndexedDB is
  // unavailable (private mode, blocked storage, old browser).
  await dex().open();
}

export async function close() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function toDexieRow(session) {
  let rooms = session.rooms;
  if (typeof rooms === 'string') {
    try {
      const parsed = JSON.parse(rooms);
      rooms = Array.isArray(parsed) ? parsed : [];
    } catch {
      rooms = [];
    }
  } else if (!Array.isArray(rooms)) {
    rooms = [];
  }
  const teacher = session.teacher == null ? null : String(session.teacher).trim() || null;
  const subject = session.subject == null ? null : String(session.subject).trim() || null;
  return {
    uid: session.uid,
    recurrence_id: session.recurrence_id == null ? '' : String(session.recurrence_id),
    cal_url: session.cal_url,
    calname: session.calname || null,
    subject,
    session_type: session.session_type || null,
    teacher,
    rooms,
    is_online: session.is_online ? 1 : 0,
    starts_at: Number(session.starts_at),
    ends_at: Number(session.ends_at),
    raw_summary: session.raw_summary || null,
    raw_location: session.raw_location || null,
  };
}

function roomsOf(row) {
  const rooms = row && row.rooms;
  if (Array.isArray(rooms)) return rooms;
  if (typeof rooms === 'string') {
    try {
      const parsed = JSON.parse(rooms);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through
    }
  }
  return [];
}

function isRoomsEmpty(row) {
  return roomsOf(row).length === 0;
}

function byStartsAt(a, b) {
  return Number(a.starts_at) - Number(b.starts_at);
}

function cappedLimit(limit) {
  return Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : 200;
}

export async function getCalendarMeta(url) {
  const row = await dex().calendars.get(url);
  if (!row) return null;
  return {
    url: row.url,
    calname: row.calname || null,
    etag: row.etag || null,
    last_synced: row.last_synced != null ? Number(row.last_synced) : null,
    event_count: row.event_count != null ? Number(row.event_count) : null,
    sync_range: row.sync_range || null,
  };
}

export async function upsertCalendarMeta(meta) {
  await dex().calendars.put({
    url: meta.url,
    calname: meta.calname || null,
    etag: meta.etag || null,
    last_synced: meta.last_synced != null ? Number(meta.last_synced) : null,
    event_count: meta.event_count != null ? Number(meta.event_count) : null,
    sync_range: meta.sync_range || null,
  });
}

export async function replaceSessionsForCalendar(calUrl, sessions, opts) {
  const all = Array.isArray(sessions) ? sessions : [];
  const min = opts && opts.minStartsAt != null ? Number(opts.minStartsAt) : null;
  const max = opts && opts.maxStartsAt != null ? Number(opts.maxStartsAt) : null;
  const rows = all
    .filter((session) => {
      if (!session) return false;
      const startsAt = Number(session.starts_at);
      if (min != null && Number.isFinite(min) && startsAt < min) return false;
      if (max != null && Number.isFinite(max) && startsAt > max) return false;
      return true;
    })
    .map(toDexieRow);
  const db = dex();
  // One transaction for the delete + all inserts (sequential 500-row chunks
  // avoid lock contention and memory spikes, per Dexie docs).
  await db.transaction('rw', db.sessions, async () => {
    await db.sessions.where('cal_url').equals(calUrl).delete();
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      if (chunk.length > 0) await db.sessions.bulkAdd(chunk);
    }
  });
  return rows.length;
}

export async function countSessions() {
  return dex().sessions.count();
}

export async function countSessionsInRange(minStartsAt, maxStartsAt) {
  return dex().sessions.where('starts_at').between(Number(minStartsAt), Number(maxStartsAt), true, true).count();
}

export async function getSyncOverview() {
  const db = dex();
  const calendars = await db.calendars.count();
  let lastSynced = null;
  if (calendars > 0) {
    const all = await db.calendars.toArray();
    const max = Math.max(...all.map((c) => Number(c.last_synced) || 0));
    lastSynced = max > 0 ? max : null;
  }
  return { calendars, lastSynced };
}

export async function countByType() {
  const rows = await dex().sessions.toArray();
  const counts = new Map();
  for (const row of rows) {
    const key = row.session_type || null;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([session_type, n]) => ({ session_type, n }))
    .sort((a, b) => b.n - a.n);
}

export async function queryUpcomingByTeacher(teacher, limit) {
  const nowSec = Math.floor(Date.now() / 1000);
  const needle = String(teacher == null ? '' : teacher).toLowerCase();
  const rows = await dex().sessions.where('starts_at').aboveOrEqual(nowSec).toArray();
  const out = rows
    .filter((row) => String(row.teacher == null ? '' : row.teacher).toLowerCase().includes(needle))
    .sort(byStartsAt);
  return Number.isFinite(Number(limit)) && Number(limit) > 0 ? out.slice(0, Math.floor(Number(limit))) : out;
}

export async function queryUpcomingByType(type, limit) {
  const nowSec = Math.floor(Date.now() / 1000);
  const rows = await dex().sessions
    .where('[session_type+starts_at]').between([type, nowSec], [type, Dexie.maxKey])
    .toArray();
  rows.sort(byStartsAt);
  return Number.isFinite(Number(limit)) && Number(limit) > 0 ? rows.slice(0, Math.floor(Number(limit))) : rows;
}

// Sessions for the given calendar URLs inside [minSec, maxSec] (unix
// seconds, inclusive). One compound-index range per URL, concatenated and
// sorted — mirrors the native chunked-IN query.
export async function querySessionsByCalUrls(urls, minSec, maxSec) {
  const list = (Array.isArray(urls) ? urls : []).filter((u) => typeof u === 'string' && u);
  const db = dex();
  console.log(`[db] querySessionsByCalUrls urls=${list.length} min=${minSec} max=${maxSec} first=${JSON.stringify(list.slice(0, 2))}`);
  if (list.length === 0) return [];
  const out = [];
  for (const url of list) {
    const rows = await db.sessions
      .where('[cal_url+starts_at]').between([url, Number(minSec)], [url, Number(maxSec)], true, true)
      .toArray();
    out.push(...rows);
  }
  out.sort(byStartsAt);
  console.log(`[db] querySessionsByCalUrls rows=${out.length}`);
  return out;
}

// Bounds arrive in ms (call-site convention) and are converted to the
// seconds used by the store — same as the native adapter.
export async function queryGroupWeekByCalname(calname, weekStartMs, weekEndMs) {
  if (!calname) return [];
  const minSec = Math.floor(Number(weekStartMs) / 1000);
  const maxSec = Math.floor(Number(weekEndMs) / 1000);
  console.log(`[db] queryGroupWeekByCalname calname=${JSON.stringify(calname)} min=${minSec} max=${maxSec}`);
  const rows = await dex().sessions
    .where('[calname+starts_at]').between([calname, minSec], [calname, maxSec], true, true)
    .toArray();
  rows.sort(byStartsAt);
  console.log(`[db] queryGroupWeekByCalname rows=${rows.length}`);
  return rows;
}

export async function listTeachers() {
  const db = dex();
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const cached = await db.teachers.orderBy('name').toArray();
    if (cached.length > 0) {
      const names = cached.map((row) => row.name);
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
      console.log(`[db] listTeachers via teachers table rows=${names.length} ms=${ms}`);
      return names;
    }
  } catch (e) {
    console.warn(`listTeachers: teachers-table read failed, falling back to DISTINCT: ${e?.message || e}`);
  }
  const keys = await db.sessions.orderBy('teacher').uniqueKeys();
  const names = keys
    .map((key) => String(key == null ? '' : key).trim())
    .filter((name) => name !== '')
    .sort();
  const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
  console.log(`[db] listTeachers via DISTINCT rows=${names.length} ms=${ms}`);
  return names;
}

// Rebuild the materialized teachers table after a sync. Called once per
// sync by syncAll (via the facade), not per calendar. A stale list is
// better than a failed sync — callers log failures.
export async function rebuildTeachersTable() {
  const db = dex();
  await db.transaction('rw', db.teachers, db.sessions, async () => {
    await db.teachers.clear();
    const keys = await db.sessions.orderBy('teacher').uniqueKeys();
    const names = [...new Set(
      keys.map((key) => String(key == null ? '' : key).trim()).filter((name) => name !== ''),
    )];
    if (names.length > 0) {
      await db.teachers.bulkAdd(names.map((name) => ({ name })));
    }
  });
}

export async function queryTeacherWeek(teacher, weekStartMs, weekEndMs) {
  if (!teacher) return [];
  const minSec = Math.floor(Number(weekStartMs) / 1000);
  const maxSec = Math.floor(Number(weekEndMs) / 1000);
  const name = String(teacher).trim();
  console.log(`[db] queryTeacherWeek teacher=${JSON.stringify(name)} min=${minSec} max=${maxSec}`);
  // Stored teachers are trimmed at insert (same as the native TRIM()
  // cleanup), so an exact compound-index range matches the native
  // TRIM(teacher) = TRIM(?) semantics.
  const rows = await dex().sessions
    .where('[teacher+starts_at]').between([name, minSec], [name, maxSec], true, true)
    .toArray();
  rows.sort(byStartsAt);
  console.log(`[db] queryTeacherWeek rows=${rows.length}`);
  return rows;
}

export async function querySessionsFiltered({ type, subject, minMs, maxMs, limit }) {
  const db = dex();
  const minS = minMs != null ? Math.floor(Number(minMs) / 1000) : null;
  const maxS = maxMs != null ? Math.floor(Number(maxMs) / 1000) : null;
  const hasType = type && type !== 'All';
  let rows;
  if (hasType && minS != null && maxS != null) {
    rows = await db.sessions.where('[session_type+starts_at]').between([type, minS], [type, maxS], true, true).toArray();
  } else if (hasType) {
    rows = await db.sessions.where('session_type').equals(type).toArray();
  } else if (minS != null && maxS != null) {
    rows = await db.sessions.where('starts_at').between(minS, maxS, true, true).toArray();
  } else if (minS != null) {
    rows = await db.sessions.where('starts_at').aboveOrEqual(minS).toArray();
  } else if (maxS != null) {
    rows = await db.sessions.where('starts_at').belowOrEqual(maxS).toArray();
  } else {
    rows = await db.sessions.toArray();
  }
  // Re-apply bounds + type in JS so partial-bound calls match the SQL
  // semantics exactly, then the subject substring filter (LIKE is
  // case-insensitive for ASCII; lowercase-includes mirrors that).
  if (minS != null) rows = rows.filter((row) => Number(row.starts_at) >= minS);
  if (maxS != null) rows = rows.filter((row) => Number(row.starts_at) <= maxS);
  if (hasType) rows = rows.filter((row) => row.session_type === type);
  const q = subject && String(subject).trim() ? String(subject).trim().toLowerCase() : null;
  if (q) rows = rows.filter((row) => String(row.subject == null ? '' : row.subject).toLowerCase().includes(q));
  rows.sort(byStartsAt);
  const out = rows.slice(0, cappedLimit(limit));
  console.log(`[db] querySessionsFiltered rows=${out.length}`);
  return out;
}

export async function queryAutreSessions(limit) {
  const rows = await dex().sessions.where('session_type').equals('Autre').sortBy('starts_at');
  return rows.slice(0, cappedLimit(limit)).map((row) => ({
    raw_summary: row.raw_summary,
    calname: row.calname,
    starts_at: row.starts_at,
  }));
}

export async function queryEmptyRoomSessions(limit) {
  const rows = await dex().sessions
    .filter((row) => isRoomsEmpty(row) && row.raw_location != null && String(row.raw_location) !== '')
    .toArray();
  rows.sort(byStartsAt);
  return rows.slice(0, cappedLimit(limit)).map((row) => ({
    raw_location: row.raw_location,
    raw_summary: row.raw_summary,
    calname: row.calname,
  }));
}

export async function queryOnlineSessions(limit) {
  const rows = await dex().sessions.where('is_online').equals(1).sortBy('starts_at');
  return rows.slice(0, cappedLimit(limit)).map((row) => ({
    raw_summary: row.raw_summary,
    calname: row.calname,
    is_online: row.is_online,
  }));
}

export async function queryAutrePrefixCounts(limit) {
  const rows = await dex().sessions.where('session_type').equals('Autre').toArray();
  const counts = new Map();
  for (const row of rows) {
    const prefix = String(row.raw_summary == null ? '' : row.raw_summary).split(' ')[0] || '';
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([prefix, n]) => ({ prefix, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, cappedLimit(limit));
}

export async function countAutre() {
  return dex().sessions.where('session_type').equals('Autre').count();
}

export async function countEmptyRooms() {
  return dex().sessions
    .filter((row) => isRoomsEmpty(row) && row.raw_location != null && String(row.raw_location) !== '')
    .count();
}

export async function countOnline() {
  return dex().sessions.where('is_online').equals(1).count();
}

export async function countRoomsEmpty() {
  return dex().sessions.filter((row) => isRoomsEmpty(row)).count();
}
