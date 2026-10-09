// Storage facade: every caller (sync, pages, hooks, stores) talks to ONE
// interface. The concrete backend — native SQLite vs web Dexie (IndexedDB)
// — is picked at runtime by Capacitor.isNativePlatform().
//
// Migration note (Part A): the historic calling convention passes the raw
// SQLite connection as the first arg (`countSessions(db)`). Adapters now own
// their connections, so these wrappers accept-but-ignore that first arg.
// Existing call sites work unchanged; Part F drops the arg everywhere and
// deletes src/services/db.js. New code should call getStorage() directly.

import { Capacitor } from '@capacitor/core';

export { SYNC_RANGES, ACADEMIC_YEAR_BOUNDS, getSyncRangeBounds } from '../syncRange.js';

export const DB_NAME = 'esi_calendar';

let _impl = null;
let _implPromise = null;

export async function getStorage() {
  if (_impl) return _impl;
  if (!_implPromise) {
    _implPromise = (async () => {
      const mod = Capacitor.isNativePlatform()
        ? await import('./sqliteAdapter')
        : await import('./dexieAdapter');
      await mod.open();
      _impl = mod;
      return mod;
    })().catch((e) => {
      _implPromise = null; // allow retry on failure
      throw e;
    });
  }
  return _implPromise;
}

export function resetStorage() {
  _impl = null;
  _implPromise = null;
}

// Legacy entry point (App root only): resolves the adapter. Returns the
// storage module, which the app keeps in the Zustand store as `db`.
export async function openDb() {
  return getStorage();
}

export async function getCalendarMeta(db, url) {
  return (await getStorage()).getCalendarMeta(url);
}

export async function upsertCalendarMeta(db, meta) {
  return (await getStorage()).upsertCalendarMeta(meta);
}

export async function replaceSessionsForCalendar(db, calUrl, sessions, opts) {
  return (await getStorage()).replaceSessionsForCalendar(calUrl, sessions, opts);
}

// NOTE: single-arg wrappers omit the legacy handle entirely (extra args
// from old `fn(db)` call sites are ignored by JS). Wrappers that take real
// args keep a leading `db` placeholder so old positional calls still bind
// correctly. Part F removes the placeholders everywhere.
export async function countSessions() {
  return (await getStorage()).countSessions();
}

export async function countSessionsInRange(db, minStartsAt, maxStartsAt) {
  return (await getStorage()).countSessionsInRange(minStartsAt, maxStartsAt);
}

export async function getSyncOverview() {
  return (await getStorage()).getSyncOverview();
}

export async function countByType() {
  return (await getStorage()).countByType();
}

export async function queryUpcomingByTeacher(db, teacher, limit) {
  return (await getStorage()).queryUpcomingByTeacher(teacher, limit);
}

export async function queryUpcomingByType(db, type, limit) {
  return (await getStorage()).queryUpcomingByType(type, limit);
}

export async function querySessionsByCalUrls(db, urls, minSec, maxSec) {
  return (await getStorage()).querySessionsByCalUrls(urls, minSec, maxSec);
}

export async function queryGroupWeekByCalname(db, calname, weekStartMs, weekEndMs) {
  return (await getStorage()).queryGroupWeekByCalname(calname, weekStartMs, weekEndMs);
}

export async function listTeachers() {
  return (await getStorage()).listTeachers();
}

export async function rebuildTeachersTable() {
  return (await getStorage()).rebuildTeachersTable();
}

export async function queryTeacherWeek(db, teacher, weekStartMs, weekEndMs) {
  return (await getStorage()).queryTeacherWeek(teacher, weekStartMs, weekEndMs);
}

export async function querySessionsFiltered(db, filters) {
  return (await getStorage()).querySessionsFiltered(filters);
}

export async function queryAutreSessions(db, limit) {
  return (await getStorage()).queryAutreSessions(limit);
}

export async function queryEmptyRoomSessions(db, limit) {
  return (await getStorage()).queryEmptyRoomSessions(limit);
}

export async function queryOnlineSessions(db, limit) {
  return (await getStorage()).queryOnlineSessions(limit);
}

export async function queryAutrePrefixCounts(db, limit) {
  return (await getStorage()).queryAutrePrefixCounts(limit);
}

export async function countAutre() {
  return (await getStorage()).countAutre();
}

export async function countEmptyRooms() {
  return (await getStorage()).countEmptyRooms();
}

export async function countOnline() {
  return (await getStorage()).countOnline();
}

export async function countRoomsEmpty() {
  return (await getStorage()).countRoomsEmpty();
}
