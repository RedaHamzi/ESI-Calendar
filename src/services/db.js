import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

export const DB_NAME = 'esi_calendar';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS calendars (
    url           TEXT PRIMARY KEY,
    calname       TEXT,
    etag          TEXT,
    last_synced   INTEGER,
    event_count   INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    uid           TEXT NOT NULL,
    recurrence_id TEXT NOT NULL DEFAULT '',
    cal_url       TEXT NOT NULL,
    calname       TEXT,
    subject       TEXT,
    session_type  TEXT,
    teacher       TEXT,
    rooms         TEXT,
    is_online     INTEGER DEFAULT 0,
    starts_at     INTEGER NOT NULL,
    ends_at       INTEGER NOT NULL,
    raw_summary   TEXT,
    raw_location  TEXT,
    PRIMARY KEY (uid, recurrence_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions(teacher)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_starts ON sessions(starts_at)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_calname ON sessions(calname)`,
];

const SESSION_COLUMNS = [
  'uid',
  'recurrence_id',
  'cal_url',
  'calname',
  'subject',
  'session_type',
  'teacher',
  'rooms',
  'is_online',
  'starts_at',
  'ends_at',
  'raw_summary',
  'raw_location',
];

const INSERT_SQL = `INSERT OR REPLACE INTO sessions (${SESSION_COLUMNS.join(', ')}) VALUES (${SESSION_COLUMNS.map(() => '?').join(', ')})`;

let sqlite = null;
let dbInstance = null;

function getSQLite() {
  if (!sqlite) sqlite = new SQLiteConnection(CapacitorSQLite);
  return sqlite;
}

export async function openDb() {
  if (dbInstance) return dbInstance;
  const conn = getSQLite();
  if (Capacitor.getPlatform() === 'web') {
    await conn.initWebStore();
  }
  const known = await conn.isConnection(DB_NAME, false);
  if (known && known.result) {
    dbInstance = await conn.retrieveConnection(DB_NAME, false);
  } else {
    dbInstance = await conn.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  }
  await dbInstance.open();
  await ensureSchema(dbInstance);
  try {
    await dbInstance.execute('ALTER TABLE sessions ADD COLUMN raw_location TEXT');
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (!/duplicate column name/i.test(msg)) throw e;
  }
  return dbInstance;
}

export async function ensureSchema(db) {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execute(statement);
  }
  await db.execute("DELETE FROM sessions WHERE session_type NOT IN ('Cours','TD','TP')");
}

function rowsOf(result) {
  if (!result) return [];
  if (Array.isArray(result.values)) return result.values;
  return [];
}

export async function getCalendarMeta(db, url) {
  const result = await db.query('SELECT url, calname, etag, last_synced, event_count FROM calendars WHERE url = ?', [url]);
  const rows = rowsOf(result);
  return rows.length > 0 ? rows[0] : null;
}

export async function upsertCalendarMeta(db, meta) {
  const updated = await db.run(
    'UPDATE calendars SET calname = ?, etag = ?, last_synced = ?, event_count = ? WHERE url = ?',
    [meta.calname || null, meta.etag || null, meta.last_synced || null, meta.event_count || null, meta.url],
  );
  const changed = updated && typeof updated.changes === 'object'
    ? updated.changes.changes
    : updated.changes;
  if (!changed) {
    await db.run(
      'INSERT INTO calendars (url, calname, etag, last_synced, event_count) VALUES (?, ?, ?, ?, ?)',
      [meta.url, meta.calname || null, meta.etag || null, meta.last_synced || null, meta.event_count || null],
    );
  }
}

function sessionToRow(session) {
  return [
    session.uid,
    session.recurrence_id == null ? '' : String(session.recurrence_id),
    session.cal_url,
    session.calname || null,
    session.subject || null,
    session.session_type || null,
    session.teacher || null,
    session.rooms == null ? '[]' : String(session.rooms),
    session.is_online ? 1 : 0,
    session.starts_at,
    session.ends_at,
    session.raw_summary || null,
    session.raw_location || null,
  ];
}

export async function replaceSessionsForCalendar(db, calUrl, sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  const stmts = [
    { statement: 'DELETE FROM sessions WHERE cal_url = ?', values: [calUrl] },
    ...list.map((session) => ({ statement: INSERT_SQL, values: sessionToRow(session) })),
  ];
  await db.executeSet(stmts);
}

export async function countSessions(db) {
  const result = await db.query('SELECT COUNT(*) AS n FROM sessions');
  const rows = rowsOf(result);
  return rows.length > 0 ? Number(rows[0].n) : 0;
}

export async function countByType(db) {
  const result = await db.query('SELECT session_type, COUNT(*) AS n FROM sessions GROUP BY session_type ORDER BY n DESC');
  return rowsOf(result).map((row) => ({ session_type: row.session_type, n: Number(row.n) }));
}

export async function queryUpcomingByTeacher(db, teacher, limit) {
  const nowSec = Math.floor(Date.now() / 1000);
  const result = await db.query(
    'SELECT * FROM sessions WHERE teacher LIKE ? AND starts_at >= ? ORDER BY starts_at ASC LIMIT ?',
    [`%${teacher}%`, nowSec, limit],
  );
  return rowsOf(result);
}

export async function queryUpcomingByType(db, type, limit) {
  const nowSec = Math.floor(Date.now() / 1000);
  const result = await db.query(
    'SELECT * FROM sessions WHERE session_type = ? AND starts_at >= ? ORDER BY starts_at ASC LIMIT ?',
    [type, nowSec, limit],
  );
  return rowsOf(result);
}

export async function queryAutreSessions(db, limit) {
  const result = await db.query(
    "SELECT raw_summary, calname, starts_at FROM sessions WHERE session_type = 'Autre' ORDER BY starts_at ASC LIMIT ?",
    [limit],
  );
  return rowsOf(result);
}

export async function queryEmptyRoomSessions(db, limit) {
  const result = await db.query(
    "SELECT raw_location, raw_summary, calname FROM sessions WHERE rooms = '[]' AND raw_location IS NOT NULL AND raw_location != '' ORDER BY starts_at ASC LIMIT ?",
    [limit],
  );
  return rowsOf(result);
}

export async function queryOnlineSessions(db, limit) {
  const result = await db.query(
    'SELECT raw_summary, calname, is_online FROM sessions WHERE is_online = 1 ORDER BY starts_at ASC LIMIT ?',
    [limit],
  );
  return rowsOf(result);
}

export async function queryAutrePrefixCounts(db, limit) {
  const result = await db.query(
    `SELECT
      SUBSTR(raw_summary, 1, INSTR(raw_summary || ' ', ' ') - 1) AS prefix,
      COUNT(*) AS n
    FROM sessions
    WHERE session_type = 'Autre'
    GROUP BY prefix
    ORDER BY n DESC
    LIMIT ?`,
    [limit],
  );
  return rowsOf(result).map((row) => ({ prefix: row.prefix, n: Number(row.n) }));
}

export async function countAutre(db) {
  const result = await db.query("SELECT COUNT(*) AS n FROM sessions WHERE session_type = 'Autre'");
  const rows = rowsOf(result);
  return rows.length > 0 ? Number(rows[0].n) : 0;
}

export async function countEmptyRooms(db) {
  const result = await db.query("SELECT COUNT(*) AS n FROM sessions WHERE rooms = '[]' AND raw_location IS NOT NULL AND raw_location != ''");
  const rows = rowsOf(result);
  return rows.length > 0 ? Number(rows[0].n) : 0;
}

export async function countOnline(db) {
  const result = await db.query('SELECT COUNT(*) AS n FROM sessions WHERE is_online = 1');
  const rows = rowsOf(result);
  return rows.length > 0 ? Number(rows[0].n) : 0;
}
