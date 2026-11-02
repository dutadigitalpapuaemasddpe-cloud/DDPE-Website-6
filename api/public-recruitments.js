"use strict";

const { publicConfig, send } = require("./_lib/supabase");

module.exports = async function publicRecruitments(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET" });
  try {
    const settings = publicConfig();
    const id = req.query && req.query.id;
    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return send(res, 400, { error: "invalid_recruitment_id" });
    const fields = "id,kind,pillar_id,program_id,title,scope,requirements,opens_at,closes_at,accepted_quota,minimum_age,result_instructions";
    const query = "recruitments?select=" + fields + "&status=eq.open" + (id ? "&id=eq." + encodeURIComponent(id) : "") + "&order=opens_at.asc&limit=100";
    const response = await fetch(settings.base + "/rest/v1/" + query, {
      headers: { apikey: settings.anonKey, Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return send(res, 503, { error: "recruitment_service_unavailable" });
    const rows = await response.json();
    const now = Date.now();
    const recruitments = (Array.isArray(rows) ? rows : []).filter((row) =>
      row.minimum_age >= 18 && (!row.opens_at || Date.parse(row.opens_at) <= now) && (!row.closes_at || Date.parse(row.closes_at) > now)
    );
    return send(res, 200, { recruitments });
  } catch (_error) {
    return send(res, 503, { error: "recruitment_service_unavailable" });
  }
};