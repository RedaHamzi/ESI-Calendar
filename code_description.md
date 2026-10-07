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
| CSS | `tailwindcss` | `^3.4.19` (v3 pinned — v4 breaks `postcss.config.js`; see §10) | `tailwind.config.js`, `postcss.config.js`, `src/index.css:1-3` |
| CSS | `daisyui` | `^3.9.4` (v3 line to match Tailwind v3) | Tailwind plugin, `themes: ["light"]` only |
| CSS | `autoprefixer` | `^10.4.14` | PostCSS |
| Font | Inter (self-hosted woff2, weights 400/500/600/700) | `public/fonts/` pending — see `public/fonts/README.md` | no CDN import; `font-display: swap` once files land |
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
  - `@capacitor/splash-screen` — config in `capacitor.config.json:10-20` (2 s, `#0f172a`, immersive, `androidScaleType CENTER_CROP`); logo assets pending in `resources/` (see `resources/README.md`).

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
│   ├── fonts/                   # self-hosted Inter woff2 slot (400/500/600/700); README only until files land
│   ├── robots.txt / favicon.ico / vite.svg / og.png
├── resources/                   # Capacitor asset sources: splash.png (2732x2732), icon.png (1024x1024); README until files land
├── src/
│   ├── main.jsx                 # React entry: viewport meta, contextmenu guard, initializeApp(), render <App/>
│   ├── App.jsx                  # Sole screen: theme/mobile state, SearchBar+MiniNavigator+iframes+footer
│   ├── index.css                # Tailwind directives + @font-face (once fonts land) + custom utilities (safe-area incl. .status-bar-padding, scrollbars, touch targets)
│   ├── data/data.js             # Static catalogs: `classes[61]` + `groups[42]` Google calendar IDs
│   ├── components/SearchBar.jsx # Filterable dropdown search for current type (+ "Recent" history section)
│   ├── components/MiniNavigator.jsx # Classes ↔ Groups segmented toggle, resets selection
│   ├── components/ThemeToggle.jsx   # Dark/light pill switch, mounted-guard placeholder
│   ├── utils/capacitor.js       # initializeApp() + isRunningInCapacitor() + applyStatusBarTheme()
│   └── utils/history.js         # recent-searches store (localStorage, max 5 per type)
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
  - Only persistence: `localStorage key "esi-calendar-theme"` → `"dark"|"light"` (`src/App.jsx:24,41`), plus search history keys `esi-calendar-recent-classes` / `esi-calendar-recent-groups` (see "Search history" below).
- **State management:**
  - `src/App.jsx:9-13`: `list` (selected classroom/group object), `type` (`"class"|"group"`), `isMobile` (window width `<768`, resize listener), `isDark` (default `true`, hydrated from localStorage), `isNativeApp` (set once from `isRunningInCapacitor()`, never read for branching — dead state). The `isDark` effect also calls `applyStatusBarTheme(isDark)` (`src/utils/capacitor.js`).
  - `SearchBar` local state: `inputValue`, `isOpen`, `dropdownRef` (declared but never used beyond ref attach).
  - Props drilling only: `App` passes `setList/setType/type/isDark` down; no Context/store.
- **Search history:**
  - `src/utils/history.js` (plain module, no dependency) owns it: `getRecent(type)`, `pushRecent(type, item)`, `clearRecent(type)`.
  - localStorage keys `esi-calendar-recent-classes` and `esi-calendar-recent-groups`, each a JSON array of `{ title, src }` (or `{ title, src: string[] }`) deep copies, max 5 each, dedupe-by-title, newest first; survives reload. All access wrapped in try/catch; parse errors read as empty history.
  - `SearchBar.handleSelect` pushes the pick; opening the dropdown with empty input renders the "Recent" section above the full list; the Clear button empties the current type's list.
- **"By group" vs "by classroom" end-to-end:**
  1. `MiniNavigator` sets `type` + resets `list` to first entry of the other catalog (`src/components/MiniNavigator.jsx:17,27`).
  2. `SearchBar` switches source array: `const selectedList = (type == "class") ? classes : groups` (`src/components/SearchBar.jsx:10`), filters by case-insensitive substring on `title` (`:17-19`), `handleSelect` calls `setList(item)` (`:21-25`), `handleClear` resets to `classes[0]`/`groups[0]` (`:27-36`).
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
  - `src/App.jsx` (`App`, no props) — owns all page state; composes header (title + `ThemeToggle`), `SearchBar` + `MiniNavigator`, selected-item card, two responsive iframes (desktop WEEK / mobile AGENDA), footer GitHub link (`https://github.com/RedaHamzi/ESI-Calendar`).
- **Reusable components (all in `src/components/`, all default-exported, all `isDark`-aware):**
  - `SearchBar.jsx` — `SearchBar({ setList, type, isDark })`. Filterable combobox over `classes|groups`; internal `inputValue/isOpen/recent`; clear (FiX) button resets to catalog default; dropdown chevron (FiChevronDown) rotates; search glyph is FiSearch; fixed overlay closes on outside click; empty state `No {type} found`. With empty input and non-empty history, a "Recent" header row (label + Clear button) renders above the filtered list, separated by a thin divider; the header is hidden when history is empty.
  - `MiniNavigator.jsx` — `MiniNavigator({ type, setType, setList, isDark })`. Segmented `Classes` (FiBookOpen) / `Groups` (FiUsers) control; active tab gets a solid accent (`bg-indigo-600` dark / `bg-indigo-500` light); switching resets `list`.
  - `ThemeToggle.jsx` — `ThemeToggle({ isDark, setIsDark })`. Pill toggle with outlined sun/moon icons (FiSun / FiMoon); `mounted` guard returns static placeholder pre-mount to avoid layout shift.
- **Schedule rendering logic lives in:** `src/App.jsx:139-169` (the two `<iframe>` elements + URL template). No date/slot computation in JS — Google Calendar embed does all rendering. `src/data/data.js` only supplies calendar IDs.
- **Utilities:**
  - `src/utils/capacitor.js` — `initializeApp()` (status bar themed from the persisted `esi-calendar-theme` value + App listeners), `isRunningInCapacitor()` (`window.Capacitor || window.androidBridge || /Capacitor/ UA`), `applyStatusBarTheme(isDark)` (native style + background sync, web no-op).

```jsx
// src/components/SearchBar.jsx:10-25 — filtering + selection (the "by group/classroom" query)
const selectedList = (type == "class") ? classes : groups;
const filteredItems = selectedList.filter(item =>
  item.title.toLowerCase().includes(inputValue.toLowerCase())
);
const handleSelect = (item) => { setInputValue(item.title); setIsOpen(false); setList(item); };
```

## 6. Data Models

- **No TypeScript interfaces / schemas / validation.** Plain JS objects in `src/data/data.js` (61 `classes` + 42 `groups` = 103 `title:` occurrences). Shapes:
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
- **Catalog quirks (in-file):** `1CP C G10` first `src` has a trailing `&` (`src/data/data.js:317`); `1CP C G12` lists the same calendar ID twice (`:330-332`); `2CP A G04` `src` array has a single `c_…%40group.calendar.google.com` entry while siblings have two.

## 7. Services / API Layer

- **No service files, no API functions.** There is no `src/services/`, `src/api/`, or HTTP helper; confirmed by `src/**/*` glob (only `components/`, `data/`, `utils/`, `App.jsx`, `index.css`, `main.jsx`).
- **Request/response shapes:** not applicable — the only "requests" are browser navigations of the Google embed iframes to `https://calendar.google.com/calendar/embed?...&src=<id>...`. No response parsing.
- **Error handling:** none. No `try/catch`, error boundaries, or fetch-error UI. If Google embed fails (offline, revoked calendar, bad ID), the iframe area is blank/broken with no message.
- **Loading states:** minimal. Iframes use `loading="lazy"` (`src/App.jsx:154,166`); no spinners/skeletons. `ThemeToggle` has a pre-mount placeholder div (`src/components/ThemeToggle.jsx:13-19`); dropdown empty state `No {type} found` (`src/components/SearchBar.jsx:88-91`).

## 8. Configuration & Environment

- **Environment variables / `.env`:** none. No `.env*` files found; no `import.meta.env` usage in `src/`.
- **Config files:**
  - `capacitor.config.json` — `appId com.esi.calendar`, `appName ESICalendar`, `webDir dist`; `server { androidScheme https, cleartext true }`; `plugins.SplashScreen` (2 s, `#0f172a`, immersive, `androidScaleType CENTER_CROP`) + `plugins.StatusBar` (themed at runtime via `applyStatusBarTheme`, non-overlay webview); `android { allowMixedContent true, webContentsDebuggingEnabled true }`.
  - `vite.config.js` — `plugins: [react()]`, `server.host: true`, `build.outDir: dist`.
  - `tailwind.config.js` — `content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"]`, `darkMode: "class"`, `daisyui.themes: ["light"]`.
  - `postcss.config.js` — `tailwindcss` + `autoprefixer`.
  - `.eslintrc.cjs` — browser/es2020, react 18.2, react-refresh.
  - `index.html` — SEO/OG/Twitter meta, canonical `https://esi-calendar.vercel.app`, `manifest.json` link, PWA `apple-mobile-web-app-*` tags.
  - `public/manifest.json` — PWA standalone manifest.
  - `android/app/src/main/AndroidManifest.xml` — `INTERNET` permission, `supportsRtl="true"`, `MainActivity singleTask` + FileProvider. Note: `android:roundIcon` was removed (2026-10-06 fix) — only `@mipmap/ic_launcher` is referenced.
- **Platform-specific configs:** `android/` (gradle shell) present; `ios/` absent. No `network_security_config.xml` found.
- **Build & run scripts (`package.json:6-20`):**
  - `dev`: `vite` · `build`: `vite build` · `preview`: `vite preview` · `lint`: `eslint src --ext js,jsx …`
  - `assets:generate`: `npx @capacitor/assets generate --android` (requires `resources/splash.png` + `icon.png`)
  - `cap:init`: `npx cap init ESICalendar com.esi.calendar --web-dir=dist`
  - `cap:add:android/ios`: `npm run build && npx cap add android|ios`
  - `cap:sync`: `npm run build && npx cap sync` · `cap:open/run/*`, `cap:build:android`.

## 9. Styling & Theming

- **Approach:** Tailwind CSS utility classes inline in JSX + DaisyUI plugin (installed but no `btn/card`-style component classes observed in `src/`) + hand-written CSS in `src/index.css` (215 lines).
- **Theme variables:** no CSS variables / no `tailwind.config.js:theme.extend` (empty `extend: {}`). Colors are hardcoded Tailwind classes switched in JS by `isDark`.
- **Dark mode:** manual `isDark` boolean (default `true`, persisted to localStorage), toggles `document.documentElement.classList "dark"` (`src/App.jsx:40-49`) and swaps solid background/text classes per component (`App.jsx`, `SearchBar.jsx`, `MiniNavigator.jsx`). The same effect also calls `applyStatusBarTheme(isDark)` so the native status bar follows. Note `tailwind.config.js:7` sets `darkMode: "class"` but almost no `dark:` variants are used — theming is done via conditional class strings instead. `daisyui.themes` is `["light"]` only.
- **Accent color:** single solid accent, no gradients anywhere in `src/` — active tabs, badges and avatars use `bg-indigo-600` (dark) / `bg-indigo-500` (light); page backgrounds are flat `bg-slate-900` (dark) / `bg-blue-50` (light); the light theme-toggle pill is flat `bg-orange-400`. Do not reintroduce gradients, glows, or heavy shadows.
- **Layout:** mobile-first single column `max-w-md mx-auto`; `md:` breakpoint swaps WEEK (desktop, `h-[60vh]`) vs AGENDA (mobile, `h-[65vh]`) iframe; `isMobile` (`<768px`) only shrinks header text.
- **Custom CSS (`src/index.css`):** fixed-px safe-area helpers (`.safe-area-top/bottom` now `max(24px+, env(safe-area-inset-top, 0px))`, plus `.status-bar-padding` applied to the app root container so the header clears the native status bar; 24 px web default keeps web builds slim), `.content-area/.header-spacing/.footer-spacing`, `.custom-scrollbar`, `.no-select` (applied to body), `.touch-target` (44 px min), `.scroll-smooth`, `.hide-scrollbar`, `.min-h-screen-mobile` (`100vh`, no `dvh` fallback), global `*` color/background transition.
- **Fonts:** family is Inter, self-hosted from `public/fonts/` — no CDN import is used anywhere (no `@import url(...googleapis...)`), and reintroducing one is a regression. The planned wiring (once files land): `inter-regular/medium/semibold/bold.woff2` (weights 400/500/600/700) under `public/fonts/`, `@font-face` declarations (`font-display: swap`) at the top of `src/index.css`, and `theme.fontFamily.sans = ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]` in `tailwind.config.js`. Font binaries are still pending (see `public/fonts/README.md`); until they land the app uses the system sans stack, and no `<link rel="preload">` may be added to `index.html`.
- **RTL:** `android:supportsRtl="true"` in manifest, but no RTL testing, no `dir` attributes, no Arabic strings in UI — English only. No i18n framework.

## 10. Known Constraints / Notes

- **Online-only:** schedules render exclusively from `https://calendar.google.com/calendar/embed…` iframes; offline → empty calendar. No service worker / cache / SQLite / fallback UI.
- **Permissions & network:** `INTERNET` (`android/app/src/main/AndroidManifest.xml:40`); `cleartext: true` + `allowMixedContent: true` (`capacitor.config.json:7,28`) allow HTTP/mixed content (the embed itself is HTTPS, but any HTTP subresource won't be blocked). `webContentsDebuggingEnabled: true` is on — should be disabled for release.
- **Data is hardcoded:** adding/renaming a room or group requires editing `src/data/data.js` and rebuilding; calendar IDs are opaque (some contain a stray trailing `&`, one group duplicates its ID — see §6). A bad ID fails silently in the iframe.
- **Group colors fixed:** `&color=%23E67C73&color=%23616161` appended for every group view regardless of 1- or 2-calendar overlay (`src/App.jsx:151,163`).
- **Mobile agenda date window frozen:** mobile iframe hardcodes `dates=20090401/20501231` (`src/App.jsx:164`) — effectively "show everything", relies on Google's agenda list, not the current week.
- **Dead/rough edges:** `isNativeApp` computed but never used for branching (`src/App.jsx:13,21`); `dropdownRef` never consumed (`SearchBar.jsx:8`); `main.jsx:8-11` appends a second `viewport` meta instead of editing `index.html`'s; `index.html` has two `<title>` tags (`:7` and `:58`); global `*` transition in `index.css:75-77` can cause jank.
- **Platform quirks:** `contextmenu` suppressed only when `window.Capacitor` exists (`src/main.jsx:14-18`); `backdrop-blur-lg` has a non-blur fallback (`index.css:94-98`); `100vh` (not `dvh`) may jump under mobile browser chrome; `supportsRtl` is true with an LTR-only layout.
- **Tooling debt:** `lint` script targets `--ext js,jsx` (no TS); `@types/*` installed but unused; `ios/` folder missing so `cap:open:ios`/`cap:run:ios` will fail until `cap:add:ios` is run on macOS.
- **Tailwind version pin (2026-10-06 fix):** `package.json` must stay on the Tailwind v3 + daisyUI v3 line (`tailwindcss@^3`, `daisyui@^3`). Upgrading to `tailwindcss@^4`/`daisyui@^5` breaks `npm run build` with `[vite:css] [postcss] It looks like you're trying to use 'tailwindcss' directly as a PostCSS plugin` because v4 moved the PostCSS plugin to `@tailwindcss/postcss` and no longer accepts the v3 `postcss.config.js` (`{ tailwindcss: {}, autoprefixer: {} }`), `@tailwind base/components/utilities` directives in `src/index.css:1-3`, or `require("daisyui")` in `tailwind.config.js:8`. Fixed by `npm install -D tailwindcss@^3.3.2 daisyui@^3.1.5` (resolved to `^3.4.19`/`^3.9.4`); verified with `npm run build` → `✓ built`, `dist/assets/*.css+js` emitted. Do not re-upgrade without a full v4 migration (`@tailwindcss/postcss`, `@import "tailwindcss"`, `@plugin "daisyui"`, `@custom-variant dark`).
- **Android launcher icon (2026-10-06 fix):** `npx cap run android` failed at `:app:processDebugResources` with `AAPT: error: resource mipmap/ic_launcher_round not found` because `android/app/src/main/AndroidManifest.xml` referenced `@mipmap/ic_launcher_round` but only `ic_launcher.png` exists in `android/app/src/main/res/mipmap-{hdpi,mdpi,xhdpi,xxhdpi,xxxhdpi}/` (no `ic_launcher_round.png`, no `mipmap-anydpi-v26/` adaptive-icon XML). Fixed by deleting the `android:roundIcon` attribute; launcher falls back to `@mipmap/ic_launcher` on all API levels. Verified with `:app:assembleDebug` → `BUILD SUCCESSFUL`. If round icons are wanted later, either re-add per-density `ic_launcher_round.png` assets or add adaptive-icon XML instead of re-adding the bare attribute.
- **TODOs:** none found via code search — Unclear / not found whether calendar-ID rotation or multi-select is planned; no `TODO/FIXME` markers observed in `src/`.
- **Status bar / theme coupling:** the native status bar style must be kept in sync with the `isDark` state — see `applyStatusBarTheme()` in `src/utils/capacitor.js`. Any new theme must add its status bar colors there, not hardcode them in `initializeApp()`.
- **Fonts stay self-hosted:** do not add `@import url(...googleapis...)` anywhere; fonts are self-hosted. Reintroducing a CDN import is a regression.
- **Search history cap:** history is capped at 5 per type; increasing the cap requires updating both `data.js`-adjacent logic and the copy in the 'Recent' header UI if any.
- **Last updated:** 2026-10-07. Refreshed after the theme / icon / font / search-history change.
