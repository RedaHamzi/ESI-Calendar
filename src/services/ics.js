import ICAL from 'ical.js';

export const MIN_STARTS_AT = Date.UTC(2025, 0, 1) / 1000;
export const RECURRENCE_CAP_DAYS = 365;
export const MAX_OCCURRENCES_PER_EVENT = 2000;

const ROOM_RE = /^[A-Za-z]+\d+[a-zA-Z]?$/;
// Building-coded room, e.g. "DE-0-A1" -> "A1".
const BUILDING_ROOM_RE = /^[A-Z]+-\d+-([A-Za-z]+\d+[a-zA-Z]?)$/;
// Room with capacity suffix, e.g. "A1(100)" -> "A1".
const ROOM_CAP_RE = /^([A-Za-z]+\d+[a-zA-Z]?)\s*\(\d+\)$/;
// Building-coded room with capacity suffix, e.g. "DE-0-S4(25)" -> "S4".
const BUILDING_ROOM_CAP_RE = /^[A-Z]+-\d+-([A-Za-z]+\d+[a-zA-Z]?)\s*\(\d+\)$/;
// Building-coded named room with capacity suffix, e.g. "BP-0-SCBP (100)" -> "SCBP".
// Room name has no digits here; middle numeric segment is optional ("BP-SCBP (100)" also matches).
const BUILDING_NAMED_ROOM_CAP_RE = /^[A-Z]{2}-(?:\d+-)?([A-Z]+)\s*\(\d+\)$/;
// Building-coded named room without capacity, e.g. "BP-0-SCBP" -> "SCBP".
const BUILDING_NAMED_ROOM_RE = /^[A-Z]{2}-(?:\d+-)?([A-Z]+)$/;
// Bare room name without digits, e.g. "CYB" (named rooms: CYB, Visio, RES, ...).
const BARE_NAME_RE = /^[A-Za-z]+$/;
const STRIP_CHARS_RE = new RegExp("[\\[\\]'\\\"]", "g");

function unaccent(word) {
  return word
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/ç/g, 'c');
}

export const STORED_SESSION_TYPES = ['Cours', 'TD', 'TP'];

function isStoredSessionType(sessionType) {
  return sessionType === 'Cours' || sessionType === 'TD' || sessionType === 'TP';
}

export function normalizeTypeWord(word) {
  const w = unaccent((word || '').toLowerCase());
  if (w === 'cours') return 'Cours';
  if (w === 'td') return 'TD';
  if (w === 'tp') return 'TP';
  if (w === 'presentation' || w === 'presentaion') return 'Présentation';
  if (w === 'controle') return 'Contrôle';
  if (w === 'remplacement') return 'Remplacement';
  return 'Autre';
}

function isOnlineTypePrefix(word) {
  return /^e[.\-\s]?(Cours|TD|TP)$/i.test(word || '');
}

const ONLINE_PREFIX_CAPTURE_RE = /^e[.\-\s]?(Cours|TD|TP)$/i;

export function parseSummary(rawSummary) {
  const original = String(rawSummary == null ? '' : rawSummary);
  const tokens = original.replace(/\s+/g, ' ').trim().split(' ').filter((t) => t.length > 0);
  let isOnline = 0;

  if (tokens.length > 0) {
    const onlineMatch = ONLINE_PREFIX_CAPTURE_RE.exec(tokens[0]);
    if (onlineMatch) {
      isOnline = 1;
      tokens[0] = onlineMatch[1];
    } else if (/^e$/i.test(tokens[0]) && tokens.length > 1 && /^(Cours|TD|TP)$/i.test(tokens[1])) {
      // Space-separated variant: "e Cours BAZ QUX" -> drop the lone "e".
      isOnline = 1;
      tokens.shift();
    }
  }

  if (tokens.length > 1 && tokens[1].startsWith('e-')) {
    isOnline = 1;
    tokens[1] = tokens[1].slice(2);
  }

  let sessionType = 'Autre';
  let subject = null;
  let teacher = null;
  if (tokens.length > 0) {
    sessionType = normalizeTypeWord(tokens[0]);
    let rest = tokens.slice(1);
    if (sessionType === 'Contrôle' && rest.length > 0 && rest[0].toLowerCase() === 'final') {
      rest = rest.slice(1);
    }
    subject = rest.length > 0 && rest[0].length > 0 ? rest[0] : null;
    const teacherText = rest.slice(1).join(' ');
    teacher = teacherText ? teacherText : null;
  }

  return {
    session_type: sessionType,
    subject,
    teacher,
    is_online: isOnline,
    raw_summary: original,
  };
}

function cleanRoomToken(token) {
  return String(token).replace(/\\/g, '').replace(STRIP_CHARS_RE, '').replace(/\s+/g, '');
}

export function parseRooms(locationValue) {
  const raw = String(locationValue == null ? '' : locationValue);
  if (!raw.trim()) return [];

  const unescaped = raw.replace(/\\,/g, ',');
  const seen = new Set();
  const rooms = [];
  for (const part of unescaped.split(/[+,]/)) {
    const token = cleanRoomToken(part);
    if (!token) continue;
    let room = null;
    let m = null;
    if (ROOM_RE.test(token)) {
      room = token;
    } else if ((m = BUILDING_ROOM_CAP_RE.exec(token))) {
      room = m[1];
    } else if ((m = BUILDING_NAMED_ROOM_CAP_RE.exec(token))) {
      room = m[1];
    } else if ((m = BUILDING_ROOM_RE.exec(token))) {
      room = m[1];
    } else if ((m = BUILDING_NAMED_ROOM_RE.exec(token))) {
      room = m[1];
    } else if ((m = ROOM_CAP_RE.exec(token))) {
      room = m[1];
    } else if (BARE_NAME_RE.test(token)) {
      room = token;
    }
    if (room && !seen.has(room)) {
      seen.add(room);
      rooms.push(room);
    }
  }

  if (rooms.length === 0) {
    console.warn(`parseRooms: unparseable LOCATION: ${raw}`);
  }
  return rooms;
}

function registerTimezones(vcalendar) {
  const zones = vcalendar.getAllSubcomponents('vtimezone');
  for (const zoneComp of zones) {
    try {
      const tzid = zoneComp.getFirstPropertyValue('tzid');
      if (tzid && !ICAL.TimezoneService.has(tzid)) {
        ICAL.TimezoneService.register(new ICAL.Timezone(zoneComp));
      }
    } catch (err) {
      // Ignore malformed VTIMEZONE blocks; affected times fall back to UTC.
    }
  }
}

function buildSession({ uid, recurrenceId, calUrl, calname, parsed, rooms, rawLocation, startsAt, endsAt }) {
  return {
    uid,
    recurrence_id: recurrenceId,
    cal_url: calUrl,
    calname,
    subject: parsed.subject,
    session_type: parsed.session_type,
    teacher: parsed.teacher,
    rooms: JSON.stringify(rooms),
    is_online: parsed.is_online,
    starts_at: startsAt,
    ends_at: endsAt,
    raw_summary: parsed.raw_summary,
    raw_location: rawLocation,
  };
}

function occurrenceRange(baseEvent, occurrenceStart) {
  let durationSec = 3600;
  try {
    const baseStart = baseEvent.startDate;
    const baseEnd = baseEvent.endDate;
    if (baseStart && baseEnd) {
      const computed = baseEnd.toUnixTime() - baseStart.toUnixTime();
      if (Number.isFinite(computed) && computed > 0) durationSec = computed;
    }
  } catch (err) {
    durationSec = 3600;
  }
  const startsAt = occurrenceStart.toUnixTime();
  return { startsAt, endsAt: startsAt + durationSec };
}

function sessionFromComponent({ vevent, calUrl, calname, recurrenceId, forceStart }) {
  let event;
  try {
    event = new ICAL.Event(vevent);
  } catch (err) {
    return null;
  }
  const uid = event.uid || '';
  if (!uid) return null;

  let startTime = null;
  let endTime = null;
  try {
    if (forceStart) {
      const range = occurrenceRange(event, forceStart);
      startTime = range.startsAt;
      endTime = range.endsAt;
    } else {
      const start = event.startDate;
      if (!start) return null;
      const end = event.endDate;
      startTime = start.toUnixTime();
      endTime = end ? end.toUnixTime() : startTime + 3600;
    }
  } catch (err) {
    return null;
  }

  if (startTime < MIN_STARTS_AT) return null;

  const summary = event.summary || '';
  const location = event.location || '';
  const parsed = parseSummary(summary);
  if (!isStoredSessionType(parsed.session_type)) return null;
  return buildSession({
    uid,
    recurrenceId,
    calUrl,
    calname,
    parsed,
    rooms: parseRooms(location),
    rawLocation: location || null,
    startsAt: startTime,
    endsAt: endTime,
  });
}

function recurrenceKeyOf(vevent) {
  try {
    const ev = new ICAL.Event(vevent);
    return ev.recurrenceId ? String(ev.recurrenceId.toUnixTime()) : '';
  } catch (err) {
    return '';
  }
}

function collectExdates(baseVevent) {
  const times = new Set();
  try {
    const props = baseVevent.getAllProperties('exdate');
    for (const prop of props) {
      const values = prop.getValues ? prop.getValues() : [prop.getFirstValue()];
      const list = Array.isArray(values) ? values : [values];
      for (const value of list) {
        const flat = Array.isArray(value) ? value : [value];
        for (const t of flat) {
          if (t && typeof t.toUnixTime === 'function') {
            try {
              times.add(String(t.toUnixTime()));
            } catch (err) {
              // ignore unconvertible EXDATE values
            }
          }
        }
      }
    }
  } catch (err) {
    // ignore EXDATE read failures; RecurExpansion still skips them
  }
  return times;
}

export function parseIcs(icsText, calUrl) {
  const text = String(icsText == null ? '' : icsText);
  let vcalendar;
  try {
    vcalendar = new ICAL.Component(ICAL.parse(text));
  } catch (err) {
    throw new Error(`parseIcs: invalid ICS for ${calUrl}: ${err.message}`);
  }

  registerTimezones(vcalendar);

  const calname = vcalendar.getFirstPropertyValue('x-wr-calname') || '';
  const sessions = [];

  const vevents = vcalendar.getAllSubcomponents('vevent');
  const byUid = new Map();
  for (const vevent of vevents) {
    let event;
    try {
      event = new ICAL.Event(vevent);
    } catch (err) {
      continue;
    }
    const uid = event.uid;
    if (!uid) continue;
    if (!byUid.has(uid)) byUid.set(uid, { base: null, overrides: [] });
    const group = byUid.get(uid);
    if (event.isRecurrenceException()) {
      group.overrides.push(vevent);
    } else if (!group.base) {
      group.base = vevent;
    } else {
      group.overrides.push(vevent);
    }
  }

  for (const { base, overrides } of byUid.values()) {
    const overrideByTime = new Map();
    for (const vevent of overrides) {
      const key = recurrenceKeyOf(vevent);
      if (key && !overrideByTime.has(key)) overrideByTime.set(key, vevent);
    }

    if (!base) {
      for (const vevent of overrideByTime.values()) {
        const session = sessionFromComponent({
          vevent,
          calUrl,
          calname,
          recurrenceId: recurrenceKeyOf(vevent),
          forceStart: null,
        });
        if (session) sessions.push(session);
      }
      continue;
    }

    let baseEvent;
    try {
      baseEvent = new ICAL.Event(base);
    } catch (err) {
      continue;
    }

    let recurring = false;
    try {
      recurring = baseEvent.isRecurring();
    } catch (err) {
      recurring = false;
    }

    if (!recurring) {
      const single = sessionFromComponent({
        vevent: base,
        calUrl,
        calname,
        recurrenceId: '',
        forceStart: null,
      });
      if (single) sessions.push(single);
      for (const vevent of overrideByTime.values()) {
        const extra = sessionFromComponent({
          vevent,
          calUrl,
          calname,
          recurrenceId: recurrenceKeyOf(vevent),
          forceStart: null,
        });
        if (extra) sessions.push(extra);
      }
      continue;
    }

    let dtstart = null;
    try {
      dtstart = baseEvent.startDate;
    } catch (err) {
      dtstart = null;
    }
    if (!dtstart) continue;

    const exdateTimes = collectExdates(base);

    const cap = dtstart.clone();
    cap.adjust(RECURRENCE_CAP_DAYS, 0, 0, 0);
    let capUnix = null;
    try {
      capUnix = cap.toUnixTime();
    } catch (err) {
      capUnix = null;
    }

    let expansion;
    try {
      expansion = new ICAL.RecurExpansion({ component: base, dtstart });
    } catch (err) {
      continue;
    }

    try {
      let count = 0;
      let next = null;
      while (count < MAX_OCCURRENCES_PER_EVENT && (next = expansion.next())) {
        count += 1;
        let occUnix = null;
        try {
          occUnix = next.toUnixTime();
        } catch (err) {
          continue;
        }
        if (capUnix !== null && occUnix > capUnix) break;
        const key = String(occUnix);
        if (exdateTimes.has(key)) continue;

        const override = overrideByTime.get(key);
        if (override) {
          overrideByTime.delete(key);
          const replaced = sessionFromComponent({
            vevent: override,
            calUrl,
            calname,
            recurrenceId: key,
            forceStart: null,
          });
          if (replaced) sessions.push(replaced);
          continue;
        }

        const session = sessionFromComponent({
          vevent: base,
          calUrl,
          calname,
          recurrenceId: key,
          forceStart: next,
        });
        if (session) sessions.push(session);
      }
    } catch (err) {
      // A broken RRULE must not kill the whole calendar parse.
    }

    for (const vevent of overrideByTime.values()) {
      const extra = sessionFromComponent({
        vevent,
        calUrl,
        calname,
        recurrenceId: recurrenceKeyOf(vevent),
        forceStart: null,
      });
      if (extra) sessions.push(extra);
    }
  }

  return { calname, sessions };
}
