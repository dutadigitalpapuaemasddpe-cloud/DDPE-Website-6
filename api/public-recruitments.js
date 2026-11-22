"use strict";

const { rest, send } = require("./_lib/supabase");

module.exports = async function publicRecruitments(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET" });
  try {
    const id = req.query && req.query.id;
    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return send(res, 400, { error: "invalid_recruitment_id" });
    const fields = "id,kind,pillar_id,program_id,title,scope,requirements,opens_at,closes_at,accepted_quota,minimum_age,result_instructions";
    const query = "recruitments?select=" + fields + "&status=eq.open" + (id ? "&id=eq." + encodeURIComponent(id) : "") + "&order=opens_at.asc&limit=100";
    // recruitments has RLS enabled without an anon policy on the live database, so the anon key
    // always sees zero rows. Read server-side with a fixed filter (open only) and a public field list.
    const rows = await rest(query);
    const now = Date.now();
    const recruitments = (Array.isArray(rows) ? rows : []).filter((row) =>
      row.minimum_age >= 18 && (!row.opens_at || Date.parse(row.opens_at) <= now) && (!row.closes_at || Date.parse(row.closes_at) > now)
    );
    return send(res, 200, { recruitments });
  } catch (_error) {
    return send(res, 503, { error: "recruitment_service_unavailable" });
  }
};