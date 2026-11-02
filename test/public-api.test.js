"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value) { this.body = value || ""; }
  };
}

test("public news merges published legacy and new rows without exposing drafts", async () => {
  const originalFetch = global.fetch;
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "test-publishable-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY="test-service-key";
  global.fetch = async (url) => {
    if (url.includes("site_articles")) {
      return new Response(JSON.stringify([{ id: "new-1", legacy_id: null, title: "Artikel baru", excerpt: "Ringkasan", category: "berita", published_at: "2026-10-20T01:00:00Z", status: "published" }]), { status: 200 });
    }
    if (url.includes("/articles?")) {
      return new Response(JSON.stringify([{ id: "art-mvflzbqe-fpdpa", title: "AMEX lama", excerpt: "Artikel lama", category: "berita", published_at: "2026-10-19T01:00:00Z", status: "published" }]), { status: 200 });
    }
    throw new Error("unexpected URL");
  };

  try {
    const handler = require("../api/public-articles");
    const req = { method: "GET", query: { limit: "10", page: "0" } };
    const res = createResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.deepEqual(payload.articles.map((article) => article.id), ["new-1", "art-mvflzbqe-fpdpa"]);
    assert.equal(payload.articles[1].categoryLabel, "berita");
  } finally {
    global.fetch = originalFetch;
  }
});

test("legacy article renderer keeps the id and escapes markup in metadata/body", async () => {
  const originalFetch = global.fetch;
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "test-publishable-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY="test-service-key";
  global.fetch = async (url) => {
    if (url.includes("site_articles")) return new Response("[]", { status: 200 });
    if (url.includes("/articles?")) {
      return new Response(JSON.stringify([{
        id: "art-mvflzbqe-fpdpa",
        title: "AMEX <script>alert(1)</script>",
        excerpt: "Artikel AMEX",
        body: "<script>alert(1)</script><p>Konten <strong>lama</strong></p>",
        category: "berita",
        published_at: "2026-10-19T01:00:00Z",
        cover_image: "assets/tim-ddpe-banner.jpg",
        status: "published"
      }]), { status: 200 });
    }
    throw new Error("unexpected URL");
  };

  try {
    const handler = require("../api/article-page");
    const req = { method: "GET", query: { id: "art-mvflzbqe-fpdpa" } };
    const res = createResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /\/artikel\.html\?id=art-mvflzbqe-fpdpa/);
    assert.match(res.body, /<p>Konten <strong>lama<\/strong><\/p>/);
    assert.doesNotMatch(res.body, /<script>alert\(1\)<\/script>/);
    assert.match(res.body, /&lt;script&gt;/);
    assert.match(res.body, /href="\/css\/institutional\.css"/);
    assert.match(res.body, /class="site-header portal-header"/);
    assert.equal((res.body.match(/data-site-menu-trigger=/g) || []).length, 5);
    assert.match(res.body, /src="\/js\/site\.js"/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("legacy article cover is served as a typed HTTPS image endpoint", async () => {
  const originalFetch = global.fetch;
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "test-publishable-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY="test-service-key";
  const cover = "data:image/jpeg;base64," + Buffer.from([255, 216, 255]).toString("base64");
  global.fetch = async () => new Response(JSON.stringify([{ status: "published", cover_image: cover }]), { status: 200 });

  try {
    const handler = require("../api/article-image");
    const req = { method: "GET", query: { id: "art-mvflzbqe-fpdpa" } };
    const res = createResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["content-type"], "image/jpeg");
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.deepEqual(Buffer.from(res.body), Buffer.from([255, 216, 255]));
  } finally {
    global.fetch = originalFetch;
  }
});
