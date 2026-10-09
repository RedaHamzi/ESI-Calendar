// Temporary thin re-export (Part A of the web-offline refactor).
//
// Every `import ... from "services/db"` / `"../services/db"` now resolves
// to the storage facade (src/services/storage/index.js), which delegates to
// the native SQLite adapter or the web Dexie adapter. Callers keep working
// unchanged. Part F deletes this file and repoints imports at
// "services/storage".

export * from './storage/index.js';
