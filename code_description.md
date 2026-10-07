# ESI_calendar — Code Description

> Self-contained reference for an AI with no repo access. All paths relative to repo root (`code/`). Verified against source files listed in §3.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture & Data Flow](#4-architecture--data-flow)
5. [Key Components & Screens](#5-key-components--screens)
6. [Data Models](#6-data-models)
7. [Services / API Layer](#7-services--api-layer)
8. [Configuration & Environment](#8-configuration--environment)
9. [Styling & Theming](#9-styling--theming)
10. [Known Constraints / Notes](#10-known-constraints--notes)

---

## 1. Project Overview

- **Name:** `esi-agenda` in `package.json:2`, branded `ESICalendar` / `ESI Calendar` in `capacitor.config.json:3`, `index.html:7`, `public/manifest.json:1-3`.
- **Purpose:** Single-page viewer for ESI school timetables. No custom calendar rendering — it embeds public Google Calendars in `<iframe>`s (`src/App.jsx:145-168`). Tagline in `index.html:10`: "one place calendar to check for a class' availability or a group's schedule!".
- **Main user flows (single screen, no routing):**
  - **By classroom ("Classes" tab):** default mode. User picks a room (e.g. `A1`, `CP1`, `S24`) via `SearchBar`, schedule for that one Google resource calendar is shown.
  - **By group ("Groups" tab):** user taps `Groups` (outlined users icon) in `MiniNavigator`, picks a student section (e.g. `1CP A G01`, `2CS SIL G01`, `Master`), schedule is an overlay of 1–2 Google group calendars.
- **Supported platforms via Capacitor:**
  - Web (Vite dev server / `dist/` static build, also deployed to `https://esi-calendar.vercel.app` per `index.html:12`).
  - Android (native project checked in at `android/`; appId `com.esi.calendar`).
  - iOS (dependency `@capacitor/ios` installed and npm scripts present, but **no `ios/` native folder checked in** — Unclear / not found whether iOS was ever generated).
- **Single-screen app:** `src/App.jsx` renders header + `SearchBar` + `MiniNavigator` + selected-item card + calendar `<iframe>`s + footer. There are no routes.

## 2. Tech Stack

Exact versions from `package.json:21-46` (all caret ranges):

| Category | Package | Version | Notes / file |
|---|---|---|---|
| UI | `react` | `^18.2.0` | JSX, no TypeScript |
| UI | `react-dom` | `^18.2.0` | `createRoot` in `src/main.jsx:23` |
| Icons | `react-icons` | `^4.9.0` | outlined only (`react-icons/fi`: `FiSearch`, `FiChevronDown`, `FiX`, `FiSun`, `FiMoon`, `FiBookOpen`, `FiUsers`) |
| Native runtime | `@capacitor/core` | `^7.4.4` | `window.Capacitor` detection |
| Native runtime | `@capacitor/cli` | `^7.4.4` | `cap:*` scripts |
| Native shell | `@capacitor/android` | `^7.4.4` | `android/` project present |
| Native shell | `@capacitor/ios` | `^7.4.4` | installed, no `ios/` dir |
| Plugin | `@capacitor/app` | `^7.1.0` | state-change + Android back-button handling in `src/utils/capacitor.js:11-25` |
| Plugin | `@capacitor/splash-screen` | `^7.0.3` | config only, see below |
| Plugin | `@capacitor/status-bar` | `^7.0.3` | `StatusBar.setStyle/setBackgroundColor` in `src/utils/capacitor.js:4-10` |
| Plugin (offline DB) | `@capacitor-community/sqlite` | `^7.0.3` (v7 line — latest v8 requires `@capacitor/core` >= 8, this project is on core 7) | native on-device SQLite store, Phase 1 sync pipeline only (`src/services/db.js`) |
| ICS parsing | `ical.js` | `^2.2.1` (pure-JS, ESM default import) | parses Google Calendar ICS feeds into session rows (`src/services/ics.js`) |
| CSS | `tailwindcss` | `^3.4.19` (v3 pinned — v4 breaks `postcss.config.js`; see §10) | `tailwind.config.js`, `postcss.config.js`, `src/index.css:1-3` |
| CSS | `daisyui` | `^3.9.4` (v3 line to match Tailwind v3) | Tailwind plugin, `themes: ["light"]` only |
| CSS | `autoprefixer` | `^10.4.14` | PostCSS |
| Font | `@fontsource/cairo` | `^5.3.0` (npm; weights 400/500/600/700) | bundled by Vite into `dist/assets/*.woff2`, no CDN import, no `public/fonts/` |
| Build | `vite` | `^7.1.12` | `vite.config.js`, outDir `dist` |
| Build | `@vitejs/plugin-react` | `^4.0.0` | |
| Assets | `@capacitor/assets` | `^3.0.5` | devDependency; `assets:generate` script (needs `resources/splash.png` + `icon.png`) |
| Lint | `eslint` + `eslint-plugin-react`, `react-hooks`, `react-refresh` | `^8.38.0` etc. | `.eslintrc.cjs` |
| Types | `@types/react`, `@types/react-dom` | `^18.0.x` | present but code is JS, no TS usage |

- **Language:** JavaScript (JSX), not TypeScript. No `tsconfig.json` found.
- **Router:** none (no `react-router`). Navigation = `useState("class"|"group")` in `src/App.jsx:10`.
- **State management:** none (no Redux/Zustand/Context). Local `useState` + `useEffect` only.
- **HTTP client:** none (no `fetch`/`axios` calls in `src/`; schedule data comes from Google embed iframes).
- **i18n:** none. All UI strings hardcoded English; icons are outlined `react-icons/fi` components, no emoji.
- **Native plugins used and why:**
  - `@capacitor/app` (`src/utils/capacitor.js:11-25`) — log `appStateChange`; exit app on Android hardware back button when no history.
  - `@capacitor/status-bar` (`src/utils/capacitor.js`, `capacitor.config.json:21-25`) — `applyStatusBarTheme(isDark)` keeps native style/background (`#0f172a` dark / `#ffffff` light) in sync with the theme; no-op on web.
  - `@capacitor/splash-screen` — config in `capacitor.config.json:10-20` (2 s, `#0f172a`, immersive, `androidScaleType CENTER_CROP`); Android 12+ uses `AppTheme.NoActionBarLaunch` (`windowSplashScreenBackground #0f172a` + `@drawable/splash_icon`, see §10).

## 3. Project Structure

Directory tree (2–3 levels, from `read` of repo root + `src/**/*` glob):

```text
code/                            # repo root (= npm project root)
├── index.html                   # HTML shell, mounts #root → /src/main.jsx, SEO/OG/PWA meta
├── package.json                 # scripts + exact dep versions (§2)
├── capacitor.config.json        # appId com.esi.calendar, webDir dist, Splash/StatusBar, android opts
├── vite.config.js               # react plugin, server.host=true, outDir dist
├── tailwind.config.js           # content globs, darkMode:"class", daisyui light theme
├── postcss.config.js            # tailwindcss + autoprefixer
├── .eslintrc.cjs                # eslint:recommended + react/hooks, react 18.2
├── .gitignore / README.md       # README: 8 lines, classroom-schedule blurb + disclaimer
├── public/                      # copied verbatim to dist/
│   ├── manifest.json            # PWA manifest (standalone, og.png icon)
│   ├── robots.txt / favicon.ico / vite.svg / og.png
├── resources/                   # Capacitor asset sources: real splash.png (941x1672) + icon.png (256x256); `assets:generate` run 2026-10-07 (87 android assets)
├── src/
│   ├── main.jsx                 # React entry: viewport meta, contextmenu guard, initializeApp(), render <App/>
│   ├── App.jsx                  # Sole screen: theme/mobile state, SearchBar+MiniNavigator+iframes+footer
│   ├── index.css                # Tailwind directives + custom utilities (safe-area incl. .status-bar-padding, scrollbars, touch targets)
│   ├── data/data.js             # Static catalogs: `classes[61]` + `groups[42]` Google calendar IDs
│   ├── services/ics.js          # Phase 1: pure ICS text → sessions[] parsing (ical.js, no I/O)
│   ├── services/sync.js         # Phase 1: serial ICS fetch + ETag cache + write-through to SQLite
│   ├── services/db.js           # Phase 1: `esi_calendar` SQLite open / migrate / query helpers
│   ├── pages/DebugSync.jsx      # Phase 1: hidden lazy-loaded sync debug screen (localStorage-gated)
│   ├── components/SearchBar.jsx # Filterable dropdown search for current type (+ separate history chip-strip below the bar)
│   ├── components/MiniNavigator.jsx # Classes ↔ Groups segmented toggle, resets selection
│   ├── components/ThemeToggle.jsx   # Dark/light pill switch, mounted-guard placeholder
│   ├── utils/capacitor.js       # initializeApp() + isRunningInCapacitor() + applyStatusBarTheme()
│   └── utils/history.js         # recent-searches store (localStorage, max 5 per type) + last-selection store
├── android/                     # Generated Capacitor Android shell (app/, gradle/, *.gradle, gradlew*)
│   └── app/src/main/AndroidManifest.xml  # INTERNET permission, MainActivity singleTask
└── dist/                        # build output (gitignored/empty in repo) → Capacitor webDir
```

- **Entry points:**
  - `index.html:60-62` → `<div id="root">` + `<script type="module" src="/src/main.jsx">`.
  - `src/main.jsx:1-27` → imports `App`, `index.css`, `initializeApp`; calls `ReactDOM.createRoot(...).render(<App/>)`.
  - `src/App.jsx:8-195` → root component, default export.
  - `capacitor.config.json:4` → `"webDir": "dist"` (what native shells load).
- **No `ios/` directory** in repo root despite `@capacitor/ios` + `cap:add:ios` script.

## 4. Architecture & Data Flow

- **Navigation (no router):**
  - One state variable owns the "route": `const [type, setType] = useState("class")` (`src/App.jsx:10`).
  - `MiniNavigator` (`src/components/MiniNavigator.jsx:11-30`) renders two buttons; clicking sets `type` and resets selection to `classes[0]` / `groups[0]`.
  - `SearchBar` resets its text input whenever `type` changes (`src/components/SearchBar.jsx:12-15`).
  - Android back button: `App.addListener('backButton', ...)` in `src/utils/capacitor.js:18-24` — `App.exitApp()` if `!canGoBack`, else `window.history.back()`. Since there is no history/routing, effectively always exits.
- **Data fetching: none in code. Schedule = Google Calendar embed URL in iframe:**
  - Base URL hardcoded in `src/App.jsx:146,158`: `https://calendar.google.com/calendar/embed?showTz=0…`.
  - Classroom mode appends one `&src=<calendarId>` (`list.src` is a string).
  - Group mode appends N `&src=<id>` params (`list.src` is an array) plus fixed `&color=%23E67C73&color=%23616161`.
  - Desktop (`hidden md:block`) iframe uses `mode=WEEK`; mobile (`block md:hidden`) iframe uses `mode=AGENDA&dates=20090401/20501231&showTitle=1&showDate=0&showTabs=1` (`src/App.jsx:145-168`).
  - No API keys, no `fetch`, no caching, no offline bundle — requires live internet + access to those public Google calendars.
  - Static catalogs only: `src/data/data.js` exports `classes` and `groups` (calendar IDs, see §6). No mock server, no SQLite, no local JSON fetch.
  - Only persistence: `localStorage key "esi-calendar-theme"` → `"dark"|"light"` (`src/App.jsx:24,41`), plus search history keys `esi-calendar-recent-classes` / `esi-calendar-recent-groups`, and last-selection key `esi-calendar-last-selection` (see "Search history" below). Phase 1 adds an on-device SQLite database (`esi_calendar`, see "Offline sync (Phase 1)" below), but no user-facing UI reads from it yet.
- **Offline sync (Phase 1 — data pipeline only, no UI changes):**
  - ICS feeds are the source; the URL list is derived at runtime from `data.js` (unique union of `classes[*].src` and every id inside `groups[*].src`, via `getCalendarUrls()` in `src/services/sync.js`, mapped to `https://calendar.google.com/calendar/ical/<id>/public/basic.ics`).
  - Fetch → parse (`src/services/ics.js`) → store (SQLite via `src/services/db.js`).
  - ETag caching: `If-None-Match` on subsequent syncs using the `calendars.etag` column; 304 = skip, keep existing rows.
  - Serial fetch with 300 ms delay between requests to avoid Google rate limiting.
  - Recurrence expansion via `ical.js` (`RecurExpansion`); occurrences before 2025-01-01 are skipped (filters VTIMEZONE-era noise and stale history).
  - Sessions are stored with `rooms` as a JSON array column (Option A: one row per occurrence), `is_online` boolean, and `raw_summary` for debugging.
  - No UI in Phase 1 beyond the hidden debug screen; existing embeds remain the user-facing source until Phase 2.
- **State management:**
  - `src/App.jsx:9-13`: `list` (selected classroom/group object), `type` (`"class"|"group"`), `isMobile` (window width `<768`, resize listener), `isDark` (default `true`, hydrated from localStorage), `isNativeApp` (set once from `isRunningInCapacitor()`, never read for branching — dead state). The `isDark` effect also calls `applyStatusBarTheme(isDark)` (`src/utils/capacitor.js`).
  - `SearchBar` local state: `inputValue`, `isOpen`, `dropdownRef` (declared but never used beyond ref attach).
  - Props drilling only: `App` passes `setList/setType/type/isDark` down; no Context/store.
- **Search history:**
  - `src/utils/history.js` (plain module, no dependency) owns it: `getRecent(type)`, `pushRecent(type, item)`, `clearRecent(type)`, plus `loadLastSelection()` / `saveLastSelection(type, title)`.
  - localStorage keys `esi-calendar-recent-classes` and `esi-calendar-recent-groups`, each a JSON array of `{ title, src }` (or `{ title, src: string[] }`) deep copies, max 5 each, dedupe-by-title, newest first; survives reload. All access wrapped in try/catch; parse errors read as empty history.
  - History renders as its own chip-strip BETWEEN the search bar and the results dropdown — it is not inside the dropdown. It shows the last 5 picks for the current type (newest first); each chip selects that item; a trailing Clear button empties the current type's list. Renders nothing when history is empty. The dropdown itself appears only while the search input is focused (opens on focus/type, closes on blur with a 120 ms delay so item clicks register, or on overlay click) and shows filtered results only.
  - Last selection: key `esi-calendar-last-selection`, shape `{ type: "class"|"group", title: string }`, written on every selection (dropdown pick, history-chip pick, `MiniNavigator` auto-select, search-clear reset). On app mount `App.jsx` reads it and restores `type` + `list` if the title still exists in `classes`/`groups`; otherwise it silently keeps the default (`"class"` + `classes[0]`).
- **"By group" vs "by classroom" end-to-end:**
  1. `MiniNavigator` sets `type` + resets `list` to first entry of the other catalog (`src/components/MiniNavigator.jsx:17,27`).
  2. `SearchBar` switches source array: `const selectedList = (type == "class") ? classes : groups` (`src/components/SearchBar.jsx:10`), filters by case-insensitive substring on `title` (`:17-19`), `handleSelect` calls `setList(item)` + `pushRecent(type, item)` + `saveLastSelection(type, item.title)` (`src/components/SearchBar.jsx:31-37`), `handleClear` resets to `classes[0]`/`groups[0]` and persists that (`:43-50`). The dropdown opens on focus/type and closes on blur with a 120 ms delay (`:52-62`); history chips call the same `handleSelect`.
  3. `App` displays `Selected {type}` + `list.title` card (`src/App.jsx:108-137`, badge `C`/`G` at `:132-134`).
  4. `App` builds the iframe `src` with the single-string vs array-of-strings branch described above, so the Google embed re-renders.

```jsx
// src/App.jsx:145-156 — schedule rendering = URL construction (desktop variant)
<iframe
  src={`https://calendar.google.com/calendar/embed?showTz=0${
    type == "class"
      ? `&src=${list.src}`
      : `${list?.src?.map((e) => `&src=${e}`).join("")}&color=%23E67C73&color=%23616161`
  }&showPrint=0&showCalendars=0&mode=WEEK`}
```

## 5. Key Components & Screens

- **Screens/routes:** exactly one screen, no router.
  - `src/App.jsx` (`App`, no props) — owns all page state; composes header (title + `ThemeToggle`), `SearchBar` + `MiniNavigator`, selected-item card, two responsive iframes (desktop WEEK / mobile AGENDA), footer GitHub link (`https://github.com/RedaHamzi/ESI-Calendar`). On mount it restores the last selection from `esi-calendar-last-selection` (`loadLastSelection()`) when the title still exists in `classes`/`groups`.
- **Reusable components (all in `src/components/`, all default-exported, all `isDark`-aware):**
  - `SearchBar.jsx` — `SearchBar({ setList, type, isDark })`. Layout is three stacked parts: search input (always visible), then a separate history chip-strip (last 5 picks for the current type + Clear button; renders nothing when empty), then the results dropdown, which appears only while the input is focused (opens on focus/type, closes on blur with a 120 ms delay or overlay click) and shows filtered results only — no history inside. Filterable combobox over `classes|groups`; clear (FiX) button resets to catalog default and persists it; dropdown chevron (FiChevronDown) rotates; search glyph is FiSearch; empty state `No {type} found`.
  - `MiniNavigator.jsx` — `MiniNavigator({ type, setType, setList, isDark })`. Segmented `Classes` (FiBookOpen) / `Groups` (FiUsers) control; active tab gets a solid accent (`bg-indigo-600` dark / `bg-indigo-500` light); switching resets `list` and persists the auto-selection via `saveLastSelection`.
  - `ThemeToggle.jsx` — `ThemeToggle({ isDark, setIsDark })`. Pill toggle with outlined sun/moon icons (FiSun / FiMoon); `mounted` guard returns static placeholder pre-mount to avoid layout shift.
- **Schedule rendering logic lives in:** `src/App.jsx:139-169` (the two `<iframe>` elements + URL template). No date/slot computation in JS — Google Calendar embed does all rendering. `src/data/data.js` only supplies calendar IDs.
- **Hidden debug screen (Phase 1 only, not user-facing):**
  - `src/pages/DebugSync.jsx` (`DebugSync`, no props) — "Sync all calendars" button with live `Syncing <done> / <total> — <title>` progress, post-sync stats (total sessions, calendars synced, last sync time, per-type counts, `rooms = '[]'` count, online count), and a "Query by teacher" box showing the next 5 upcoming sessions. Gated by `localStorage['esi-debug'] === '1'` and lazy-loaded (`React.lazy` + `Suspense`) so it is not in the main bundle.
  - The only change to the existing render path is the debug gate in `App` (`src/App.jsx`): after the hooks and before the normal return, when the flag is set `App` returns the lazy `DebugSync` instead of the normal screen. The gate sits below the hooks (not above them) so hook order stays unconditional and `react-hooks/rules-of-hooks` stays clean; `SearchBar` / `MiniNavigator` / `ThemeToggle` are untouched.
- **Utilities:**
  - `src/utils/capacitor.js` — `initializeApp()` (status bar themed from the persisted `esi-calendar-theme` value + App listeners), `isRunningInCapacitor()` (`window.Capacitor || window.androidBridge || /Capacitor/ UA`), `applyStatusBarTheme(isDark)` (native style + background sync, web no-op).

```jsx
// src/components/SearchBar.jsx:13-37 — filtering + selection (the "by group/classroom" query)
const selectedList = (type == "class") ? classes : groups;
const filteredItems = selectedList.filter(item =>
  item.title.toLowerCase().includes(inputValue.toLowerCase())
);
const handleSelect = (item) => { setInputValue(item.title); setIsOpen(false); setList(item); setRecent(pushRecent(type, item)); saveLastSelection(type, item.title); };
```

## 6. Data Models

- **No TypeScript interfaces / schemas / validation.** Plain JS objects in `src/data/data.js` (62 `classes` + 53 `groups` = 115 `title:` occurrences; the 53 `groups` are 43 group entries + 10 standalone section entries). Shapes:
  - Classroom: `{ title: string, src: string }` — `src` is a single Google resource-calendar ID, URL-encoded (`%40` = `@`), e.g. `esi.dz_…%40resource.calendar.google.com`; a few are bare base64-ish IDs (e.g. `MC2`, `DG0`, `DG1`, `S24`–`S33`).
  - Group: `{ title: string, src: string[] }` — 1–2 Google group-calendar IDs (base64-ish, some with `%40group.calendar.google.com` suffix); second entry is typically the shared/section calendar.

```js
// src/data/data.js:1-5 — classroom entry shape (representative; 61 total)
export const classes = [
  { title: "A1", src: "esi.dz_3638303436323538393937%40resource.calendar.google.com" },
  // ... A2-A4, AP1-AP2, CYB, SCBP, ME, M1-M5, MH, CP1-CP9,
  //     S4b, S4-S21, Visio, DPGR1-2, MC1-MC2, DG0-DG1, RES, S24-S33
```

```js
// src/data/data.js:250-257, 535-541 — group entry shape (representative; 42 total)
export const groups = [
  { title: "1CP A G01", src: [
      "ZXNpLmR6XzQwcWxzM3I0c3IxZWY3dWxzbjEycDAwZXNjQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20",
      "ZXNpLmR6XzViZ2xpZTRzOWM0MW41M2gyMWo2MWw0Y3ZjQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20" ] },
  // ... 1CP/2CP/1CS/2CS cohorts + ...
  { title: "Master", src: [
      "ZXNpLmR6X2xzMmJ1ZjFscjIyMDlqdjY2OXQ4aGY5cXZzQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20" ] },
];
```

- **No teacher / time-slot / day models.** Those concepts exist only inside the remote Google Calendars, invisible to this codebase.
- **Phase 1 SQLite tables (`esi_calendar` database, see `src/services/db.js`).** Shape differs from the static `data.js` catalog: `data.js` lists *calendars*, `sessions` lists *individual occurrences* parsed from them. Only sessions classified as Cours / TD / TP are stored; all other event types (exams, Interrogation/Contrôle/Projet/Rattrapage/Test/Soutenance/Présentation/Remplacement, non-class events, empty SUMMARY) are dropped at parse time in `sessionFromComponent` (`src/services/ics.js`) and never reach the DB. `ensureSchema()` also runs a one-time idempotent cleanup `DELETE FROM sessions WHERE session_type NOT IN ('Cours','TD','TP')` so pre-existing rows converge.

```sql
CREATE TABLE IF NOT EXISTS calendars (
  url           TEXT PRIMARY KEY,
  calname       TEXT,
  etag          TEXT,
  last_synced   INTEGER,
  event_count   INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  uid           TEXT NOT NULL,
  recurrence_id TEXT NOT NULL DEFAULT '',
  cal_url       TEXT NOT NULL,
  calname       TEXT,
  subject       TEXT,
  session_type  TEXT,
  teacher       TEXT,
  rooms         TEXT,                 -- JSON array of strings, e.g. '["S11","S12"]'
  is_online     INTEGER DEFAULT 0,
  starts_at     INTEGER NOT NULL,
  ends_at       INTEGER NOT NULL,
  raw_summary   TEXT,
  raw_location  TEXT,
  PRIMARY KEY (uid, recurrence_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions(teacher);
CREATE INDEX IF NOT EXISTS idx_sessions_type    ON sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_starts  ON sessions(starts_at);
CREATE INDEX IF NOT EXISTS idx_sessions_calname ON sessions(calname);
```
- **Catalog quirks (in-file):** `1CP C G10` first `src` has a trailing `&` (`src/data/data.js:317`); `1CP C G12` lists the same calendar ID twice (`:330-332`); `2CP A G04` `src` array has a single `c_…%40group.calendar.google.com` entry while siblings have two.

## 7. Services / API Layer

- **Service files (Phase 1 offline sync):** `src/services/` owns the ICS → SQLite pipeline; there is no other API layer.
  - `src/services/ics.js` — pure parsing, no I/O. `parseIcs(icsText, calUrl)` → `{ calname, sessions[] }` using `ical.js` (`RecurExpansion` for RRULE, EXDATE skip, RECURRENCE-ID override replacement, 365-day expansion cap, pre-2025-01-01 cutoff, SUMMARY/LOCATION rules). Also exports `parseSummary`, `parseRooms`, `normalizeTypeWord` helpers.
    - LOCATION parsing handles bare room names, bracketed single/multi-room arrays, comma- AND plus-separated multi-room values ("S18+S19" -> ["S18","S19"]), building-coded rooms with any two-letter prefix ("DE-0-S4 (25)" -> "S4", "BP-0-SCBP (100)" -> "SCBP"), and named rooms. Ambiguous values such as "DA-DG-A-DG-A (30)" are rejected. Unparseable locations yield rooms = '[]' rather than guessing and trigger a console.warn. Rooms are deduplicated (encounter order preserved). The raw LOCATION string is preserved in sessions.raw_location.
    - SUMMARY parsing supports the online prefix in two positions: glued to the type word with an optional dot/dash/space separator ("eCours", "e.TD", "e-TD", "e TD" — regex `/^e[.\-\s]?(Cours|TD|TP)$/i` on the first token plus a lone-"e" shift rule) and glued to the subject ("TD e-LOGM", "TD e-SINF"). Both set is_online = 1 and strip the prefix before classification.
  - `src/services/sync.js` — `syncAll(urls, onProgress)` (serial fetch, 300 ms between requests; `If-None-Match` from `calendars.etag`, 304 = skip; per-calendar DELETE + transactional batch INSERT + meta UPSERT; per-URL errors are logged and skipped without aborting) and `syncOne(url)` for future per-calendar refresh. `getCalendarUrls()` derives the unique ICS URL list from `classes`/`groups` in `src/data/data.js` — the list is never hardcoded.
    - The calendar ID is used verbatim in the URL. Data.js stores IDs in two forms: URL-encoded email style ("esi.dz_xxx%40group.calendar.google.com") and legacy base64 ("ZXNpLmR6Xz..."). BOTH must be passed unchanged to https://calendar.google.com/calendar/ical/<id>/public/basic.ics. Do NOT strip prefixes, do NOT split on underscores, do NOT base64-decode. Note: because data.js IDs are already URL-encoded (`%40`), do NOT wrap the interpolation in `encodeURIComponent` — that double-encodes `%40` to `%2540` and produces HTTP 404 (verified by curl).
    - Google Calendar ICS endpoint accepts only email-form calendar IDs ("xxx@group.calendar.google.com" or URL-encoded "xxx%40group.calendar.google.com"). It rejects the base64 form ("ZXNpLmR6Xz...") with HTTP 404, even though the same calendar renders fine in the embed iframe with that form. sync.js runs every id through normalizeCalendarId() before building the fetch URL: base64 ids are decoded to email form, email ids are passed through unchanged. Data.js is left alone — the iframe embed still uses the raw values. DB keys, the ETag cache, and the calendars table keep the raw (pre-normalization) URL so existing rows stay matched.
  - `src/services/db.js` — `openDb()` (singleton connection + `ensureSchema`), `ensureSchema(db)`, `getCalendarMeta` / `upsertCalendarMeta`, `replaceSessionsForCalendar` (transactional replace), `countSessions`, `countByType`, `queryUpcomingByTeacher`, `queryUpcomingByType`.
  - DebugSync exposes a "Stored session_type breakdown" table (`SELECT session_type, COUNT(*) FROM sessions GROUP BY 1` — expect exactly Cours/TD/TP rows, any other value is a bug) plus three diagnostic lists (Autre summaries, empty-rooms with raw_location, online sessions — first 20 rows each with full counts and a "Copy as JSON" button), used to surface unrecognized SUMMARY and LOCATION formats during dev.
  - DB writes: each calendar's delete+insert batch is issued via a single db.executeSet([...]) call. Do NOT wrap executeSet in a manual db.beginTransaction() — executeSet opens its own transaction and nesting causes SQLite "beginTransactionAlready in transaction".
- **Request/response shapes:** the only "requests" besides the sync pipeline are browser navigations of the Google embed iframes to `https://calendar.google.com/calendar/embed?...&src=<id>...`. Sync fetches `https://calendar.google.com/calendar/ical/<id>/public/basic.ics` and parses the ICS response body.
- **Error handling:** none in the embed path. No `try/catch`, error boundaries, or fetch-error UI. If Google embed fails (offline, revoked calendar, bad ID), the iframe area is blank/broken with no message. The sync pipeline itself is defensive: any per-calendar failure (network, HTTP 4xx/5xx, parse, DB) is logged, existing rows for that calendar are kept, and the loop continues; `DebugSync` surfaces the failure list.
- **Loading states:** minimal. Iframes use `loading="lazy"` (`src/App.jsx:154,166`); no spinners/skeletons. `ThemeToggle` has a pre-mount placeholder div (`src/components/ThemeToggle.jsx:13-19`); dropdown empty state `No {type} found` (`src/components/SearchBar.jsx:88-91`). `DebugSync` shows a `Syncing <done> / <total> — <title>` line while syncing.

## 8. Configuration & Environment

- **Environment variables / `.env`:** none. No `.env*` files found; no `import.meta.env` usage in `src/`.
- **Config files:**
  - `capacitor.config.json` — `appId com.esi.calendar`, `appName ESICalendar`, `webDir dist`, top-level + `android.backgroundColor "#0f172a"` (kills the white WebView flash); `server { androidScheme https, cleartext true }`; `plugins.SplashScreen` (2 s, `#0f172a`, immersive, `androidScaleType CENTER_CROP`) + `plugins.StatusBar` (themed at runtime via `applyStatusBarTheme`, non-overlay webview) + `plugins.CapacitorHttp` (`enabled: true`); `android { allowMixedContent true, webContentsDebuggingEnabled true }`.
  - `plugins.CapacitorHttp.enabled = true` — routes window.fetch through the native HTTP client so cross-origin ICS fetches to calendar.google.com are not blocked by CORS in the Android WebView. Required for the offline sync feature (`src/services/sync.js`). Web builds do not get this patch (CapacitorHttp is native-only), so sync is a no-op on web.
  - `vite.config.js` — `plugins: [react()]`, `server.host: true`, `build.outDir: dist`.
  - `tailwind.config.js` — `content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"]`, `darkMode: "class"`, `daisyui.themes: ["light"]`.
  - `postcss.config.js` — `tailwindcss` + `autoprefixer`.
  - `.eslintrc.cjs` — browser/es2020, react 18.2, react-refresh.
  - `index.html` — SEO/OG/Twitter meta, canonical `https://esi-calendar.vercel.app`, `manifest.json` link, PWA `apple-mobile-web-app-*` tags.
  - `public/manifest.json` — PWA standalone manifest.
  - `android/app/src/main/AndroidManifest.xml` — `INTERNET` permission, `supportsRtl="true"`, `MainActivity singleTask` + FileProvider. `MainActivity` uses `@style/AppTheme.NoActionBarLaunch`; `android:roundIcon="@mipmap/ic_launcher_round"` is present again (re-added automatically by `npx cap sync` once the generator produced per-density `ic_launcher_round.png` + `mipmap-anydpi-v26` adaptive-icon XML — do not remove it while those assets exist).
- **Platform-specific configs:** `android/` (gradle shell) present; `ios/` absent. No `network_security_config.xml` found.
- **Build & run scripts (`package.json:6-20`):**
  - `dev`: `vite` · `build`: `vite build` · `preview`: `vite preview` · `lint`: `eslint src --ext js,jsx …`
  - `assets:generate`: `npx @capacitor/assets generate --android` (run 2026-10-07 against real `resources/splash.png` + `icon.png`: 87 android assets generated, then `npx cap sync android`)
  - `cap:init`: `npx cap init ESICalendar com.esi.calendar --web-dir=dist`
  - `cap:add:android/ios`: `npm run build && npx cap add android|ios`
  - `cap:sync`: `npm run build && npx cap sync` · `cap:open/run/*`, `cap:build:android`.
- **Native SQLite plugin:** `@capacitor-community/sqlite` requires `npx cap sync android` after install so the plugin is wired into the Android shell (never hand-edit `android/`). On web the plugin needs a `jeep-sqlite` custom element which is NOT installed — the debug screen only works in a native shell; on desktop web it reports the DB error instead of syncing.

## 9. Styling & Theming

- **Approach:** Tailwind CSS utility classes inline in JSX + DaisyUI plugin (installed but no `btn/card`-style component classes observed in `src/`) + hand-written CSS in `src/index.css` (215 lines).
- **Theme variables:** no CSS variables / no `tailwind.config.js:theme.extend` (empty `extend: {}`). Colors are hardcoded Tailwind classes switched in JS by `isDark`.
- **Dark mode:** manual `isDark` boolean (default `true`, persisted to localStorage), toggles `document.documentElement.classList "dark"` (`src/App.jsx:40-49`) and swaps solid background/text classes per component (`App.jsx`, `SearchBar.jsx`, `MiniNavigator.jsx`). The same effect also calls `applyStatusBarTheme(isDark)` so the native status bar follows. Note `tailwind.config.js:7` sets `darkMode: "class"` but almost no `dark:` variants are used — theming is done via conditional class strings instead. `daisyui.themes` is `["light"]` only.
- **Accent color:** single solid accent, no gradients anywhere in `src/` — active tabs, badges and avatars use `bg-indigo-600` (dark) / `bg-indigo-500` (light); page backgrounds are flat `bg-slate-900` (dark) / `bg-blue-50` (light); the light theme-toggle pill is flat `bg-orange-400`. Do not reintroduce gradients, glows, or heavy shadows.
- **Layout:** mobile-first single column `max-w-md mx-auto`; `md:` breakpoint swaps WEEK (desktop, `h-[60vh]`) vs AGENDA (mobile, `h-[65vh]`) iframe; `isMobile` (`<768px`) only shrinks header text.
- **Custom CSS (`src/index.css`):** fixed-px safe-area helpers (`.safe-area-top/bottom` now `max(24px+, env(safe-area-inset-top, 0px))`, plus `.status-bar-padding` applied to the app root container so the header clears the native status bar; 24 px web default keeps web builds slim), `.content-area/.header-spacing/.footer-spacing`, `.custom-scrollbar`, `.no-select` (applied to body), `.touch-target` (44 px min), `.scroll-smooth`, `.hide-scrollbar`, `.min-h-screen-mobile` (`100vh`, no `dvh` fallback), global `*` color/background transition.
- **Fonts:** family is Cairo, provided by the `@fontsource/cairo` npm package (weights 400/500/600/700 imported in `src/main.jsx` before `./index.css`, bundled by Vite into `dist/assets/*.woff2`) — NOT self-hosted woff2 files and NOT a CDN import. No `@import url(...googleapis...)` is used anywhere, and reintroducing one is a regression. `theme.fontFamily.sans = ["Cairo", "ui-sans-serif", "system-ui", "sans-serif"]` in `tailwind.config.js`. No `<link rel="preload">` font tags in `index.html`.
- **Debug screen styling:** `src/pages/DebugSync.jsx` uses plain Tailwind utility classes following the existing theme pattern (isDark-based class strings, indigo accent, `max-w-md mx-auto` column). No new colors, gradients, or UI library.
- **RTL:** `android:supportsRtl="true"` in manifest, but no RTL testing, no `dir` attributes, no Arabic strings in UI — English only. No i18n framework.

## 10. Known Constraints / Notes

- **Online-only:** schedules render exclusively from `https://calendar.google.com/calendar/embed…` iframes; offline → empty calendar. No service worker / cache / fallback UI. (Phase 1 builds the SQLite store that will enable offline reads in Phase 2, but nothing reads it yet.)
- **Phase 1 only: no user-facing UI consumes the SQLite DB yet. SearchBar / MiniNavigator / iframes remain the UI until Phase 2.**
- **Sync is serial with a 300 ms delay between fetches; do not parallelise without re-testing Google's rate limits.**
- **Sessions with `rooms = '[]'` had unparseable LOCATION values — check this count after every sync; a spike means the ICS format changed.**
- **`ical.js` RRULE expansion is capped at 365 days past DTSTART (plus a 2000-occurrences-per-event safety bound).**
- **The debug screen is only reachable via `localStorage['esi-debug'] = '1'` and is lazy-loaded.**
- **CORS: Google Calendar's ICS endpoints do not send CORS headers. fetch() from the Android WebView will fail without CapacitorHttp enabled. Do not disable plugins.CapacitorHttp.enabled — the offline sync will silently fall back to "Failed to fetch" on every URL.**
- **Web builds cannot run the ICS sync: CapacitorHttp is a native-only patch, so fetch() from a browser tab is still blocked by CORS. Phase 1 targets Android only.**
- **SQLite transactions: use db.executeSet() for atomic multi-row writes. Manual beginTransaction()/commitTransaction() MUST NOT be combined with executeSet() — the plugin rejects nested transactions.**
- **Permissions & network:** `INTERNET` (`android/app/src/main/AndroidManifest.xml:40`); `cleartext: true` + `allowMixedContent: true` (`capacitor.config.json:7,28`) allow HTTP/mixed content (the embed itself is HTTPS, but any HTTP subresource won't be blocked). `webContentsDebuggingEnabled: true` is on — should be disabled for release.
- **Data is hardcoded:** adding/renaming a room or group requires editing `src/data/data.js` and rebuilding; calendar IDs are opaque (some contain a stray trailing `&`, one group duplicates its ID — see §6). A bad ID fails silently in the iframe.
- **Group colors fixed:** `&color=%23E67C73&color=%23616161` appended for every group view regardless of 1- or 2-calendar overlay (`src/App.jsx:151,163`).
- **Mobile agenda date window frozen:** mobile iframe hardcodes `dates=20090401/20501231` (`src/App.jsx:164`) — effectively "show everything", relies on Google's agenda list, not the current week.
- **Dead/rough edges:** `isNativeApp` computed but never used for branching (`src/App.jsx:13,21`); `dropdownRef` never consumed (`SearchBar.jsx:8`); `main.jsx:8-11` appends a second `viewport` meta instead of editing `index.html`'s; `index.html` has two `<title>` tags (`:7` and `:58`); global `*` transition in `index.css:75-77` can cause jank.
- **Platform quirks:** `contextmenu` suppressed only when `window.Capacitor` exists (`src/main.jsx:14-18`); `backdrop-blur-lg` has a non-blur fallback (`index.css:94-98`); `100vh` (not `dvh`) may jump under mobile browser chrome; `supportsRtl` is true with an LTR-only layout.
- **Tooling debt:** `lint` script targets `--ext js,jsx` (no TS); `@types/*` installed but unused; `ios/` folder missing so `cap:open:ios`/`cap:run:ios` will fail until `cap:add:ios` is run on macOS.
- **Tailwind version pin (2026-10-06 fix):** `package.json` must stay on the Tailwind v3 + daisyUI v3 line (`tailwindcss@^3`, `daisyui@^3`). Upgrading to `tailwindcss@^4`/`daisyui@^5` breaks `npm run build` with `[vite:css] [postcss] It looks like you're trying to use 'tailwindcss' directly as a PostCSS plugin` because v4 moved the PostCSS plugin to `@tailwindcss/postcss` and no longer accepts the v3 `postcss.config.js` (`{ tailwindcss: {}, autoprefixer: {} }`), `@tailwind base/components/utilities` directives in `src/index.css:1-3`, or `require("daisyui")` in `tailwind.config.js:8`. Fixed by `npm install -D tailwindcss@^3.3.2 daisyui@^3.1.5` (resolved to `^3.4.19`/`^3.9.4`); verified with `npm run build` → `✓ built`, `dist/assets/*.css+js` emitted. Do not re-upgrade without a full v4 migration (`@tailwindcss/postcss`, `@import "tailwindcss"`, `@plugin "daisyui"`, `@custom-variant dark`).
- **Android launcher icon (2026-10-06 fix, superseded 2026-10-07):** `npx cap run android` failed at `:app:processDebugResources` with `AAPT: error: resource mipmap/ic_launcher_round not found` because `android/app/src/main/AndroidManifest.xml` referenced `@mipmap/ic_launcher_round` but only `ic_launcher.png` existed. Fixed then by deleting the `android:roundIcon` attribute; after `assets:generate` produced per-density `ic_launcher_round.png` + `mipmap-anydpi-v26/` adaptive-icon XML, `npx cap sync android` re-added the attribute automatically and `:app:assembleDebug` → `BUILD SUCCESSFUL`. Leave it as generated; never hand-edit `android/`.
- **Android 12+ splash (2026-10-07 fix):** the white splash on Android 12+ came from `AppTheme.NoActionBarLaunch` having no `Theme.SplashScreen` attributes — the system ignored `android:background=@drawable/splash` and fell back to white + launcher icon. Fixed in `android/app/src/main/res/values/styles.xml`: `windowSplashScreenBackground #0f172a`, `windowSplashScreenAnimatedIcon @drawable/splash_icon`, `postSplashScreenTheme @style/AppTheme.NoActionBar` (legacy `android:background` kept for ≤11). `res/drawable-nodpi/splash_icon.png` (1152×1152, transparent) carries the white logo keyed out of `resources/splash.png` (~2× upscale, centered in the safe ~2/3 — `resources/icon.png` was unusable: black-on-transparent + only 256 px). White-flash kill chain: `windowSplashScreenBackground` → `capacitor.config.json backgroundColor` → inline `index.html` `html,body{background:#0f172a}`. Verified on a physical Android 16 device (cold-start screenshot: dark bg + centered logo, no white frame).
- **TODOs:** none found via code search — Unclear / not found whether calendar-ID rotation or multi-select is planned; no `TODO/FIXME` markers observed in `src/`.
- **Status bar / theme coupling:** the native status bar style must be kept in sync with the `isDark` state — see `applyStatusBarTheme()` in `src/utils/capacitor.js`. Any new theme must add its status bar colors there, not hardcode them in `initializeApp()`.
- **Fonts come from npm:** do not add `@import url(...googleapis...)` anywhere; fonts are provided by `@fontsource/cairo`, not self-hosted woff2, not a CDN import. Reintroducing a CDN import is a regression.
- **Search history cap:** history is capped at 5 per type; increasing the cap requires updating both `history.js` (`MAX_ITEMS`) and the history chip-strip UI.
- **Search history and last selection are persisted in localStorage (`esi-calendar-recent-classes`, `esi-calendar-recent-groups`, `esi-calendar-last-selection`). Clear them via the history strip's Clear button or by wiping localStorage.**
- **2CP C G09 and 2CP C G10 share the same underlying calendar ID — do not 'fix' this; it is intentional.**
- **DebugSync has two sync buttons: "Sync all calendars" (uses ETag, fast) and "Re-sync all calendars" (force, ignores ETag, full refresh). Use the force button after any parser change.**
- **Some calendar IDs in src/data/data.js may still return HTTP 404 if the school has rotated them. DebugSync lists all failed URLs with their HTTP status. Refresh data.js when this happens.**
- **Never transform calendar IDs before use. The "esi.dz_" prefix is part of the ID, not a namespace. Earlier versions stripped it and produced 404s on calendars that were actually published.**
- **Do not assume base64 and email-form calendar IDs are interchangeable. The embed endpoint accepts both; the ICS endpoint accepts only the email form. Any future code that constructs a Google Calendar URL must call normalizeCalendarId() first (see src/services/sync.js).**
- **Last updated:** 2026-10-07. Offline-sync fixes: store Cours/TD/TP only (parse-time drop + idempotent cleanup DELETE), online-detection regex broadened to e[.\- ]?(Cours|TD|TP) + lone-e shift, LOCATION "+" split + two-letter building-code named rooms with rooms=[] on ambiguous, DebugSync stored-type breakdown panel (Autre prefix panel removed). URL verbatim-ID audit (no mangling found in sync.js/ics.js; encodeURIComponent must NOT wrap pre-encoded IDs — curl-proven 404), raw_location migration rethrow guard, Round 4 curl verification (39/39 IDs 200, data.js unchanged). ICS base64 normalizer (normalizeCalendarId in sync.js, fetch-only; raw URL kept for DB/ETag keys).
