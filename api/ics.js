// api/ics.js — Vercel serverless proxy for Google Calendar ICS feeds.
// Browser calls: /api/ics?id=<calendar-id>
// Google receives: https://calendar.google.com/calendar/ical/<id>/public/basic.ics
//
// Reason: Google's ICS endpoint sends no CORS headers, so a direct
// browser fetch is blocked. This same-origin proxy sidesteps CORS.

const ID_PATTERN = /^[A-Za-z0-9._%\-]+$/;

export default async function handler(req, res) {
  // CORS: allow same-origin (default) — no wildcard needed.
  // Restrict to GET.
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  const id = req.query?.id;
  if (!id || typeof id !== "string" || !ID_PATTERN.test(id)) {
    return res.status(400).send("Bad request: invalid or missing id");
  }

  const target =
    `https://calendar.google.com/calendar/ical/${id}/public/basic.ics`;

  const upstreamHeaders = {};
  if (req.headers["if-none-match"]) {
    upstreamHeaders["If-None-Match"] = req.headers["if-none-match"];
  }
  if (req.headers["if-modified-since"]) {
    upstreamHeaders["If-Modified-Since"] = req.headers["if-modified-since"];
  }

  let upstream;
  try {
    upstream = await fetch(target, { headers: upstreamHeaders });
  } catch (e) {
    return res.status(502).send("Upstream fetch failed: " + String(e?.message ?? e));
  }

  res.status(upstream.status);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  const etag = upstream.headers.get("etag");
  if (etag) res.setHeader("ETag", etag);
  const lastMod = upstream.headers.get("last-modified");
  if (lastMod) res.setHeader("Last-Modified", lastMod);

  if (upstream.status === 304) return res.end();

  const body = await upstream.text();
  return res.send(body);
}
