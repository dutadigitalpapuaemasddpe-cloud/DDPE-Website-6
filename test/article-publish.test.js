"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const PUBLISHER = "11111111-1111-4111-8111-111111111111";
const ARTICLE = "7e09b1fe-dde1-4eef-aa30-a97fa1484d34";

function setEnv() {
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "test-publishable-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

async function callAdmin(body, rpcResponse) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push(url);
    if (url.endsWith("/auth/v1/user")) return json(200, { id: PUBLISHER });
    if (url.includes("/rest/v1/ddpe_permissions")) return json(200, [{ permission: "publisher", scope_type: "organization", scope_id: null }]);
    if (url.includes("/rest/v1/rpc/publish_ddpe_article")) return rpcResponse(JSON.parse(init.body));
    throw new Error("unexpected URL " + url);
  };
  const res = { statusCode: 0, body: "", setHeader() {}, end(value) { this.body = value || ""; } };
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    await require("../api/admin")({ method: "POST", headers: { authorization: "Bearer t", host: "ddpe.test" }, body }, res);
  } finally {
    console.error = originalError;
  }
  return { status: res.statusCode, body: JSON.parse(res.body), calls, errors };
}

test("article lookup by slug never compares the uuid id column with a slug", async () => {
  const originalFetch = global.fetch;
  setEnv();
  const urls = [];
  global.fetch = async (url) => {
    urls.push(decodeURIComponent(url));
    if (url.includes("/site_articles?")) return json(200, [{ id: ARTICLE, slug: "berita-uji", status: "published", published_at: "2026-11-01T00:00:00Z" }]);
    return json(200, []);
  };
  try {
    const { getArticle } = require("../api/_lib/article-store");
    assert.equal((await getArticle("berita-uji")).id, ARTICLE);
    assert.ok(urls[0].includes("or=(legacy_id.eq.berita-uji,slug.eq.berita-uji)"), urls[0]);
    await getArticle(ARTICLE);
    assert.ok(urls[1].includes("or=(id.eq." + ARTICLE + ",legacy_id.eq."), urls[1]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("publish rejects malformed ids before calling the database", async () => {
  const originalFetch = global.fetch;
  setEnv();
  try {
    const result = await callAdmin({ action: "publish_article", id: "not-a-uuid" }, () => json(200, []));
    assert.equal(result.status, 400);
    assert.equal(result.body.error, "invalid_article_id");
    assert.ok(!result.calls.some((url) => url.includes("/rpc/")));
  } finally {
    global.fetch = originalFetch;
  }
});

test("publish maps RPC exceptions (code P0001) to their specific error instead of 503", async () => {
  const originalFetch = global.fetch;
  setEnv();
  try {
    const result = await callAdmin({ action: "publish_article", id: ARTICLE }, () =>
      json(400, { code: "P0001", message: "article_not_submitted" }));
    assert.equal(result.status, 409);
    assert.equal(result.body.error, "article_not_submitted");
  } finally {
    global.fetch = originalFetch;
  }
});

test("publish returns the published article from the RPC", async () => {
  const originalFetch = global.fetch;
  setEnv();
  try {
    let args;
    const result = await callAdmin({ action: "publish_article", id: ARTICLE }, (body) => {
      args = body;
      return json(200, [{ id: ARTICLE, status: "published" }]);
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.article.status, "published");
    assert.deepEqual(args, { p_article_id: ARTICLE, p_revision_id: null, p_actor_id: PUBLISHER });
  } finally {
    global.fetch = originalFetch;
  }
});

test("unexpected database failures are logged with status and code only", async () => {
  const originalFetch = global.fetch;
  setEnv();
  try {
    const result = await callAdmin({ action: "publish_article", id: ARTICLE }, () =>
      json(404, { code: "PGRST202", message: "Could not find the function" }));
    assert.equal(result.status, 503);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /"status":404,"code":"PGRST202"/);
  } finally {
    global.fetch = originalFetch;
  }
});
