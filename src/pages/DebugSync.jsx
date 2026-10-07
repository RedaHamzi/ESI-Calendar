import { useMemo, useState } from 'react';
import { classes, groups } from '../data/data';
import { openDb, countSessions, countByType, queryUpcomingByTeacher, queryAutreSessions, queryEmptyRoomSessions, queryOnlineSessions, countAutre, countEmptyRooms, countOnline } from '../services/db';
import { syncAll, getCalendarUrls, calendarIdToIcsUrl } from '../services/sync';

function formatTimestamp(ms) {
  if (!ms) return 'never';
  try {
    return new Date(ms).toLocaleString();
  } catch (err) {
    return String(ms);
  }
}

function formatStartsAt(sec) {
  try {
    return new Date(sec * 1000).toLocaleString();
  } catch (err) {
    return String(sec);
  }
}

function formatStartsAtISO(sec) {
  try {
    return new Date(sec * 1000).toISOString();
  } catch (err) {
    return String(sec);
  }
}

function formatRooms(roomsJson) {
  try {
    const rooms = JSON.parse(roomsJson);
    if (Array.isArray(rooms)) return rooms.length > 0 ? rooms.join(', ') : '(none)';
  } catch (err) {
    // fall through to raw display
  }
  return roomsJson || '(none)';
}

export default function DebugSync() {
  const [isDark] = useState(() => {
    try {
      return localStorage.getItem('esi-calendar-theme') !== 'light';
    } catch (err) {
      return true;
    }
  });
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState(null);
  const [teacher, setTeacher] = useState('');
  const [teacherResults, setTeacherResults] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState(null);

  const titleByUrl = useMemo(() => {
    const map = new Map();
    for (const entry of classes) {
      if (entry && typeof entry.src === 'string') {
        const url = calendarIdToIcsUrl(entry.src);
        if (!map.has(url)) map.set(url, entry.title);
      }
    }
    for (const entry of groups) {
      const list = entry && Array.isArray(entry.src) ? entry.src : [];
      for (const id of list) {
        if (typeof id === 'string') {
          const url = calendarIdToIcsUrl(id);
          if (!map.has(url)) map.set(url, entry.title);
        }
      }
    }
    return map;
  }, []);

  const labelFor = (url) => titleByUrl.get(url) || url;

  const loadStats = async () => {
    const db = await openDb();
    const total = await countSessions(db);
    const byType = await countByType(db);
    const calResult = await db.query('SELECT COUNT(*) AS n, MAX(last_synced) AS lastSynced FROM calendars');
    const calRows = calResult && Array.isArray(calResult.values) ? calResult.values : [];
    const roomResult = await db.query("SELECT COUNT(*) AS n FROM sessions WHERE rooms = '[]'");
    const roomRows = roomResult && Array.isArray(roomResult.values) ? roomResult.values : [];
    const onlineCount = await countOnline(db);
    setStats({
      total,
      byType,
      calendars: calRows.length > 0 ? Number(calRows[0].n) : 0,
      lastSynced: calRows.length > 0 ? calRows[0].lastSynced : null,
      emptyRooms: roomRows.length > 0 ? Number(roomRows[0].n) : 0,
      online: onlineCount,
    });
    const DIAG_LIMIT = 20;
    const [autreTotal, autreRows, emptyRoomsTotal, emptyRoomRows, onlineTotal, onlineRows] = await Promise.all([
      countAutre(db),
      queryAutreSessions(db, DIAG_LIMIT),
      countEmptyRooms(db),
      queryEmptyRoomSessions(db, DIAG_LIMIT),
      countOnline(db),
      queryOnlineSessions(db, DIAG_LIMIT),
    ]);
    setDiagnostics({
      autreTotal,
      autreRows,
      emptyRoomsTotal,
      emptyRoomRows,
      onlineTotal,
      onlineRows,
    });
  };

  const copyJson = async (key, payload) => {
    setCopiedKey(null);
    setError(null);
    const text = JSON.stringify(payload, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
    } catch (err) {
      setError(`Copy failed: ${err.message || String(err)}`);
    }
  };

  const handleSync = async (force) => {
    setSyncing(true);
    setProgress(null);
    setSummary(null);
    setError(null);
    try {
      const result = await syncAll(
        getCalendarUrls(),
        (done, total, currentUrl) => {
          setProgress({ done, total, current: labelFor(currentUrl) });
        },
        force ? { force: true } : undefined,
      );
      setSummary(result);
      await loadStats();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  };

  const handleTeacherQuery = async () => {
    setError(null);
    setTeacherResults(null);
    try {
      const db = await openDb();
      const rows = await queryUpcomingByTeacher(db, teacher.trim(), 5);
      setTeacherResults(rows);
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const pageClass = isDark ? 'bg-slate-900 text-white' : 'bg-blue-50 text-gray-900';
  const cardClass = isDark ? 'bg-white/10 border-white/20' : 'bg-white/80 border-purple-200';
  const inputClass = isDark ? 'bg-slate-800 border-white/20 text-white' : 'bg-white border-purple-200 text-gray-900';

  return (
    <div className={`${pageClass} min-h-screen-mobile p-4`}>
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-lg font-bold text-center">Sync Debug</h1>

        <button
          type="button"
          onClick={() => handleSync(false)}
          disabled={syncing}
          className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-3 disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync all calendars'}
        </button>

        <button
          type="button"
          onClick={() => handleSync(true)}
          disabled={syncing}
          className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-3 disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Re-sync all calendars'}
        </button>

        {syncing && progress && (
          <p className="text-sm text-center">
            Syncing {progress.done} / {progress.total} — {progress.current}
          </p>
        )}

        {error && <p className="text-sm text-center text-red-400">{error}</p>}

        {summary && (
          <div className={`rounded-2xl p-4 border ${cardClass}`}>
            <p className="text-sm font-semibold mb-1">Last sync result</p>
            <p className="text-sm">Updated: {summary.updated}</p>
            <p className="text-sm">Unchanged (304): {summary.unchanged}</p>
            <p className="text-sm">Failed: {summary.failed}</p>
            {summary.failures && summary.failures.length > 0 && (
              <ul className="text-xs mt-2 space-y-1">
                {summary.failures.map((f) => (
                  <li key={f.url}>
                    {labelFor(f.url)} — {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {stats && (
          <div className={`rounded-2xl p-4 border ${cardClass}`}>
            <p className="text-sm font-semibold mb-1">Database stats</p>
            <p className="text-sm">Total sessions: {stats.total}</p>
            <p className="text-sm">Calendars synced: {stats.calendars}</p>
            <p className="text-sm">Last sync: {formatTimestamp(stats.lastSynced)}</p>
            <p className="text-sm">Sessions with rooms = []: {stats.emptyRooms}</p>
            <p className="text-sm">Online sessions: {stats.online}</p>
            <div className="mt-2">
              <p className="text-sm font-semibold">Per type</p>
              <ul className="text-sm">
                {stats.byType.map((row) => (
                  <li key={row.session_type || '(null)'}>
                    {row.session_type || '(null)'}: {row.n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {diagnostics && (
          <div className={`rounded-2xl p-4 border ${cardClass}`}>
            <p className="text-sm font-semibold mb-2">Diagnostics</p>
            <details open>
              <summary className="text-sm cursor-pointer">
                Stored session_type breakdown (expect Cours / TD / TP only)
              </summary>
              <table className="text-xs mt-2 w-full">
                <thead>
                  <tr>
                    <th className="text-left">session_type</th>
                    <th className="text-left">n</th>
                  </tr>
                </thead>
                <tbody>
                  {(!stats || !stats.byType || stats.byType.length === 0) && (
                    <tr><td>(none)</td><td>0</td></tr>
                  )}
                  {(stats && stats.byType ? stats.byType : []).map((row) => {
                    const unexpected = row.session_type !== 'Cours' && row.session_type !== 'TD' && row.session_type !== 'TP';
                    return (
                      <tr key={row.session_type || '(null)'}>
                        <td>{row.session_type || '(null)'}{unexpected ? ' — BUG: unexpected value' : ''}</td>
                        <td>{row.n}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </details>
            <details className="mt-2">
              <summary className="text-sm cursor-pointer">
                session_type = Autre ({diagnostics.autreTotal})
              </summary>
              <button
                type="button"
                onClick={() => copyJson('autre', diagnostics.autreRows.map((s) => ({
                  raw_summary: s.raw_summary,
                  calname: s.calname,
                  starts_at: formatStartsAtISO(s.starts_at),
                })))}
                className="mt-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold px-3 py-1"
              >
                {copiedKey === 'autre' ? 'Copied!' : 'Copy as JSON'}
              </button>
              <ul className="text-xs mt-2 space-y-1">
                {diagnostics.autreRows.length === 0 && <li>None.</li>}
                {diagnostics.autreRows.map((s, i) => (
                  <li key={`${s.raw_summary}|${s.calname}|${s.starts_at}|${i}`}>
                    {s.raw_summary || '(no summary)'} | {s.calname || ''} | {formatStartsAtISO(s.starts_at)}
                  </li>
                ))}
              </ul>
            </details>
            <details className="mt-2">
              <summary className="text-sm cursor-pointer">
                rooms = [] with raw_location ({diagnostics.emptyRoomsTotal})
              </summary>
              <button
                type="button"
                onClick={() => copyJson('emptyRooms', diagnostics.emptyRoomRows.map((s) => ({
                  raw_location: s.raw_location,
                  raw_summary: s.raw_summary,
                  calname: s.calname,
                })))}
                className="mt-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold px-3 py-1"
              >
                {copiedKey === 'emptyRooms' ? 'Copied!' : 'Copy as JSON'}
              </button>
              <ul className="text-xs mt-2 space-y-1">
                {diagnostics.emptyRoomRows.length === 0 && <li>None.</li>}
                {diagnostics.emptyRoomRows.map((s, i) => (
                  <li key={`${s.raw_location}|${s.raw_summary}|${s.calname}|${i}`}>
                    {s.raw_location || '(no location)'} | {s.raw_summary || '(no summary)'} | {s.calname || ''}
                  </li>
                ))}
              </ul>
            </details>
            <details className="mt-2">
              <summary className="text-sm cursor-pointer">
                is_online = 1 ({diagnostics.onlineTotal})
              </summary>
              <button
                type="button"
                onClick={() => copyJson('online', diagnostics.onlineRows.map((s) => ({
                  raw_summary: s.raw_summary,
                  calname: s.calname,
                  is_online: s.is_online,
                })))}
                className="mt-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold px-3 py-1"
              >
                {copiedKey === 'online' ? 'Copied!' : 'Copy as JSON'}
              </button>
              <ul className="text-xs mt-2 space-y-1">
                {diagnostics.onlineRows.length === 0 && <li>None.</li>}
                {diagnostics.onlineRows.map((s, i) => (
                  <li key={`${s.raw_summary}|${s.calname}|${i}`}>
                    {s.raw_summary || '(no summary)'} | {s.calname || ''} | {s.is_online}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <div className={`rounded-2xl p-4 border ${cardClass}`}>
          <p className="text-sm font-semibold mb-2">Query by teacher</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="e.g. AMROUCHE H"
              className={`flex-1 rounded-xl border px-3 py-2 text-sm ${inputClass}`}
            />
            <button
              type="button"
              onClick={handleTeacherQuery}
              className="rounded-xl bg-indigo-600 text-white text-sm font-semibold px-4"
            >
              Search
            </button>
          </div>
          {teacherResults && (
            <ul className="mt-3 space-y-2">
              {teacherResults.length === 0 && <li className="text-sm">No upcoming sessions.</li>}
              {teacherResults.map((s) => (
                <li key={`${s.uid}|${s.recurrence_id}`} className="text-sm">
                  <span>{formatStartsAt(s.starts_at)}</span>
                  {' — '}
                  <span>{s.subject || '(no subject)'}</span>
                  {' — '}
                  <span>{formatRooms(s.rooms)}</span>
                  {' — '}
                  <span>{s.calname || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
