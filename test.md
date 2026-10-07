# Task

Apply a second round of UI/data changes to this React + Capacitor app
(ESI_calendar), then commit everything to `main` locally without pushing.

Read `code_description.md` first — it is the source of truth for the current
state (it was updated in the previous commit `6052487`). Then read the current
`src/data/data.js`, `src/utils/history.js`, `src/components/SearchBar.jsx`,
`src/App.jsx`, and `src/index.css` before editing anything.

Work step by step. After each task, verify it compiles (`npm run build`).
If a task fails, STOP and report — do not proceed to the next task.

------------------------------------------------------------
# 1. Switch font to Cairo via @fontsource/cairo
------------------------------------------------------------

This SUPERSEDES the previous "self-hosted Inter" task that was blocked on
missing .woff2 files. Remove any leftover Inter setup from the previous
commit and use the npm package instead.

- Install the dependency:
    `npm install @fontsource/cairo`
  (This brings the .woff2 files into `node_modules` and lets Vite bundle
  them — no `public/fonts/` folder is needed.)

- In `src/main.jsx`, import the weights you use. Import order matters —
  these must come BEFORE `./index.css` so the base font is ready when
  Tailwind styles apply:
    import "@fontsource/cairo/400.css";
    import "@fontsource/cairo/500.css";
    import "@fontsource/cairo/600.css";
    import "@fontsource/cairo/700.css";

- In `tailwind.config.js`, set:
    theme.fontFamily.sans = ["Cairo", "ui-sans-serif", "system-ui", "sans-serif"]

- In `src/index.css`:
    - REMOVE every `@font-face` block you added for Inter.
    - REMOVE the `<link rel="preload">` tags for Inter in `index.html`
      (if you added any).
    - Do NOT add `@import url(...googleapis...)` anywhere.

- Delete `public/fonts/` if it only contains the placeholder README and no
  real font binaries. If it contains real files, leave them — they are
  harmless — but do NOT reference them.

- Do NOT change any font sizes, weights, or line-heights elsewhere in the
  app. Only the family changes.

------------------------------------------------------------
# 2. Search history — new layout + restore last selection
------------------------------------------------------------

The previous change (commit `6052487`) added a "Recent" section inside the
search dropdown. Replace that with the layout the user wants:

    ┌───────────────────────────────┐
    │   [ Search Bar ]              │   ← always visible
    ├───────────────────────────────┤
    │   [ Recent History chips ]    │   ← independent, always visible
    │   (last 5 items, clickable)   │
    ├───────────────────────────────┤
    │   [ Dropdown list ]           │   ← ONLY when search bar is focused
    └───────────────────────────────┘

### 2a. History element — separate from the dropdown

- The history element sits BETWEEN the search bar and the results dropdown,
  but it is NOT inside the dropdown. It renders as its own row/chip-strip.
- It shows the last 5 items the user selected for the CURRENT `type`
  (`"class"` or `"group"`), newest first.
- Each history item is a clickable chip/row that, when clicked, selects that
  item (same effect as picking it from the dropdown) and updates the
  current selection.
- If there is no history for the current type, render nothing (no empty
  placeholder, no gap).
- Include a small "Clear" text button at the end of the strip that empties
  the history for the current type.

### 2b. Dropdown — only on focus

- The results dropdown appears ONLY when the search input is focused.
- Hide it on blur (with a short delay so clicks on dropdown items register —
  the existing implementation likely already does this).
- Inside the dropdown, show the filtered results as before. Do NOT show
  history inside the dropdown anymore — that was the previous design.

### 2c. Persist the LAST SELECTION across app restarts

Currently the app resets to `classes[0]` / `groups[0]` on every cold start.
Instead:

- Add a new localStorage key: `esi-calendar-last-selection`
- Value shape: `{ type: "class" | "group", title: string }`
- On any selection (from the dropdown OR from a history chip OR from the
  MiniNavigator's auto-select):
    - write `{ type, title }` to that key.
- On app mount (`useEffect` with `[]` deps in `App.jsx`):
    - read the key.
    - if it exists and the referenced `title` still exists in the current
      `classes` or `groups` array, restore `type` and `list` to it.
    - if the title no longer exists (data.js changed), silently fall back
      to the current default (`"class"` + `classes[0]`).

### 2d. Keep the existing history keys

- Keep `esi-calendar-recent-classes` and `esi-calendar-recent-groups`
  (from the previous commit). Their shape `{ title, src }[]` stays the same.
  Only the UI placement changes.

### 2e. Move logic to `src/utils/history.js`

- `src/utils/history.js` already exists from the previous commit. Extend it
  with two new helpers:
    `loadLastSelection()` / `saveLastSelection(type, title)`
  Keep all reads wrapped in try/catch, treat parse errors as "no history".

Do NOT change the shape of `data.js`. Do NOT add new dependencies beyond
`@fontsource/cairo`.

------------------------------------------------------------
# 3. Splash screen / launcher icon — actually make the logo appear
------------------------------------------------------------

The previous change (commit `6052487`) did not run the asset generator
because it thought the source files were missing. The user says they ARE
present — but in a folder named `ressources/` (note the extra "s" / French
spelling), not `resources/`.

- Search the repo for the actual files:
    find . -iname "splash*.png" -o -iname "icon*.png" -o -type d -iname "ressource*"
  Also check `assets/`, `src/assets/`, `public/`, and the repo root.

- Once you find them:
    - If they are under `ressources/`, rename that directory to `resources/`
      (or move the files into `resources/`). Prefer moving files over
      renaming the folder if the folder contains other things.
    - Standard filenames expected by `@capacitor/assets`:
        `resources/splash.png`  (at least 2732×2732)
        `resources/icon.png`    (at least 1024×1024)
      If the files have different names or dimensions, note that in the
      final report and DO NOT rename blindly — ask the user.
    - If the files are somewhere else, move them into `resources/` with
      those exact names.

- Then run:
    `npm run assets:generate`
  This runs `npx @capacitor/assets generate --android`.

- Then run:
    `npx cap sync android`
  to copy the generated assets into the Android project.

- Delete the placeholder `resources/README.md` if it exists — it's no
  longer needed.

- If you truly cannot find any image files, STOP after this step, keep the
  README, and report "splash: still blocked — files not found anywhere".

- Do NOT fabricate image binaries. Do NOT download anything.

------------------------------------------------------------
# 4. Update `src/data/data.js` with the new calendar IDs
------------------------------------------------------------

The user provided a fresh list of Google Calendar IDs in ICS-URL form. You
must convert each URL to a bare calendar ID (the substring between `/ical/`
and `/public/basic.ics`), URL-decoding where the source used `%40` (keep
`%40` — that's how the current file stores it) and then update `groups` in
`src/data/data.js`.

### 4a. Extraction rule

For a URL like:
    https://calendar.google.com/calendar/ical/esi.dz_XXXX%40group.calendar.google.com/public/basic.ics
the calendar ID is:
    esi.dz_XXXX%40group.calendar.google.com

Use the SAME URL-encoded form the source provides (`%40` stays `%40`,
literal `@` stays literal `@`).

### 4b. Title mapping (user's label → current title in data.js)

    "2CPA"      → "2CP A"           (section)
    "2CPAG1"    → "2CP A G01"
    "2CPAG2"    → "2CP A G02"
    "2CPAG3"    → "2CP A G03"
    "2CPAG4"    → "2CP A G04"
    "2CPB"      → "2CP B"           (section)
    "2CPBG5"    → "2CP B G05"
    "2CPBG6"    → "2CP B G06"
    "2CPBG7"    → "2CP B G07"
    "2CPBG8"    → "2CP B G08"
    "2CP.C"     → "2CP C"           (section)
    "2CP.CG9"   → "2CP C G09"       ← SKIP (see 4d)
    "2CP.CG10"  → "2CP C G10"       ← SKIP (see 4d)

    "1CSA"      → "1CS A"           (section)
    "1CSAG1"    → "1CS A G01"
    "1CSAG2"    → "1CS A G02"
    "1CSAG3"    → "1CS A G03"
    "1CSAG4"    → "1CS A G04"
    "1CSB"      → "1CS B"           (section)
    "1CSBG5"    → "1CS B G05"
    "1CSBG6"    → "1CS B G06"
    "1CSBG7"    → "1CS B G07"
    "1CSBG8"    → "1CS B G08"
    "1CSC"      → "1CS C"           (section)
    "1CSCG9"    → "1CS C G09"
    "1CSCG10"   → "1CS C G10"
    "1CSCG11"   → "1CS C G011"      (keep the HTML's 3-digit label)
    "1CSCG12"   → "1CS C G012"      (keep the HTML's 3-digit label)

    "2SL"       → "2SL A"           (section)
    "2SLG1"     → "2SL A G01"
    "2SLG2"     → "2SL A G02"
    "2SQ"       → "2SQ A"           (section)
    "2SQG1"     → "2SQ A G01"
    "2SQG2"     → "2SQ A G02"
    "2ST"       → "2ST A"           (section)
    "2STG1"     → "2ST A G01"
    "2STG02"    → "2ST A G02"
    "2STG03"    → "2ST A G03"       ← NEW entry (add it)
    "2SD"       → "2SD A"           (section)
    "2SDG01"    → "2SD A G01"
    "2SDG02"    → "2SD A G02"

### 4c. How to apply the update

For each mapping above:

  - If the title exists in `groups`, REPLACE the group-specific `src` with
    the new ID. Keep the section-overlay ID as the second element of the
    array if one was already there (matching the existing two-element
    pattern). If the current entry has only one `src`, keep it single.
  - If the title does NOT exist (e.g. `1CS C G011`, `1CS C G012`,
    `2ST A G03`), ADD a new entry with the same shape as its siblings
    (two-element `src` array: group ID first, section overlay ID second).
  - For SECTION entries (`2CP A`, `1CS C`, `2SL A`, …), replace their
    single `src` with the new ID.

### 4d. Explicit exceptions

- **DO NOT** touch `2CP C G09` and `2CP C G10` — keep them exactly as they
  are in the current file, regardless of what the new list says. The user
  asked to preserve them.

- **DO NOT** touch any `1CP *` entries. The user's list does not include 1CP.

- **DO NOT** touch `classes` (rooms). The user's list only covers groups.

### 4e. Record it

Append a new section to `data.changes.md`:

    ## Round 2: groups refreshed from user-provided ICS list

    - Updated N entries with new IDs
    - Added: 1CS C G011, 1CS C G012, 2ST A G03
    - Skipped per user: 2CP C G09, 2CP C G10
    - 1CP untouched (not in the new list)

### 4f. The raw list (for reference — extract IDs from here)

2CPA: https://calendar.google.com/calendar/ical/esi.dz_1ak7f1i5ck5stp9ffrqhacksi4%40group.calendar.google.com/public/basic.ics
2CPAG1: https://calendar.google.com/calendar/ical/esi.dz_vho314q04umhpgk0a1mlmd4lq8%40group.calendar.google.com/public/basic.ics
2CPAG2: https://calendar.google.com/calendar/ical/esi.dz_fmdkbrfi0k0ta8vvbv3m1ggd04%40group.calendar.google.com/public/basic.ics
2CPAG3: https://calendar.google.com/calendar/ical/esi.dz_7nkdki6hpqv1l7880cmpe3qj14%40group.calendar.google.com/public/basic.ics
2CPAG4: https://calendar.google.com/calendar/ical/esi.dz_ca9mpv1ke2295rlt7divndp7r0%40group.calendar.google.com/public/basic.ics

2CPB: https://calendar.google.com/calendar/ical/esi.dz_amhtsd61q76v05s98b61cooo4g%40group.calendar.google.com/public/basic.ics
2CPBG5: https://calendar.google.com/calendar/ical/esi.dz_43c7trbcvbjc0ln2m25qnmqr3g%40group.calendar.google.com/public/basic.ics
2CPBG6: https://calendar.google.com/calendar/ical/esi.dz_1ppnv00uamgbhr33f04q2a7tv0%40group.calendar.google.com/public/basic.ics
2CPBG7: https://calendar.google.com/calendar/ical/esi.dz_t8g69kjdvb7rpggk1oaf8a2vd8%40group.calendar.google.com/public/basic.ics
2CPBG8: https://calendar.google.com/calendar/ical/esi.dz_54pthp799kpqnqgqmu09dfoqds%40group.calendar.google.com/public/basic.ics

2CP.C: https://calendar.google.com/calendar/ical/esi.dz_hi4t933dog03gf8ggk0tc29u5c%40group.calendar.google.com/public/basic.ics
2CP.CG9: https://calendar.google.com/calendar/ical/esi.dz_ui7ljt51epqfe0u4k46s8b2q8o%40group.calendar.google.com/public/basic.ics
2CP.CG10:https://calendar.google.com/calendar/ical/esi.dz_ui7ljt51epqfe0u4k46s8b2q8o%40group.calendar.google.com/public/basic.ics



1CS

1CSA: https://calendar.google.com/calendar/ical/esi.dz_7f4tbmk94rfv5lbhbdg1jrpog0%40group.calendar.google.com/public/basic.ics
1CSAG1: https://calendar.google.com/calendar/ical/esi.dz_m1oq7tuio8u9419e6u4jepvmh8%40group.calendar.google.com/public/basic.ics
1CSAG2: https://calendar.google.com/calendar/ical/esi.dz_r3gts6445o7f1ao792sf67gels%40group.calendar.google.com/public/basic.ics
1CSAG3: https://calendar.google.com/calendar/ical/esi.dz_93ra1snc9bdhbnm28jdsrpo4bg%40group.calendar.google.com/public/basic.ics
1CSAG4: https://calendar.google.com/calendar/ical/esi.dz_nt6post2lh46egiburd29dtr9c%40group.calendar.google.com/public/basic.ics

1CSB: https://calendar.google.com/calendar/ical/esi.dz_e8s4vrirj0k79ke1n48kgp2c0c%40group.calendar.google.com/public/basic.ics
1CSBG5: https://calendar.google.com/calendar/ical/esi.dz_q5sqbu4d17l5pfqbngnm4n2m7o%40group.calendar.google.com/public/basic.ics
1CSBG6: https://calendar.google.com/calendar/ical/esi.dz_vvob038dmn23o0h88adfbivo8c%40group.calendar.google.com/public/basic.ics
1CSBG7: https://calendar.google.com/calendar/ical/esi.dz_9hkmnq1db224vn0jduqkv081gg%40group.calendar.google.com/public/basic.ics
1CSBG8: https://calendar.google.com/calendar/ical/esi.dz_515a77j43mkpceiehajdf5batc%40group.calendar.google.com/public/basic.ics

1CSC: https://calendar.google.com/calendar/ical/c_an6koooba448ohjpufip5g10sk%40group.calendar.google.com/public/basic.ics
1CSCG9: https://calendar.google.com/calendar/ical/esi.dz_teslnmokh1tcv0fadcs57mul20%40group.calendar.google.com/public/basic.ics
1CSCG10:https://calendar.google.com/calendar/ical/c_02d5de6aca127f8f3785ea2d801699a879d18af4176fb0ed8704ce1f030ad8b7%40group.calendar.google.com/public/basic.ics
1CSCG11:https://calendar.google.com/calendar/ical/c_4e991992cf97f5290a76cdcaee51d5cf93d82ad0b7883f9d60dab1c645f75128%40group.calendar.google.com/public/basic.ics
1CSCG12:https://calendar.google.com/calendar/ical/c_500c9889639cddd70846891c8e31ef15c01d91eadf6ac6dfe7ca9cab1c15a3b4%40group.calendar.google.com/public/basic.ics


2CS

2SL: https://calendar.google.com/calendar/ical/esi.dz_e5qmupbrpn3f83nh0be0nth0s4%40group.calendar.google.com/public/basic.ics
2SLG1: https://calendar.google.com/calendar/ical/esi.dz_51jmqgmnc7f2nuobt3n2jna5hc%40group.calendar.google.com/public/basic.ics
2SLG2: https://calendar.google.com/calendar/ical/esi.dz_gki4pr57dhg5ulnnmtkr37432o%40group.calendar.google.com/public/basic.ics
2SQ: https://calendar.google.com/calendar/ical/esi.dz_sp8n1re3q19nfl6m8h6fldbamk%40group.calendar.google.com/public/basic.ics
2SQG1: https://calendar.google.com/calendar/ical/esi.dz_6in0jifhqh1n9l1vjp121lms48%40group.calendar.google.com/public/basic.ics
2SQG2: https://calendar.google.com/calendar/ical/esi.dz_tuh8hq7vmo56j98en5bq5d13g8%40group.calendar.google.com/public/basic.ics
2ST: https://calendar.google.com/calendar/ical/esi.dz_ih3qnsqa7j2qb81ndj5ltk2j0g%40group.calendar.google.com/public/basic.ics
2STG1: https://calendar.google.com/calendar/ical/esi.dz_o8he3vb8v11vtqmd88oa6k9k8k%40group.calendar.google.com/public/basic.ics
2STG02: https://calendar.google.com/calendar/ical/esi.dz_840jkkmeriquj61t54gdqugeo4%40group.calendar.google.com/public/basic.ics
2STG03:https://calendar.google.com/calendar/ical/esi.dz_0suv62qkqlh3sk5ds89s2jrjtg%40group.calendar.google.com/public/basic.ics
2SD: https://calendar.google.com/calendar/ical/c_h9ouva3he1rn28a7a98q58oa8s%40group.calendar.google.com/public/basic.ics
2SDG01: https://calendar.google.com/calendar/ical/c_fol163uvpkrpi3l5etjkpnpfhg%40group.calendar.google.com/public/basic.ics
2SDG02:https://calendar.google.com/calendar/ical/c_da0e286ca68c1aca45562c4cfcd135a9893e355f48f7d5872276291c9cfb7a23%40group.calendar.google.com/public/basic.ics

------------------------------------------------------------
# 5. Update code_description.md
------------------------------------------------------------

Reflect the new state in `code_description.md`. Same rules as last time:
keep the structure, don't rewrite, don't turn it into a changelog. Update:

- §2 Tech Stack: replace the "Inter self-hosted" row (if it exists) with
  `@fontsource/cairo`. Note the installed version.
- §3 Project Structure: remove any reference to `public/fonts/`; add
  `resources/` with real splash/icon if the generator ran.
- §4 Architecture & Data Flow:
    - Update the "Search history" subsection: history is now a separate
      UI element above the dropdown, not inside it.
    - Add the new `esi-calendar-last-selection` key and describe the
      restore-on-mount behavior.
- §5 Key Components & Screens:
    - `SearchBar.jsx`: describe the new layout — search bar, then a
      separate history strip, then a focus-only dropdown.
    - `App.jsx`: document the restore-on-mount effect.
- §8 Configuration & Environment: confirm `assets:generate` and any new
  script; note whether `resources/` contains real files.
- §9 Styling & Theming: replace "Inter" references with "Cairo"; note that
  fonts are provided by `@fontsource/cairo` (npm), NOT self-hosted woff2,
  and NOT a CDN import.
- §10 Known Constraints / Notes:
    - Remove the "font files missing" warning if it was there.
    - Add: "Search history and last selection are persisted in localStorage
      (`esi-calendar-recent-classes`, `esi-calendar-recent-groups`,
      `esi-calendar-last-selection`). Clear them via the history strip's
      Clear button or by wiping localStorage."
    - Add: "2CP C G09 and 2CP C G10 share the same underlying calendar ID
      — do not 'fix' this; it is intentional."
    - Update "Last updated:" to today.

Do NOT touch §6 (Data Models) or §7 (Services / API Layer) — data.js's
shape is unchanged.

------------------------------------------------------------
# Constraints
------------------------------------------------------------

- Do NOT modify `src/data/data.js` outside of task 4's mapping.
- Do NOT add dependencies other than `@fontsource/cairo`.
- Do NOT reintroduce `@import url(...googleapis...)` — Cairo comes from
  npm now.
- Do NOT add a router, state manager, or TypeScript.
- Do NOT touch `android/` by hand — only `npx cap sync` /
  `npm run assets:generate` may write there.
- Do NOT reformat files you only touch for one line.
- If any step fails (build error, missing asset), STOP and report — do
  not guess.

------------------------------------------------------------
# Verification (before committing)
------------------------------------------------------------

1. `node --check src/data/data.js` — must pass.
2. `npm run build` — must succeed.
3. `npm run lint` — no NEW warnings/errors (the previous run had 11
   pre-existing; do not increase that number).
4. `git diff --stat` — sanity check that only the expected files changed.
5. Manual sanity:
   - Cold-start the app in a browser: the last selected group/class should
     be preselected after reload.
   - Search bar: history strip shows below the bar; dropdown only on focus.
   - Font renders as Cairo (inspect computed style, should not be Inter).
   - Android build: splash screen shows the logo (if generator ran).

------------------------------------------------------------
# Commit (local only)
------------------------------------------------------------

Do NOT push. Do NOT amend. Do NOT create a branch.

1. Confirm current branch with `git branch --show-current`. Must be `main`.
2. Stage:
   `git add src/ public/ index.html capacitor.config.json package.json package-lock.json code_description.md data.changes.md resources/`
   Never stage `android/` manually.
3. Commit message:

     ui: Cairo font, persistent selection, refined search history

     - font: switch from Inter (blocked) to @fontsource/cairo via npm
     - search: move history out of the dropdown into its own strip
     - search: restore the last selected group/class on app mount
     - splash: wire up @capacitor/assets using the files the user
       provided (rename ressources/ -> resources/ if needed)
     - data: refresh group calendar IDs from the user's ICS list;
       add 1CS C G011, 1CS C G012, 2ST A G03; keep 2CP C G09/G10
     - docs: refresh code_description.md

4. Print `git log -1 --stat`.

------------------------------------------------------------
# Final report
------------------------------------------------------------

  Task 1 (Cairo font):             done | blocked (reason)
  Task 2 (search history + restore): done | partial (reason)
  Task 3 (splash/logo):            done | still blocked (files not found)
  Task 4 (data.js update):         done — N updated, 3 added, 2 skipped
  Task 5 (code_description.md):    updated | not updated (reason)
  Build:                           pass | fail
  Lint:                            pass | fail (delta vs previous)
  Commit:                          <short sha> on main (not pushed)
  Open items:                      <anything the user must provide>