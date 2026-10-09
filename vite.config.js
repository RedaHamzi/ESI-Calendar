import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      // Dev-only ICS proxy: browsers block direct fetch() to
      // calendar.google.com (no Access-Control-Allow-Origin), so web sync
      // rewrites ICS urls to /ics/... (see fetchUrlForSync in
      // src/services/sync.js). Production web builds have no proxy —
      // sync there is disabled with a clear message (canSyncOnThisPlatform).
      // Do NOT remove this without providing an alternative.
      '/ics': {
        target: 'https://calendar.google.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ics/, '/calendar/ical'),
      },
    },
  },
  build: {
    outDir: 'dist'
  }
})