// Web storage adapter (IndexedDB via Dexie).
//
// PART A SKELETON: only the database handle + open()/close() exist so the
// storage facade can resolve on web. Every query/write function lands in
// Part B (p7b) and currently throws if called.

import Dexie from 'dexie';

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

function notYet(name) {
  return async () => {
    throw new Error(`dexieAdapter: ${name} is not implemented yet (lands in p7b)`);
  };
}

export const getCalendarMeta = notYet('getCalendarMeta');
export const upsertCalendarMeta = notYet('upsertCalendarMeta');
export const replaceSessionsForCalendar = notYet('replaceSessionsForCalendar');
export const countSessions = notYet('countSessions');
export const countSessionsInRange = notYet('countSessionsInRange');
export const getSyncOverview = notYet('getSyncOverview');
export const countByType = notYet('countByType');
export const queryUpcomingByTeacher = notYet('queryUpcomingByTeacher');
export const queryUpcomingByType = notYet('queryUpcomingByType');
export const querySessionsByCalUrls = notYet('querySessionsByCalUrls');
export const queryGroupWeekByCalname = notYet('queryGroupWeekByCalname');
export const listTeachers = notYet('listTeachers');
export const rebuildTeachersTable = notYet('rebuildTeachersTable');
export const queryTeacherWeek = notYet('queryTeacherWeek');
export const querySessionsFiltered = notYet('querySessionsFiltered');
export const queryAutreSessions = notYet('queryAutreSessions');
export const queryEmptyRoomSessions = notYet('queryEmptyRoomSessions');
export const queryOnlineSessions = notYet('queryOnlineSessions');
export const queryAutrePrefixCounts = notYet('queryAutrePrefixCounts');
export const countAutre = notYet('countAutre');
export const countEmptyRooms = notYet('countEmptyRooms');
export const countOnline = notYet('countOnline');
export const countRoomsEmpty = notYet('countRoomsEmpty');
