"use strict";

const crypto = require("node:crypto");
const { config, rateFingerprint, readJson, rpc, sameOrigin, send } = require("./_lib/supabase");
const { sendApplicationNotice } = require("./_lib/email");
const { ADULT_AGE, ageOn, parseBirthDate, witToday } = require("./_lib/age");

function clean(value, minimum, maximum) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= minimum && normalized.length <= maximum ? normalized : null;
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validKey(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const GUARDIAN_RELATIONSHIPS = ["ayah", "ibu", "wali"];

// Mengembalikan { payload, age } atau { error }. Usia dihitung dari tanggal lahir terhadap hari ini di WIT;
// nilai "age" dari klien diabaikan. Batas usia per program ditegakkan di RPC (sumber kebenaran).
function applicationPayload(input) {
  const reference = witToday();
  const birthDate = parseBirthDate(input.birth_date, reference);
  const payload = {
    full_name: clean(input.full_name, 2, 120),
    email: typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
    whatsapp: clean(input.whatsapp, 8, 32),
    regency: clean(input.regency, 2, 100),
    province: clean(input.province, 2, 100),
    birth_date: birthDate,
    activity: input.activity,
    interests: clean(input.interests, 2, 1000),
    motivation: clean(input.motivation, 20, 4000),
    availability: clean(input.availability, 2, 1500),
    skills: input.skills === undefined ? "" : clean(input.skills, 0, 2000),
    experience: input.experience === undefined ? "" : clean(input.experience, 0, 3000),
    data_consent: input.data_consent === true,
    truthful_statement: input.truthful_statement === true
  };
  if (!birthDate) return { error: "invalid_birth_date" };
  const age = ageOn(birthDate, reference);
  if (age > 120) return { error: "invalid_birth_date" };
  if (!payload.full_name || !validEmail(payload.email) || !payload.whatsapp || !payload.regency || !payload.province ||
      !["pelajar", "mahasiswa", "bekerja", "lainnya"].includes(payload.activity) ||
      !payload.interests || !payload.motivation || !payload.availability || payload.skills === null || payload.experience === null ||
      !payload.data_consent || !payload.truthful_statement) return { error: "check_required_fields" };
  if (age < ADULT_AGE) {
    const guardian = {
      guardian_name: clean(input.guardian_name, 2, 120),
      guardian_relationship: typeof input.guardian_relationship === "string" ? input.guardian_relationship.trim().toLowerCase() : "",
      guardian_whatsapp: clean(input.guardian_whatsapp, 8, 32),
      guardian_email: input.guardian_email ? (validEmail(String(input.guardian_email).trim().toLowerCase()) ? String(input.guardian_email).trim().toLowerCase() : null) : "",
      guardian_consent: input.guardian_consent === true
    };
    if (!guardian.guardian_name || !GUARDIAN_RELATIONSHIPS.includes(guardian.guardian_relationship) || !guardian.guardian_whatsapp ||
        guardian.guardian_email === null || !guardian.guardian_consent) return { error: "guardian_required" };
    Object.assign(payload, guardian);
  }
  return { payload, age };
}

function partnershipPayload(input) {
  const payload = {
    organization_name: clean(input.organization_name, 2, 180),
    contact_name: clean(input.contact_name, 2, 120),
    email: typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
    whatsapp: clean(input.whatsapp, 8, 32),
    collaboration_type: clean(input.collaboration_type, 2, 120),
    message: clean(input.message, 20, 4000),
    data_consent: input.data_consent === true
  };
  if (!payload.organization_name || !payload.contact_name || !validEmail(payload.email) || !payload.whatsapp ||
      !payload.collaboration_type || !payload.message || !payload.data_consent) return null;
  return payload;
}

module.exports = async function submissions(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" }, { Allow: "POST" });
  if (!sameOrigin(req)) return send(res, 403, { error: "origin_not_allowed" });

  let input;
  try {
    input = await readJson(req);
    config();
  } catch (error) {
    const status = error.message === "payload_too_large" ? 413 : 503;
    return send(res, status, { error: status === 413 ? "payload_too_large" : "submission_service_not_configured" });
  }

  if (input.website) return send(res, 400, { error: "invalid_submission" });
  if (!validKey(input.submission_key)) return send(res, 400, { error: "invalid_submission" });

  const mode = input.kind;
  let result;
  let applicationData = null;
  try {
    if (mode === "application") {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.recruitment_id || "")) {
        return send(res, 400, { error: "invalid_submission" });
      }
      const parsed = applicationPayload(input);
      if (parsed.error) return send(res, 400, { error: parsed.error });
      const payload = parsed.payload;
      applicationData = { ...payload, age: parsed.age };
      const fingerprint = rateFingerprint(req, "application:" + input.recruitment_id);
      result = await rpc("submit_ddpe_application", {
        p_recruitment_id: input.recruitment_id,
        p_submission_key: input.submission_key,
        p_payload: payload,
        p_fingerprint: fingerprint
      });
    } else if (mode === "partnership") {
      const payload = partnershipPayload(input);
      if (!payload) return send(res, 400, { error: "check_required_fields" });
      const fingerprint = rateFingerprint(req, "partnership");
      result = await rpc("submit_ddpe_partnership", {
        p_submission_key: input.submission_key,
        p_payload: payload,
        p_fingerprint: fingerprint
      });
    } else {
      return send(res, 400, { error: "invalid_submission" });
    }
  } catch (error) {
    const message = [error.code, error.dbMessage, error.message].filter(Boolean).join(" ");
    if (/rate_limited/i.test(message)) return send(res, 429, { error: "too_many_attempts" }, { "Retry-After": "60" });
    if (/recruitment_closed/i.test(message)) return send(res, 409, { error: "recruitment_closed" });
    if (/age_requirement_unconfirmed/i.test(message)) return send(res, 409, { error: "age_requirement_unconfirmed" });
    if (/age_requirement_not_met/i.test(message)) return send(res, 400, { error: "age_requirement_not_met" });
    if (/guardian_consent_required/i.test(message)) return send(res, 400, { error: "guardian_required" });
    if (/invalid_birth_date/i.test(message)) return send(res, 400, { error: "invalid_birth_date" });
    if (/duplicate key|applications_recruitment_email_idx/i.test(message)) return send(res, 409, { error: "already_submitted" });
    if (/server_not_configured|client_address_unavailable/i.test(message)) return send(res, 503, { error: "submission_service_not_configured" });
    return send(res, 503, { error: "submission_not_saved" });
  }

  const reference = typeof result === "string" ? result : Array.isArray(result) ? result[0] : "";
  if (!reference) return send(res, 503, { error: "submission_not_saved" });
  let notification = "not_applicable";
  if (mode === "application") {
    let recruitmentTitle = "Rekrutmen DDPE";
    try {
      const recruitments = await rest("recruitments?id=eq." + encodeURIComponent(input.recruitment_id) + "&select=title&limit=1");
      if (recruitments && recruitments[0] && recruitments[0].title) recruitmentTitle = recruitments[0].title;
    } catch (_error) {}
    const email = await sendApplicationNotice(reference, recruitmentTitle, applicationData || {});
    notification = email.status;
    if (email.status === "sent") {
      try {
        const applications = await rest("applications?reference_code=eq." + encodeURIComponent(reference) + "&select=id&limit=1");
        if (applications && applications[0]) {
          await rest("applications?id=eq." + encodeURIComponent(applications[0].id), {
            method: "PATCH", body: { notification_status: "sent" }, prefer: "return=minimal"
          });
        }
      } catch (_error) {
        // The application and email are already delivered; keep the submission successful.
      }
    }
  }
  return send(res, 201, { saved: true, reference, notification });
};