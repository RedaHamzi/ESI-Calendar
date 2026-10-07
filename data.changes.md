# data.changes.md — `src/data/data.js` merge report

## Follow-up: restored rooms

Restored 10 rooms that were dropped in the previous change:
- A4
- AP2
- CP9
- S8
- M5
- MH
- DPGR1
- DPGR2
- SCBP
- Visio

Reason: they are real, current rooms even though they don't appear in the
S1 2026/27 FET export. Their `src` values come from git history (HEAD),
not from a fresh scrape.

Ground truth: `Ecole nationale Supérieure d'Informatique_EDT_S1.html`
(TOC = 43 groups; `<div class="room line3">` split on `+` = 52 rooms).
ID sources: Scraper 1 (primary, byte-for-byte), Scraper 2 (cross-check only).
Rule applied: only entities present in the HTML are kept. All IDs are
copied byte-for-byte — nothing was invented, re-encoded, or hand-built.

## Added

+ class A5 (from Scraper 1)
+ class A6 (from Scraper 1)
+ class A7 (from Scraper 1)
+ group 1CS C G10 (from Scraper 1, single-src form as published)
+ group 2SD A G02 (from Scraper 1, single-src form as published)

## Removed

- group 1CP D G13 (not in HTML; 1CP is A–C only in 2026/27. Scraper 1 ID retained here for restore: `ZXNpLmR6XzU1dDlzOHRidmFjY2NyOXZqaTM2ZHMwMmI0QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20` + D-section overlay)
- group 1CP D G14 (not in HTML; same reason)
- group 1CP D G15 (not in HTML; same reason)
- group Master (not in HTML; old `src` was the shared `ls2b…` calendar, not a real Master calendar; Scraper 1 reports no Master calendar exists)
- class A4 (not in HTML S1 schedule; valid titled ID exists in Scraper 1 — restore if needed)
- class AP2 (not in HTML S1 schedule; valid titled ID exists in Scraper 1 — restore if needed)
- class CP9 (not in HTML S1 schedule; valid titled ID exists in Scraper 1 — restore if needed)
- class S8 (not in HTML S1 schedule; valid titled ID exists in Scraper 1 — restore if needed)
- class M5 (not in HTML S1 schedule; valid titled ID exists in Scraper 1 — restore if needed)
- class MH (not in HTML S1 schedule; valid titled ID exists in Scraper 1 — restore if needed)
- class DG0 (not in HTML)
- class DG1 (not in HTML)
- class DPGR1 (not in HTML)
- class DPGR2 (not in HTML)
- class SCBP (not in HTML)
- class Visio (not in HTML)

## Renamed / Retitled (same `src`)

- `S4b` → `S4B` (HTML uses uppercase `S4B`)
- `2CP C G08` → `2CP B G08` (same `src`; HTML assigns G08 to section B)
- `1CS B G04` → `1CS A G04` (same `src`; HTML assigns G04 to section A)
- `1CS C G07` → `1CS B G07` (same `src`; HTML assigns G07 to section B)
- `1CS C G08` → `1CS B G08` (same `src`; HTML assigns G08 to section B)
- `2CS SID` → `2SD A G01` (same `src`)
- `2CS SIL G01` → `2SL A G01` (same `src`)
- `2CS SIL G02` → `2SL A G02` (same `src`)
- `2CS SIQ G01` → `2SQ A G01` (same `src`)
- `2CS SIQ G02` → `2SQ A G02` (same `src`)
- `2CS SIT G01` → `2ST A G01` (same `src`)
- `2CS SIT G02` → `2ST A G02` (same `src`)

Also fixed two corrupted IDs from the old file using Scraper 1 values:
- `1CP C G10` first `src` had a trailing `&` appended — replaced with Scraper 1 value.
- `1CP C G12` had the section ID duplicated in both slots (group ID lost) — replaced with Scraper 1 group+section pair.

Section-only entries from Scraper 1 (`1CP A`, `2CP B`, `1CS C`, `2SL A`, …)
were NOT added: they are not in the HTML table of contents and were not in
the old file (the app lists groups, not sections). Section calendars are
still included as the second `src` of each group entry.

## Conflicts between Scraper 1 and Scraper 2 (used = Scraper 1)

- `1CP A`: Scraper 1 = `esi.dz_5bglie4s9c41n53h21j61l4cvc%40group.calendar.google.com`, Scraper 2 = `esi.dz_5bglie4s9c41n53h21j1l4cvc%40group.calendar.google.com`, used = Scraper 1.
- `1CP C`: Scraper 1 = `esi.dz_bmh4cn0eipj4re94pblk3muqmo%40group.calendar.google.com`, Scraper 2 = `esi.dz_bmh4cn0eipj4re94bplk3muqmo%40group.calendar.google.com`, used = Scraper 1.
- `1CP D`: Scraper 1 = `c_n6q5u4uqjv2rulguqrvvr9s0go%40group.calendar.google.com`, Scraper 2 = `c_n6q5u4uqjy2rulguqrvgr9s0go%40group.calendar.google.com`, used = Scraper 1 (entry itself dropped — not in HTML).
- `2CP C`: Scraper 1 = `esi.dz_hi4t933dog03gf8ggk0tc29u5c%40group.calendar.google.com`, Scraper 2 = `c_hi4t933dog03gf8ggk0tc29u5c%40group.calendar.google.com`, used = Scraper 1.
- `1CS A`: Scraper 1 = `esi.dz_7f4tbmk94rfv5lbhbdg1jrpog0%40group.calendar.google.com`, Scraper 2 = `esi.dz_7f4tbmk94rfv5lxbhdgjrpog0%40group.calendar.google.com`, used = Scraper 1.
- `1CS C`: Scraper 1 = `c_an6koooba448ohjpufip5g10sk%40group.calendar.google.com`, Scraper 2 = `c_an6kooba448ojhpufip5g10sk%40group.calendar.google.com`, used = Scraper 1.

All other section IDs agree between the two scrapers. Scraper 2 found no
room calendars and no 2SL/2SQ/2ST/2SD calendars (static pages only), so
nothing was back-filled from it.

## MISSING_IDS (must be filled by the school's calendar admin)

- group 1CS C G011 (exists in HTML, no calendar ID found in any source)
- group 1CS C G012 (exists in HTML, no calendar ID found in any source)
- group 2ST A G03 (exists in HTML; official site only publishes G01 and G02)

Every room in the HTML has a calendar ID. These three groups were omitted
from `data.js` (no placeholder invented).

## Warnings

- Scraper 1's pages are labeled "Emploi du temps 2024/2025" (per-year pages
  last modified 2024-10-03 for 1CP and 2025-10-02 for 2CP/1CS/2CS), while
  classes for 2026/27 started 22 September 2026. These calendars may be last
  year's — verify 2–3 IDs in Google Calendar before shipping.
- A5, A6, A7 room IDs carry no title on PlanningSalles.html; names were
  inferred from position after A4 (~80–85% confident). A7's ID uses a literal
  `@` instead of `%40`, kept byte-for-byte as found.
- S24–S33 reuse the previous file's mapping to ten untitled `c_188…` room
  IDs. Scraper 1 lists these IDs without titles and explicitly declined to
  label them S22–S33 (11 untitled IDs found, only 10 slots S24–S33). Mapping
  is inherited, not verified — spot-check one room calendar.
- The eleventh untitled room ID (`esi.dz_3331363732393232`) was left out
  (no title to attach it to).
- Four renamed groups keep a section overlay from their OLD section
  (same-`src` rename, section letter moved in 2026/27). Confirm whether the
  overlay should follow the new section: `2CP B G08` (carries 2CP C overlay),
  `1CS A G04` (carries 1CS B overlay), `1CS B G07` / `1CS B G08` (carry 1CS C
  overlay).
- Single-`src` groups (no section overlay found in any source): `2CP A G04`,
  `2CP B G06`, `2CP B G07`, `2CP C G11/G12` (dropped, not in HTML),
  `1CS C G10`, `2SD A G02`. Per merge rule 3 these stay single — the second
  calendar is genuinely absent from every source.
- Group-first `src` ordering (group, then section) follows the legacy
  edt.html page; the per-year pages list section first. Kept group-first to
  match what the app renders today.
- Scraper 1 notes an unlabeled 2CP A overlay group ID on edt.html
  (`Y18yZGZlOGZjOWRkOGQyZTNkNDAwMTlmZWQ0MGUyMTM5NTJiODU4ZGUwNWE4YzA3ZjgxNDBiMmU5ZTY5YWU4YTg2…`)
  and a personal `@esi.dz` calendar on the 1CP A G02 embed — both excluded.
- Scraper 1 did not check robots.txt and could not run a headless browser;
  JavaScript-injected calendars would have been missed.
