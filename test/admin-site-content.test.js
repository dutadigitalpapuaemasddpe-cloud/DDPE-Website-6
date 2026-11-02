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

function saveEnvironment() {
  const keys = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const values = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  return () => keys.forEach((key) => {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  });
}

function mockAdminFetch({ permissions, currentPages, onSave }) {
  return async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "editor-1", email: "editor@example.test" }), { status: 200 });
    }
    if (parsed.pathname.endsWith("/rest/v1/ddpe_permissions")) return new Response(JSON.stringify(permissions), { status: 200 });
    if (parsed.pathname.endsWith("/rest/v1/rpc/save_ddpe_cms_setting") && options.method === "POST") {
      onSave(JSON.parse(options.body));
      return new Response("", { status: 201 });
    }
    if (parsed.pathname.endsWith("/rest/v1/site_settings")) return new Response(JSON.stringify([{ value: currentPages }]), { status: 200 });
    if (parsed.pathname.endsWith("/rest/v1/ddpe_audit_log")) return new Response("", { status: 201 });
    throw new Error("unexpected request: " + url);
  };
}

test("site content save is restricted to editor and allowlisted pages", async () => {
  const restore = saveEnvironment();
  const originalFetch = global.fetch;
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const savedRecords = [];
  global.fetch = mockAdminFetch({
    permissions: [{ permission: "content_editor", scope_type: "organization", scope_id: null }],
    currentPages: {},
    onSave: (record) => savedRecords.push(record)
  });

  try {
    const handler = require("../api/admin");
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-session", host: "ddpe.test", origin: "https://ddpe.test" },
      body: { action: "save_site_content", page_key: "tentang.html", title: "Profil gerakan DDPE", intro: "Pengantar profil organisasi yang ditinjau oleh editor.", sections:[] }
    };
    const res = createResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body), { saved: true, page_key: "tentang.html" });
    assert.equal(savedRecords[0].p_key, "cms_page:tentang.html");
    assert.equal(savedRecords[0].p_actor, "editor-1");
    assert.equal(savedRecords[0].p_value.title, "Profil gerakan DDPE");

    const invalid = createResponse();
    await handler({ ...req, body: { ...req.body, page_key: "dashboard.html" } }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(savedRecords.length, 1);
  } finally {
    global.fetch = originalFetch;
    restore();
  }
});
