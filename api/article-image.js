"use strict";

const { publicConfig } = require("./_lib/supabase");

module.exports = async function articleImage(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    return res.end("Method not allowed");
  }
  const id = req.query && req.query.id;
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    res.statusCode = 400;
    return res.end("Invalid article ID");
  }
  try {
    const settings = publicConfig();
    const path = "articles?select=cover_image,status&id=eq." + encodeURIComponent(id) + "&status=eq.published&limit=1";
    const response = await fetch(settings.base + "/rest/v1/" + path, { headers: { apikey: settings.anonKey, Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error("article_lookup_failed");
    const rows = await response.json();
    const match = Array.isArray(rows) ? rows[0] : null;
    const data = typeof (match && match.cover_image) === "string"
      ? match.cover_image.match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=\r\n]+)$/)
      : null;
    if (!data || data[2].length > 5000000) {
      res.statusCode = 404;
      return res.end("Image not found");
    }
    const bytes = Buffer.from(data[2], "base64");
    const mime = "image/" + data[1].replace("jpg", "jpeg");
    const valid = mime === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : mime === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!valid || bytes.length > 3 * 1024 * 1024) {
      res.statusCode = 404;
      return res.end("Image not found");
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(bytes);
  } catch (_error) {
    res.statusCode = 503;
    return res.end("Image service unavailable");
  }
};