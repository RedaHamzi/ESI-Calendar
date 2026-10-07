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
  `CREATE INDEX IF NOT EXISTS idx_sessions_cal_url ON sessions(cal_url)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_cal_starts ON sessions(cal_url, starts_at)`,
  // Materialized teacher list: SELECT DISTINCT over ~25k rows is slow on
  // device, so the post-sync rebuild keeps this table fresh and
  // listTeachers() becomes a cheap ordered scan.
  `CREATE TABLE IF NOT EXISTS teachers (name TEXT PRIMARY KEY)`,
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

function getSQLite() {
  if (!sqlite) sqlite = new SQLiteConnection(CapacitorSQLite);
  return sqlite;
}

// Singleton promise: the plugin's createConnection is not idempotent, so
// concurrent openDb() calls produce "Connection esi_calendar already
// exists". Exactly ONE caller (App root) resolves this; everyone else
// reads the connection from the Zustand store.
let _dbPromise = null;

export function openDb() {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const conn = getSQLite();
      if (Capacitor.getPlatform() === 'web') {
        await conn.initWebStore();
      }
      const known = await conn.isConnection(DB_NAME, false);
      let db;
      if (known && known.result) {
        db = await conn.retrieveConnection(DB_NAME, false);
      } else {
        db = await conn.createConnection(DB_NAME, false, 'no-encryption', 1, false);
      }
      await db.open();
      await ensureSchema(db);
      for (const ddl of [
        'ALTER TABLE sessions ADD COLUMN raw_location TEXT',
        'ALTER TABLE calendars ADD COLUMN sync_range TEXT',
      ]) {
        try {
          await db.execute(ddl);
        } catch (e) {
          const msg = String(e?.message ?? e);
          if (!/duplicate column name/i.test(msg)) throw e;
        }
      }
      return db;
    })().catch((e) => {
      _dbPromise = null; // allow retry on failure
      throw e;
    });
  }
  return _dbPromise;
}

export async function ensureSchema(db) {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execute(statement);
  }
  await db.execute("DELETE FROM sessions WHERE session_type NOT IN ('Cours','TD','TP')");
  // One-time cleanup: legacy rows may carry untrimmed teacher names, which
  // break the exact-match teacher lookup. Idempotent.
  try {
    await db.execute('UPDATE sessions SET teacher = TRIM(teacher) WHERE teacher IS NOT NULL AND teacher != TRIM(teacher)');
  } catch (e) {
    console.warn(`ensureSchema: teacher TRIM cleanup skipped: ${e?.message || e}`);
  }
  try {
    await db.execute('UPDATE sessions SET subject = TRIM(subject) WHERE subject IS NOT NULL AND subject != TRIM(subject)');
  } catch (e) {
    console.warn(`ensureSchema: subject TRIM cleanup skipped: ${e?.message || e}`);
  }
}

function rowsOf(result) {
  if (!result) return [];
  if (Array.isArray(result.values)) return result.values;
  return [];
}

export const SYNC_RANGES = ['year', 'month', 'week'];

export const ACADEMIC_YEAR_BOUNDS = {
  minStartsAt: Math.floor(Date.UTC(2025, 8, 1) / 1000),
  maxStartsAt: Math.floor(Date.UTC(2026, 7, 31, 23, 59, 59) / 1000),
};

// Range filtering happens at INSERT time (parse stays pure): callers pass
// these bounds as opts to replaceSessionsForCalendar. Seconds, inclusive.
export function getSyncRangeBounds(range, nowMs) {
  const now = new Date(nowMs == null ? Date.now() : nowMs);
  if (range === 'month') {
    const min = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const max = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      minStartsAt: Math.floor(min.getTime() / 1000),
      maxStartsAt: Math.floor(max.getTime() / 1000),
    };
  }
  if (range === 'week') {
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59);
    return {
      minStartsAt: Math.floor(monday.getTime() / 1000),
      maxStartsAt: Math.floor(sunday.getTime() / 1000),
    };
  }
  return { ...ACADEMIC_YEAR_BOUNDS };
}

export async function getCalendarMeta(db, url) {
  const result = await db.query('SELECT url, calname, etag, last_synced, event_count, sync_range FROM calendars WHERE url = ?', [url]);
  const rows = rowsOf(result);
  return rows.length > 0 ? rows[0] : null;
}

export async function upsertCalendarMeta(db, meta) {
  const updated = await db.run(
    'UPDATE calendars SET calname = ?, etag = ?, last_synced = ?, event_count = ?, sync_range = ? WHERE url = ?',
    [meta.calname || null, meta.etag || null, meta.last_synced || null, meta.event_count || null, meta.sync_range || null, meta.url],
  );
  const changed = updated && typeof updated.changes === 'object'
    ? updated.changes.changes
    : updated.changes;
  if (!changed) {
    await db.run(
      'INSERT INTO calendars (url, calname, etag, last_synced, event_count, sync_range) VALUES (?, ?, ?, ?, ?, ?)',
      [meta.url, meta.calname || null, meta.etag || null, meta.last_synced || null, meta.event_count || null, meta.sync_range || null],
    );
  }
}

function sessionToRow(session) {
  const teacher = session.teacher == null ? null : String(session.teacher).trim() || null;
  const subject = session.subject == null ? null : String(session.subject).trim() || null;
  return [
    session.uid,
    session.recurrence_id == null ? '' : String(session.recurrence_id),
    session.cal_url,
    session.calname || null,
    subject,
    session.session_type || null,
    teacher,
    session.rooms == null ? '[]' : String(session.rooms),
    session.is_online ? 1 : 0,
    session.starts_at,
    session.ends_at,
    session.raw_summary || null,
    session.raw_location || null,
  ];
}

export async function replaceSessionsForCalendar(db, calUrl, sessions, opts) {
  const all = Array.isArray(sessions) ? sessions : [];
  const min = opts && opts.minStartsAt != null ? Number(opts.minStartsAt) : null;
  const max = opts && opts.maxStartsAt != null ? Number(opts.maxStartsAt) : null;
  const list = all.filter((session) => {
    if (!session) return false;
    const startsAt = Number(session.starts_at);
    if (min != null && Number.isFinite(min) && startsAt < min) return false;
    if (max != null && Number.isFinite(max) && startsAt > max) return false;
    return true;
  });
  const stmts = [
    { statement: 'DELETE FROM sessions WHERE cal_url = ?', values: [calUrl] },
    ...list.map((session) => ({ statement: INSERT_SQL, values: sessionToRow(session) })),
  ];
  // Chunked so a big calendar doesn't block the JS thread / SQLite bridge
  // in one giant batch. The DELETE rides in the first chunk; each
  // executeSet call keeps its own transaction (never wrap manually).
  const CHUNK = 500;
  for (let i = 0; i < stmts.length; i += CHUNK) {
    await db.executeSet(stmts.slice(i, i + CHUNK));
    if (i + CHUNK < stmts.length) {
      await new Promise((r) => setTimeout(r, 0)); // yield to UI
    }
  }
  return list.length;
}

export async function countSessions(db) {
  const result = await db.query('SELECT COUNT(*) AS n FROM sessions');
  const rows = rowsOf(result);
  return rows.length > 0 ? Number(rows[0].n) : 0;
}

export async function countSessionsInRange(db, minStartsAt, maxStartsAt) {
  const result = await db.query(
    'SELECT COUNT(*) AS n FROM sessions WHERE starts_at >= ? AND starts_at <= ?',
    [minStartsAt, maxStartsAt],
  );
  const rows = rowsOf(result);
  return rows.length > 0 ? Number(rows[0].n) : 0;
}

export async function getSyncOverview(db) {
  const result = await db.query('SELECT COUNT(*) AS n, MAX(last_synced) AS lastSynced FROM calendars');
  const rows = rowsOf(result);
  return {
    calendars: rows.length > 0 ? Number(rows[0].n) : 0,
    lastSynced: rows.length > 0 ? rows[0].lastSynced : null,
  };
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

// Sessions for the given calendar URLs inside [minSec, maxSec] (unix
// seconds, inclusive). All values parameterized; urls beyond SQLite's
// variable limit are chunked. NOTE: both sync (getCalendarUrls) and all
// query call-sites build URLs via calendarIdToIcsUrl(), which strips
// trailing "&" — so stored cal_url values and query inputs share the same
// form. If this query ever returns 0 rows on a synced DB, compare a
// SELECT DISTINCT cal_url sample against the query inputs first.
export async function querySessionsByCalUrls(db, urls, minSec, maxSec) {
  const list = (Array.isArray(urls) ? urls : []).filter((u) => typeof u === 'string' && u);
  console.log(`[db] querySessionsByCalUrls urls=${list.length} min=${minSec} max=${maxSec} first=${JSON.stringify(list.slice(0, 2))}`);
  if (list.length === 0) return [];
  const out = [];
  const CHUNK = 400;
  for (let i = 0; i < list.length; i += CHUNK) {
    const chunk = list.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '?').join(', ');
    const result = await db.query(
      `SELECT * FROM sessions WHERE cal_url IN (${placeholders}) AND starts_at >= ? AND starts_at <= ? ORDER BY starts_at ASC`,
      [...chunk, minSec, maxSec],
    );
    out.push(...rowsOf(result));
  }
  out.sort((a, b) => Number(a.starts_at) - Number(b.starts_at));
  console.log(`[db] querySessionsByCalUrls rows=${out.length}`);
  return out;
}

// Fallback lookup by stored X-WR-CALNAME. Bounds arrive in ms (call-site
// convention) and are converted to the seconds used by the DB.
export async function queryGroupWeekByCalname(db, calname, weekStartMs, weekEndMs) {
  if (!calname) return [];
  const minSec = Math.floor(Number(weekStartMs) / 1000);
  const maxSec = Math.floor(Number(weekEndMs) / 1000);
  console.log(`[db] queryGroupWeekByCalname calname=${JSON.stringify(calname)} min=${minSec} max=${maxSec}`);
  const result = await db.query(
    'SELECT * FROM sessions WHERE calname = ? AND starts_at >= ? AND starts_at <= ? ORDER BY starts_at ASC',
    [calname, minSec, maxSec],
  );
  const rows = rowsOf(result);
  console.log(`[db] queryGroupWeekByCalname rows=${rows.length}`);
  return rows;
}

function escapeLike(value) {
  return String(value == null ? '' : value).replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function listTeachers(db) {
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const fast = await db.query('SELECT name AS teacher FROM teachers ORDER BY name');
    const cached = rowsOf(fast);
    if (cached.length > 0) {
      const names = cached.map((row) => row.teacher);
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
      console.log(`[db] listTeachers via teachers table rows=${names.length} ms=${ms}`);
      return names;
    }
  } catch (e) {
    console.warn(`listTeachers: teachers-table read failed, falling back to DISTINCT: ${e?.message || e}`);
  }
  const result = await db.query(
    "SELECT DISTINCT TRIM(teacher) AS teacher FROM sessions WHERE teacher IS NOT NULL AND TRIM(teacher) != '' ORDER BY teacher",
  );
  const names = rowsOf(result).map((row) => row.teacher);
  const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
  console.log(`[db] listTeachers via DISTINCT rows=${names.length} ms=${ms}`);
  return names;
}

// Rebuild the materialized teachers table after a sync. One DELETE + one
// INSERT-SELECT; callers (syncAll) invoke this once per sync, not per
// calendar. Failures are logged by the caller — a stale list is better
// than a failed sync.
export async function rebuildTeachersTable(db) {
  await db.execute('DELETE FROM teachers');
  await db.execute(
    "INSERT OR IGNORE INTO teachers (name) SELECT DISTINCT TRIM(teacher) FROM sessions WHERE teacher IS NOT NULL AND TRIM(teacher) != ''",
  );
}

export async function queryTeacherWeek(db, teacher, weekStartMs, weekEndMs) {
  if (!teacher) return [];
  const minSec = Math.floor(Number(weekStartMs) / 1000);
  const maxSec = Math.floor(Number(weekEndMs) / 1000);
  const sql = 'SELECT * FROM sessions WHERE TRIM(teacher) = TRIM(?) AND starts_at >= ? AND starts_at <= ? ORDER BY starts_at ASC';
  const params = [teacher, minSec, maxSec];
  console.log(`[db] queryTeacherWeek sql=${sql} params=${JSON.stringify(params)}`);
  const result = await db.query(sql, params);
  const rows = rowsOf(result);
  console.log(`[db] queryTeacherWeek rows=${rows.length}`);
  return rows;
}

export async function querySessionsFiltered(db, { type, subject, minMs, maxMs, limit }) {
  const clauses = [];
  const values = [];
  if (type && type !== 'All') {
    clauses.push('session_type = ?');
    values.push(type);
  }
  if (subject && String(subject).trim()) {
    clauses.push("subject LIKE ? ESCAPE '\\'");
    values.push(`%${escapeLike(String(subject).trim())}%`);
  }
  if (minMs != null) {
    clauses.push('starts_at >= ?');
    values.push(Math.floor(Number(minMs) / 1000));
  }
  if (maxMs != null) {
    clauses.push('starts_at <= ?');
    values.push(Math.floor(Number(maxMs) / 1000));
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const capped = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : 200;
  const sql = `SELECT * FROM sessions ${where} ORDER BY starts_at ASC LIMIT ${capped}`;
  console.log(`[db] querySessionsFiltered sql=${sql} params=${JSON.stringify(values)}`);
  const result = await db.query(sql, values);
  const rows = rowsOf(result);
  console.log(`[db] querySessionsFiltered rows=${rows.length}`);
  return rows;
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
