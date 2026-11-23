"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { sendApplicationNotice } = require("../api/_lib/email");

function preserveEnvironment() {
  const keys = ["RESEND_API_KEY", "DDPE_NOTIFICATION_FROM", "DDPE_NOTIFICATION_TO"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  return function restore() {
    keys.forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    });
  };
}

test("application notification remains optional when email is not configured", async () => {
  const restore = preserveEnvironment();
  const originalFetch = global.fetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.DDPE_NOTIFICATION_FROM;
  global.fetch = async () => { throw new Error("email provider should not be called"); };
  try {
    assert.deepEqual(await sendApplicationNotice("DDPE-123", "Rekrutmen Duta", {}), { status: "not_configured" });
  } finally {
    global.fetch = originalFetch;
    restore();
  }
});

test("application email sends contact summary without long-form answers", async () => {
  const restore = preserveEnvironment();
  const originalFetch = global.fetch;
  let request;
  process.env.RESEND_API_KEY = "test-key";
  process.env.DDPE_NOTIFICATION_FROM = "DDPE <noreply@example.test>";
  process.env.DDPE_NOTIFICATION_TO = "dutadigitalpapuaemasddpe@gmail.com";
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: "email-test" }), { status: 200 });
  };

  try {
    const result = await sendApplicationNotice("DDPE-123", "Duta Literasi", {
      full_name: "Ayu DDPE",
      email: "ayu@example.test",
      whatsapp: "+6281234567890",
      regency: "Mimika",
      province: "Papua Tengah",
      age: 20,
      activity: "mahasiswa",
      motivation: "Jawaban panjang yang hanya boleh tersimpan di dashboard"
    });
    const body = JSON.parse(request.options.body);
    assert.deepEqual(result, { status: "sent" });
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.deepEqual(body.to, ["dutadigitalpapuaemasddpe@gmail.com"]);
    assert.match(body.text, /DDPE-123/);
    assert.match(body.text, /Ayu DDPE/);
    assert.match(body.text, /Mimika, Papua Tengah/);
    assert.doesNotMatch(body.text, /Jawaban panjang/);
    assert.equal(request.options.headers["Idempotency-Key"], "ddpe-application-DDPE-123");
  } finally {
    global.fetch = originalFetch;
    restore();
  }
});

test("application remains saved when the email provider is not configured", async () => {
  const keys = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DDPE_RATE_LIMIT_SECRET", "RESEND_API_KEY", "DDPE_NOTIFICATION_FROM"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalFetch = global.fetch;
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "test-publishable-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.DDPE_RATE_LIMIT_SECRET = "test-rate-limit-secret-with-at-least-32-bytes";
  delete process.env.RESEND_API_KEY;
  delete process.env.DDPE_NOTIFICATION_FROM;
  global.fetch = async (url) => {
    if (url.includes("/rpc/submit_ddpe_application")) return new Response(JSON.stringify("DDPE-TEST-123"), { status: 200 });
    if (url.includes("/recruitments?")) return new Response(JSON.stringify([{ title: "Duta Literasi Digital" }]), { status: 200 });
    throw new Error("unexpected request: " + url);
  };

  try {
    const handler = require("../api/submissions");
    const res = {
      statusCode: 0,
      headers: {},
      body: "",
      setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
      end(value) { this.body = value || ""; }
    };
    await handler({
      method: "POST",
      headers: { "x-vercel-forwarded-for": "192.0.2.10" },
      body: {
        kind: "application",
        submission_key: "11111111-1111-4111-8111-111111111111",
        recruitment_id: "22222222-2222-4222-8222-222222222222",
        full_name: "Ayu DDPE",
        email: "ayu@example.test",
        whatsapp: "+6281234567890",
        regency: "Mimika",
        province: "Papua Tengah",
        birth_date: (() => { const [y, m, d] = require("../api/_lib/age").witToday().split("-").map(Number); return new Date(Date.UTC(y - 20, m - 1, m === 2 && d === 29 ? 28 : d)).toISOString().slice(0, 10); })(),
        activity: "mahasiswa",
        interests: "Literasi digital",
        motivation: "Saya ingin belajar literasi digital.",
        availability: "Akhir pekan",
        data_consent: true,
        truthful_statement: true
      }
    }, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(JSON.parse(res.body), { saved: true, reference: "DDPE-TEST-123", notification: "not_configured" });
  } finally {
    global.fetch = originalFetch;
    keys.forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    });
  }
});
