// Pure helpers for grouping data.js entries by academic cohort/year.
// Titles in data.js look like:
//   "1CP A G01", "2CP B", "1CS C G011", "2SL A", "2ST A G03", "Master"
// Year is the cohort prefix; section is the optional letter; group is the
// optional trailing "GNN".

import { groups } from "../data/data.js";

// Matches: <digit><2-letter code> optionally followed by a space.
// Captures the cohort prefix only ("1CP", "2CS", ...).
const YEAR_RE = /^(\d(?:CP|CS|SL|SQ|ST|SD))\b/;

export function extractYear(title) {
  if (!title) return null;
  if (title === "Master") return "Master";
  const m = title.match(YEAR_RE);
  return m ? m[1] : null;
}

// Returns a stable, human-friendly ordered list of every year present in
// data.js. Order: 1CP, 2CP, 1CS, 2SL, 2SQ, 2ST, 2SD, Master, then any
// others alphabetically.
export function listYears() {
  const set = new Set();
  for (const g of groups) {
    const y = extractYear(g.title);
    if (y) set.add(y);
  }
  const preferred = ["1CP", "2CP", "1CS", "2SL", "2SQ", "2ST", "2SD", "Master"];
  const known = preferred.filter((y) => set.has(y));
  const extra = [...set].filter((y) => !preferred.includes(y)).sort();
  return [...known, ...extra];
}

// For each year, return the group entries from data.js that belong to it.
export function groupsByYear(year) {
  return groups.filter((g) => extractYear(g.title) === year);
}

// Same for sections. Sections are the standalone entries ("2CP A",
// "2ST A") that carry the shared overlay calendar; they are also
// matched by the year regex.
export function sectionsByYear(year) {
  // A section entry is a group entry whose title has no trailing "GNN".
  const re = /G\d+$/;
  return groupsByYear(year).filter((g) => !re.test(g.title));
}

// Every year's selection — useful as the default when nothing is stored.
export function allYears() {
  return listYears();
}
