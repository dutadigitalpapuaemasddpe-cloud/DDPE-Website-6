"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const PUBLISHER = "11111111-1111-4111-8111-111111111111";

function setEnv() {
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "test-publishable-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
}
const json = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
function response() { return { statusCode: 0, body: "", setHeader() {}, end(value) { this.body = value || ""; } }; }

test("public recruitments are read server-side (anon key is blocked by RLS without a policy)", async () => {
  const originalFetch = global.fetch;
  setEnv();
  const keys = [];
  global.fetch = async (url, init) => {
    keys.push(init.headers.apikey);
    assert.match(url, /recruitments\?select=.*&status=eq\.open/);
    return json(200, [{ id: "a", minimum_age: 18, opens_at: null, closes_at: null }, { id: "b", minimum_age: 16 }]);
  };
  try {
    const res = response();
    await require("../api/public-recruitments")({ method: "GET", query: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body).recruitments.map((r) => r.id), ["a"]);
    assert.deepEqual(keys, ["test-service-key"]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("comment moderation uses article_comments, the table the public article page writes to", async () => {
  const originalFetch = global.fetch;
  setEnv();
  const urls = [];
  global.fetch = async (url, init) => {
    urls.push(init && init.method ? init.method + " " + url : "GET " + url);
    if (url.endsWith("/auth/v1/user")) return json(200, { id: PUBLISHER });
    if (url.includes("/ddpe_permissions")) return json(200, [{ permission: "publisher", scope_type: "organization", scope_id: null }]);
    if (url.includes("/article_comments?select=")) return json(200, [{ id: "c1", article_id: "a1", user_name: "Pembaca", comment_text: "Halo", status: "approved", created_at: "2026-11-23T00:00:00Z" }]);
    if (url.includes("/article_comments?id=eq.")) return json(200, [{ id: "c1", status: "rejected" }]);
    if (url.includes("/ddpe_audit_log")) return json(201, null);
    throw new Error("unexpected URL " + url);
  };
  try {
    const admin = require("../api/admin");
    const headers = { authorization: "Bearer t", host: "ddpe.test" };
    let res = response();
    await admin({ method: "GET", headers, query: { view: "comments" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body).comments[0], { id: "c1", article_id: "a1", name: "Pembaca", body: "Halo", status: "approved", created_at: "2026-11-23T00:00:00Z" });
    res = response();
    await admin({ method: "POST", headers, body: { action: "moderate_comment", id: "11111111-2222-4333-8444-555555555555", status: "rejected" } }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(urls.some((u) => u.startsWith("PATCH ") && u.includes("/article_comments?id=eq.")));
    assert.ok(!urls.some((u) => u.includes("cms_comments")));
  } finally {
    global.fetch = originalFetch;
  }
});

test("submission errors raised inside RPCs (P0001) reach the specific error mapping", async () => {
  const originalFetch = global.fetch;
  setEnv();
  process.env.DDPE_RATE_LIMIT_SECRET = "x".repeat(40);
  global.fetch = async () => json(400, { code: "P0001", message: "rate_limited" });
  try {
    const res = response();
    await require("../api/submissions")({ method: "POST", headers: { host: "ddpe.test", "x-forwarded-for": "203.0.113.7" }, body: {
      kind: "partnership", submission_key: "11111111-2222-4333-8444-555555555555", organization_name: "Mitra", contact_name: "Kontak",
      email: "mitra@example.test", whatsapp: "081234567890", collaboration_type: "Pendidikan", message: "Pesan kemitraan yang cukup panjang.", data_consent: true
    } }, res);
    assert.equal(res.statusCode, 429);
  } finally {
    global.fetch = originalFetch;
  }
});
