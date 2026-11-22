"use strict";

const crypto = require("node:crypto");

function publicConfig() {
  const base = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!base || !anonKey) throw new Error("server_not_configured");
  return { base: base.replace(/\/$/, "").replace(/\/rest\/v1$/, ""), anonKey };
}

function config() {
  const settings = publicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("server_not_configured");
  return { ...settings, serviceKey };
}

function send(res, status, payload, headers) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  Object.entries(headers || {}).forEach(([name, value]) => res.setHeader(name, value));
  res.end(JSON.stringify(payload));
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host.toLowerCase() === String(req.headers.host || "").toLowerCase();
  } catch (_error) {
    return false;
  }
}

async function readJson(req, maximumBytes) {
  const limit = Number.isInteger(maximumBytes) && maximumBytes > 0 ? maximumBytes : 20000;
  const length = Number(req.headers["content-length"] || 0);
  if (length > limit) throw new Error("payload_too_large");
  if (req.body && typeof req.body === "object") { if (Buffer.byteLength(JSON.stringify(req.body)) > limit) throw new Error("payload_too_large"); return req.body; }
  if (typeof req.body === "string") { if (Buffer.byteLength(req.body) > limit) throw new Error("payload_too_large"); return JSON.parse(req.body); }
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > limit) throw new Error("payload_too_large");
  }
  return JSON.parse(raw || "{}");
}

async function rest(path, options) {
  const settings = config();
  const response = await fetch(settings.base + "/rest/v1/" + path, {
    method: (options && options.method) || "GET",
    headers: {
      apikey: settings.serviceKey,
      Authorization: "Bearer " + settings.serviceKey,
      "Content-Type": "application/json",
      Prefer: (options && options.prefer) || "return=representation",
      ...(options && options.headers)
    },
    body: options && options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });
  const body = await response.text();
  let result = null;
  try { result = body ? JSON.parse(body) : null; } catch (_error) { result = null; }
  if (!response.ok) {
    const error = new Error("database_request_failed");
    error.status = response.status;
    error.code = result && (result.code || result.message);
    // RPC exceptions arrive as code P0001 with the reason in message (e.g. article_not_submitted).
    error.dbMessage = result && typeof result.message === "string" ? result.message : "";
    throw error;
  }
  return result;
}

async function rpc(name, args) {
  return rest("rpc/" + encodeURIComponent(name), { method: "POST", body: args });
}

async function authenticate(req) {
  const authorization = String(req.headers.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const settings = config();
  const response = await fetch(settings.base + "/auth/v1/user", {
    headers: { apikey: settings.anonKey, Authorization: "Bearer " + match[1] },
    cache: "no-store"
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user && user.id ? { id: user.id, token: match[1] } : null;
}

async function permissions(userId) {
  const query = "ddpe_permissions?select=permission,scope_type,scope_id&user_id=eq." + encodeURIComponent(userId);
  const rows = await rest(query);
  return Array.isArray(rows) ? rows : [];
}

function hasPermission(rows, permission, resource) {
  return rows.some((row) => row.permission === permission && (
    (row.scope_type === "organization" && row.scope_id === null) ||
    (resource && row.scope_type === resource.type && row.scope_id === String(resource.id))
  ));
}

function scopedIds(rows, permission) {
  return rows.filter((row) => row.permission === permission);
}

function rateFingerprint(req, scope) {
  const secret = process.env.DDPE_RATE_LIMIT_SECRET;
  if (!secret) throw new Error("server_not_configured");
  const forwarded = req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] || req.headers["x-real-ip"];
  const address = String(forwarded || "").split(",")[0].trim();
  if (!address) throw new Error("client_address_unavailable");
  return crypto.createHmac("sha256", secret).update(address + ":" + scope).digest("hex");
}

module.exports = { authenticate, config, hasPermission, permissions, publicConfig, rateFingerprint, readJson, rest, rpc, sameOrigin, scopedIds, send };