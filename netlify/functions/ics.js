// netlify/functions/ics.js — Netlify serverless proxy for Google
// Calendar ICS feeds. Same behavior as api/ics.js (Vercel).

const ID_PATTERN = /^[A-Za-z0-9._%\-]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: { Allow: "GET" }, body: "Method Not Allowed" };
  }

  const id = event.queryStringParameters?.id;
  if (!id || !ID_PATTERN.test(id)) {
    return { statusCode: 400, body: "Bad request: invalid or missing id" };
  }

  const target =
    `https://calendar.google.com/calendar/ical/${id}/public/basic.ics`;

  const upstreamHeaders = {};
  if (event.headers["if-none-match"]) {
    upstreamHeaders["If-None-Match"] = event.headers["if-none-match"];
  }
  if (event.headers["if-modified-since"]) {
    upstreamHeaders["If-Modified-Since"] = event.headers["if-modified-since"];
  }

  let upstream;
  try {
    upstream = await fetch(target, { headers: upstreamHeaders });
  } catch (e) {
    return { statusCode: 502, body: "Upstream fetch failed: " + String(e?.message ?? e) };
  }

  const headers = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  };
  const etag = upstream.headers.get("etag");
  if (etag) headers["ETag"] = etag;
  const lastMod = upstream.headers.get("last-modified");
  if (lastMod) headers["Last-Modified"] = lastMod;

  if (upstream.status === 304) {
    return { statusCode: 304, headers, body: "" };
  }

  const body = await upstream.text();
  return { statusCode: upstream.status, headers, body };
};
