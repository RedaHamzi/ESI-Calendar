// Storage facade: every caller (sync, pages, hooks, stores) talks to ONE
// interface. The concrete backend — native SQLite vs web Dexie (IndexedDB)
// — is picked at runtime by Capacitor.isNativePlatform().
//
// Adapters own their connections: callers never pass a handle, they just
// call `countSessions()`, `queryTeacherWeek(...)`, etc. (or grab the adapter
// once via getStorage()). The Zustand store keeps the adapter as `db` for
// readiness truthiness only.

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

export async function getCalendarMeta(url) {
  return (await getStorage()).getCalendarMeta(url);
}

export async function upsertCalendarMeta(meta) {
  return (await getStorage()).upsertCalendarMeta(meta);
}

export async function replaceSessionsForCalendar(calUrl, sessions, opts) {
  return (await getStorage()).replaceSessionsForCalendar(calUrl, sessions, opts);
}

export async function countSessions() {
  return (await getStorage()).countSessions();
}

export async function countSessionsInRange(minStartsAt, maxStartsAt) {
  return (await getStorage()).countSessionsInRange(minStartsAt, maxStartsAt);
}

export async function getSyncOverview() {
  return (await getStorage()).getSyncOverview();
}

export async function countByType() {
  return (await getStorage()).countByType();
}

export async function queryUpcomingByTeacher(teacher, limit) {
  return (await getStorage()).queryUpcomingByTeacher(teacher, limit);
}

export async function queryUpcomingByType(type, limit) {
  return (await getStorage()).queryUpcomingByType(type, limit);
}

export async function querySessionsByCalUrls(urls, minSec, maxSec) {
  return (await getStorage()).querySessionsByCalUrls(urls, minSec, maxSec);
}

export async function queryGroupWeekByCalname(calname, weekStartMs, weekEndMs) {
  return (await getStorage()).queryGroupWeekByCalname(calname, weekStartMs, weekEndMs);
}

export async function listTeachers() {
  return (await getStorage()).listTeachers();
}

export async function rebuildTeachersTable() {
  return (await getStorage()).rebuildTeachersTable();
}

export async function queryTeacherWeek(teacher, weekStartMs, weekEndMs) {
  return (await getStorage()).queryTeacherWeek(teacher, weekStartMs, weekEndMs);
}

export async function querySessionsFiltered(filters) {
  return (await getStorage()).querySessionsFiltered(filters);
}

export async function queryAutreSessions(limit) {
  return (await getStorage()).queryAutreSessions(limit);
}

export async function queryEmptyRoomSessions(limit) {
  return (await getStorage()).queryEmptyRoomSessions(limit);
}

export async function queryOnlineSessions(limit) {
  return (await getStorage()).queryOnlineSessions(limit);
}

export async function queryAutrePrefixCounts(limit) {
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
