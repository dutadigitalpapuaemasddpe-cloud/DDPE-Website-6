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

test("public site content returns only whitelisted page copy from a public setting", async () => {
  const originalFetch = global.fetch;
  const saved = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "test-publishable-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  global.fetch = async (url) => {
    assert.match(url, /is_public=eq.true/);
    if(url.includes("setting_key=eq.leadership"))return new Response("[]",{status:200});
    if(url.includes("cms_event:"))return new Response("[]",{status:200});
    return new Response(JSON.stringify([{ setting_key:"public_site_copy_v1", value: {
      "index.html": { title: "DDPE", intro: "Pengantar publik yang sudah diperiksa." },
      "dashboard.html": { title: "Rahasia", intro: "Konten privat tidak boleh keluar." }
    } }]), { status: 200 });
  };

  try {
    const handler = require("../api/public-site-content");
    const res = createResponse();
    await handler({ method: "GET" }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body), {
      pages: { "index.html": { title: "DDPE", intro: "Pengantar publik yang sudah diperiksa." } }, events:[], leadership:require("../data/leadership.json")
    });
  } finally {
    global.fetch = originalFetch;
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.anon === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = saved.anon;
    if (saved.service === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = saved.service;
  }
});
