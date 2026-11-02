"use strict";

const { authenticate, config, hasPermission, permissions, readJson, rest, rpc, sameOrigin, send } = require("./_lib/supabase");

const leadership = require("./_lib/leadership");
const editorial = require("../js/editorial");
const cms = require("./_lib/cms");
const EDITABLE_SITE_PAGES = new Set([
  "index.html", "tentang.html", "struktur.html", "program.html", "kegiatan.html",
  "berita.html", "terlibat.html", "kemitraan.html", "kontak.html", "konsultasi.html",
  "mitra.html", "privasi.html", "agenda.html", "media.html", "kegiatan-terlaksana.html", "visi-misi.html", "program-dldpe.html", "program-didpe.html", "program-amex.html", "program-volunteer.html"
]);

function plain(value, minimum, maximum) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= minimum && normalized.length <= maximum ? normalized : null;
}

function safeCover(value) {
  if (value === "") return "";
  if (typeof value !== "string" || value.length > 1200) return null;
  if (/^assets\/[a-zA-Z0-9_./-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch (_error) {
    return null;
  }
}

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

async function audit(actorId, action, entityType, entityId, details) {
  await rest("ddpe_audit_log", {
    method: "POST",
    body: { actor_id: actorId, action, entity_type: entityType, entity_id: entityId || null, details: details || {} },
    prefer: "return=minimal"
  });
}

async function recruitmentScopeIds(rows, permission) {
  const grants = rows.filter((row) => row.permission === permission);
  if (grants.some((row) => row.scope_type === "organization")) return null;
  const recruitments = await rest("recruitments?select=id,program_id,pillar_id");
  return recruitments.filter((item) => grants.some((grant) =>
    (grant.scope_type === "recruitment" && grant.scope_id === item.id) ||
    (grant.scope_type === "program" && grant.scope_id === item.program_id) ||
    (grant.scope_type === "pillar" && grant.scope_id === item.pillar_id)
  )).map((item) => item.id);
}

async function getApplications(user, grants, res, format) {
  const permission = format === "csv" ? "application_exporter" : "application_reviewer";
  if (!hasPermission(grants, permission)) return send(res, 403, { error: "forbidden" });
  const ids = await recruitmentScopeIds(grants, permission);
  const query = "applications?select=id,reference_code,recruitment_id,recruitment:recruitments(id,title,kind,pillar_id,program_id),full_name,email,whatsapp,regency,province,age,activity,interests,motivation,availability,skills,experience,status,internal_note,notification_status,created_at,updated_at,reviewed_at,reviewed_by&order=created_at.desc&limit=1000" +
    (ids === null ? "" : ids.length ? "&recruitment_id=in.(" + ids.join(",") + ")" : "&id=eq.00000000-0000-0000-0000-000000000000");
  const rows = await rest(query);

  if (format === "csv") {
    const fields = ["reference_code", "recruitment_id", "full_name", "email", "whatsapp", "regency", "province", "age", "activity", "status", "created_at"];
    const csv = [fields.join(",")].concat(rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))).join("\r\n");
    await audit(user.id, "applications_exported", "application", null, { count: rows.length });
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="ddpe-lamaran.csv"');
    res.setHeader("Cache-Control", "no-store");
    return res.end("\uFEFF" + csv);
  }
  return send(res, 200, { applications: rows });
}

async function getArticles(grants, res) {
  if (!hasPermission(grants, "content_editor") && !hasPermission(grants, "publisher")) return send(res, 403, { error: "forbidden" });
  const articles = await rest("site_articles?select=id,legacy_id,slug,title,excerpt,body,category,cover_url,cover_media_id,cover_alt,cover_caption,author,author_bio,tags,meta_description,status,published_at,updated_at&order=updated_at.desc");
  const revisions = await rest("site_article_revisions?select=id,article_id,slug,title,excerpt,body,category,cover_url,cover_media_id,cover_alt,cover_caption,author,author_bio,tags,meta_description,status,created_at&order=created_at.desc");
  return send(res, 200, { articles, revisions });
}

async function getRecruitments(grants, res) {
  if (!hasPermission(grants, "content_editor") && !hasPermission(grants, "publisher")) return send(res, 403, { error: "forbidden" });
  const rows = await rest("recruitments?select=id,program_id,pillar_id,kind,title,scope,requirements,opens_at,closes_at,status,accepted_quota,minimum_age,guardian_review_required,result_instructions,created_at,updated_at&order=created_at.desc");
  return send(res, 200, { recruitments: rows });
}

async function readSiteCopy() {
  const rows = await rest("site_settings?setting_key=eq.public_site_copy_v1&select=value&limit=1");
  const value = rows && rows[0] && rows[0].value;
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function getSiteContent(grants, res) {
  if (!hasPermission(grants, "content_editor") && !hasPermission(grants, "publisher")) {
    return send(res, 403, { error: "forbidden" });
  }
  return send(res, 200, { pages: await cms.readPages() });
}

async function saveSiteContent(input, user, grants) {
  if (!hasPermission(grants, "content_editor")) return {status:403,body:{error:"forbidden"}};
  if (!EDITABLE_SITE_PAGES.has(input.page_key)) return {status:400,body:{error:"check_site_content_fields"}};
  const page=cms.page(input);
  if (!page) return {status:400,body:{error:"check_site_content_fields"}};
  await cms.write("cms_page:"+input.page_key,page,user.id,input.version);
  await audit(user.id,"site_content_saved","site_page",input.page_key,{});
  return {status:200,body:{saved:true,page_key:input.page_key}};
}
async function saveEvent(input,user,grants) {
  if (!hasPermission(grants,"content_editor")) return {status:403,body:{error:"forbidden"}};
  const event=cms.event(input.event);
  if(!event)return {status:400,body:{error:"check_event_fields"}};
  await cms.write("cms_event:"+event.id,event,user.id,input.version);
  await audit(user.id,"event_saved","event",event.id,{});
  return {status:200,body:{saved:true}};
}
async function removeContent(input,user,grants) {
  const isEvent=input.action==="delete_event";
  if(!hasPermission(grants,isEvent?"content_editor":"publisher")) return {status:403,body:{error:"forbidden"}};
  if(typeof input.id!=="string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.id))return {status:400,body:{error:"invalid_id"}};
  if(isEvent){await cms.write("cms_event:"+input.id,{deleted:true,id:input.id},user.id,input.version);}
  else {
    // Archive is reversible; retained legacy IDs prevent old copies resurfacing.
    const changed=await rest("site_articles?id=eq."+encodeURIComponent(input.id),{method:"PATCH",body:{status:"archived",updated_at:new Date().toISOString(),updated_by:user.id}});
    if(!changed.length)return {status:404,body:{error:"article_not_found"}};
  }
  await audit(user.id,isEvent?"event_deleted":"article_archived",isEvent?"event":"article",input.id,{});
  return {status:200,body:{saved:true}};
}

async function getPermissions(user, grants, res) {
  if (!hasPermission(grants, "access_manager")) return send(res, 403, { error: "forbidden" });
  const rows = await rpc("list_ddpe_permissions", { p_actor_id: user.id });
  return send(res, 200, { permissions: Array.isArray(rows) ? rows : [] });
}

async function getPartnerships(grants, res) {
  if (!hasPermission(grants, "partnership_reviewer")) return send(res, 403, { error: "forbidden" });
  const rows = await rest("partnership_inquiries?select=id,reference_code,organization_name,contact_name,email,whatsapp,collaboration_type,message,status,internal_note,created_at,updated_at&order=created_at.desc&limit=500");
  return send(res, 200, { inquiries: rows });
}

function managesScope(grants, scopeType, scopeId) {
  return grants.some((grant) => grant.permission === "access_manager" && (
    (grant.scope_type === "organization" && grant.scope_id === null) ||
    (grant.scope_type === scopeType && grant.scope_id === scopeId)
  ));
}

function hasRecruitmentPermission(grants, permission, recruitment) {
  return grants.some((grant) => grant.permission === permission && (
    (grant.scope_type === "organization" && grant.scope_id === null) ||
    (grant.scope_type === "recruitment" && grant.scope_id === recruitment.id) ||
    (grant.scope_type === "program" && grant.scope_id === recruitment.program_id) ||
    (grant.scope_type === "pillar" && grant.scope_id === recruitment.pillar_id)
  ));
}

async function grantPermission(input, user, grants) {
  const email = plain(input.email || "", 5, 254);
  const permission = input.permission;
  const scopeType = input.scope_type;
  const scopeId = scopeType === "organization" ? null : plain(input.scope_id, 1, 100);
  const allowed = ["access_manager", "content_editor", "publisher", "application_reviewer", "application_exporter", "partnership_reviewer"];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !allowed.includes(permission) || !["organization", "pillar", "program", "recruitment"].includes(scopeType) ||
      (scopeType === "organization" ? (input.scope_id !== undefined && input.scope_id !== null) : !scopeId) || !managesScope(grants, scopeType, scopeId)) {
    return { status: 403, body: { error: "permission_scope_not_allowed" } };
  }
  if (permission === "access_manager" && !hasPermission(grants, "access_manager", { type: "organization", id: "" })) {
    return { status: 403, body: { error: "organization_manager_required" } };
  }
  const assigned = await rpc("grant_ddpe_permission", {
    p_email: email, p_office_title: plain(input.office_title || "", 0, 100) || "",
    p_permission: permission, p_scope_type: scopeType, p_scope_id: scopeId, p_actor_id: user.id
  });
  return { status: 201, body: { permission: Array.isArray(assigned) ? assigned[0] : assigned } };
}

async function revokePermission(input, user, grants) {
  if (typeof input.id !== "string") return { status: 400, body: { error: "invalid_permission" } };
  if (!hasPermission(grants, "access_manager")) return { status: 403, body: { error: "forbidden" } };
  await rpc("revoke_ddpe_permission", { p_permission_id: input.id, p_actor_id: user.id });
  return { status: 200, body: { saved: true } };
}

async function saveArticle(input, user, grants) {
  if (!hasPermission(grants, "content_editor")) return { status: 403, body: { error: "forbidden" } };
  const title = plain(input.title, 4, 180);
  const slug = typeof input.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) && input.slug.length <= 100 ? input.slug : null;
  const excerpt = plain(input.excerpt || "", 0, 320);
  const rawBody = plain(input.body, 20, 30000);
  const body = rawBody && editorial.clean(rawBody);
  const extra = cms.articleMeta(input);
  if (!extra || !body || editorial.text(body).length < 20) return {status:400,body:{error:"check_article_fields"}};
  const cover = safeCover(input.cover_url || "");
  const mediaId = input.cover_media_id ? String(input.cover_media_id) : "";
  const coverAlt = plain(input.cover_alt || "", 0, 220);
  if (!title || !slug || excerpt === null || !body || cover === null || coverAlt === null || (mediaId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mediaId))) return { status: 400, body: { error: "check_article_fields" } };

  if (mediaId) {
    const assets = await rest("media_assets?id=eq." + encodeURIComponent(mediaId) + "&select=id,public_url,alt_text");
    if (!assets[0] || assets[0].public_url !== cover) return { status: 400, body: { error: "media_reference_invalid" } };
  }

  const fields = { ...extra, title, slug, excerpt: excerpt || "", body, category: plain(input.category || "berita", 2, 50), cover_url: cover || null, cover_media_id: mediaId || null, cover_alt: coverAlt || "" };
  if (!fields.category) return { status: 400, body: { error: "check_article_fields" } };
  if (input.revision_id) {
    const revisions = await rest("site_article_revisions?id=eq." + encodeURIComponent(input.revision_id) + "&article_id=eq." + encodeURIComponent(input.id) + "&select=id,article_id,status");
    const revision = revisions && revisions[0];
    if (!revision || !["draft", "rejected"].includes(revision.status)) return { status: 404, body: { error: "revision_not_found" } };
    const updated = await rest("site_article_revisions?id=eq." + encodeURIComponent(revision.id), {
      method: "PATCH", body: { ...fields, status: "draft", created_by: user.id }
    });
    await audit(user.id, "article_revision_saved", "article", revision.article_id, { revision_id: revision.id });
    return { status: 200, body: { revision: updated[0] } };
  }
  let article;
  if (input.id) {
    const rows = await rest("site_articles?select=id,status,slug&id=eq." + encodeURIComponent(input.id));
    article = Array.isArray(rows) ? rows[0] : null;
    if (!article) return { status: 404, body: { error: "article_not_found" } };
    if (article.status === "published") {
      const created = await rest("site_article_revisions", { method: "POST", body: { article_id: article.id, ...fields, status: "draft", created_by: user.id } });
      await audit(user.id, "article_revision_saved", "article", article.id, { revision_id: created[0].id });
      return { status: 201, body: { revision: created[0] } };
    }
    const updated = await rest("site_articles?id=eq." + encodeURIComponent(article.id), {
      method: "PATCH", body: { ...fields, status: "draft", updated_by: user.id, updated_at: new Date().toISOString() }
    });
    await audit(user.id, "article_draft_saved", "article", article.id, {});
    return { status: 200, body: { article: updated[0] } };
  }

  const created = await rest("site_articles", { method: "POST", body: { ...fields, status: "draft", updated_by: user.id } });
  await audit(user.id, "article_draft_created", "article", created[0].id, {});
  return { status: 201, body: { article: created[0] } };
}

async function submitArticle(input, user, grants) {
  if (!hasPermission(grants, "content_editor")) return { status: 403, body: { error: "forbidden" } };
  if (input.revision_id) {
    const rows = await rest("site_article_revisions?id=eq." + encodeURIComponent(input.revision_id) + "&select=id,article_id,status");
    const revision = rows && rows[0];
    if (!revision || !["draft", "rejected"].includes(revision.status)) return { status: 404, body: { error: "revision_not_found" } };
    const updated = await rest("site_article_revisions?id=eq." + encodeURIComponent(revision.id), {
      method: "PATCH", body: { status: "submitted", created_by: user.id }
    });
    await audit(user.id, "article_revision_submitted", "article", revision.article_id, { revision_id: revision.id });
    return { status: 200, body: { revision: updated[0] } };
  }
  const updated = await rest("site_articles?id=eq." + encodeURIComponent(input.id) + "&status=eq.draft", {
    method: "PATCH", body: { status: "submitted", updated_by: user.id, updated_at: new Date().toISOString() }
  });
  if (!updated || !updated[0]) return { status: 409, body: { error: "article_not_draft" } };
  await audit(user.id, "article_submitted", "article", input.id, {});
  return { status: 200, body: { article: updated[0] } };
}

async function publishArticle(input, user, grants) {
  if (!hasPermission(grants, "publisher")) return { status: 403, body: { error: "forbidden" } };
  if (typeof input.id !== "string" || input.id.length > 128) return { status: 400, body: { error: "invalid_article_id" } };
  const result = await rpc("publish_ddpe_article", {
    p_article_id: input.id,
    p_revision_id: input.revision_id || null,
    p_actor_id: user.id
  });
  const article = Array.isArray(result) ? result[0] : result;
  return article ? { status: 200, body: { article } } : { status: 404, body: { error: "article_not_found" } };
}

module.exports = async function admin(req, res) {
  if (!sameOrigin(req)) return send(res, 403, { error: "origin_not_allowed" });
  if (!(["GET", "POST", "PATCH"].includes(req.method))) return send(res, 405, { error: "method_not_allowed" });

  try {
    config();
    const user = await authenticate(req);
    if (!user) return send(res, 401, { error: "sign_in_required" });
    const grants = await permissions(user.id);

    if (req.method === "GET") {
      if (req.query && req.query.view === "me") {
        return send(res, 200, { user: { id: user.id }, permissions: grants });
      }
      if(req.query && req.query.view === "leadership") {
        if(!hasPermission(grants,"content_editor"))return send(res,403,{error:"forbidden"});
        return send(res,200,await leadership.read());
      }
      if(req.query && req.query.view === "events") {
        if(!hasPermission(grants,"content_editor"))return send(res,403,{error:"forbidden"});
        return send(res,200,{events:await cms.readEvents()});
      }
      if(req.query && req.query.view === "comments") {
        if(!hasPermission(grants,"publisher"))return send(res,403,{error:"forbidden"});
        return send(res,200,{comments:await rest("cms_comments?select=id,article_id,name,body,status,created_at&order=created_at.desc&limit=100")});
      }
      if (req.query && req.query.view === "articles") return await getArticles(grants, res);
      if (req.query && req.query.view === "site_content") return await getSiteContent(grants, res);
      if (req.query && req.query.view === "applications") return await getApplications(user, grants, res, req.query.format);
      if (req.query && req.query.view === "recruitments") return await getRecruitments(grants, res);
      if (req.query && req.query.view === "permissions") return await getPermissions(user, grants, res);
      if (req.query && req.query.view === "partnerships") return await getPartnerships(grants, res);
      return send(res, 400, { error: "unknown_view" });
    }

    const input = await readJson(req, 500000);
    let result;
    if (req.method === "PATCH" && input.action === "review_application") {
      if (!hasPermission(grants, "application_reviewer")) return send(res, 403, { error: "forbidden" });
      const application = await rest("applications?id=eq." + encodeURIComponent(input.id) + "&select=id,recruitment_id");
      if (!application || !application[0]) return send(res, 404, { error: "application_not_found" });
      const recruitmentRows = await rest("recruitments?id=eq." + encodeURIComponent(application[0].recruitment_id) + "&select=id,program_id,pillar_id");
      const recruitment = recruitmentRows && recruitmentRows[0];
      const scoped = grants.some((grant) => grant.permission === "application_reviewer" && (
        (grant.scope_type === "organization" && grant.scope_id === null) ||
        (grant.scope_type === "recruitment" && grant.scope_id === application[0].recruitment_id) ||
        (grant.scope_type === "program" && grant.scope_id === recruitment.program_id) ||
        (grant.scope_type === "pillar" && grant.scope_id === recruitment.pillar_id)
      ));
      if (!scoped) return send(res, 403, { error: "forbidden" });
      await rpc("review_ddpe_application", { p_application_id: input.id, p_new_status: input.status, p_note: plain(input.note || "", 0, 2000) || "", p_actor_id: user.id });
      return send(res, 200, { saved: true });
    }
    if (req.method === "PATCH" && input.action === "review_partnership") {
      if (!hasPermission(grants, "partnership_reviewer")) return send(res, 403, { error: "forbidden" });
      await rpc("review_ddpe_partnership", {
        p_inquiry_id: input.id,
        p_new_status: input.status,
        p_note: plain(input.note || "", 0, 2000) || "",
        p_actor_id: user.id
      });
      return send(res, 200, { saved: true });
    }

    if (req.method === "POST") {
      if (input.action === "save_article") result = await saveArticle(input, user, grants);
      else if(input.action === "save_leadership") {
        if(!hasPermission(grants,"content_editor"))return send(res,403,{error:"forbidden"});
        result=await leadership.save(input,user);
      }
      else if(input.action === "save_event")result=await saveEvent(input,user,grants);
      else if(["archive_article","delete_event"].includes(input.action))result=await removeContent(input,user,grants);
      else if(input.action === "moderate_comment") {
        if(!hasPermission(grants,"publisher"))return send(res,403,{error:"forbidden"});
        if(!["approved","rejected"].includes(input.status) || !/^[0-9a-f-]{36}$/.test(input.id || ""))return send(res,400,{error:"invalid_comment"});
        await rest("cms_comments?id=eq."+encodeURIComponent(input.id),{method:"PATCH",body:{status:input.status}});
        await audit(user.id,"comment_moderated","comment",input.id,{status:input.status});
        result={status:200,body:{saved:true}};
      }
      else if (input.action === "save_site_content") result = await saveSiteContent(input, user, grants);
      else if (input.action === "submit_article") result = await submitArticle(input, user, grants);
      else if (input.action === "publish_article") result = await publishArticle(input, user, grants);
      else if (input.action === "save_recruitment") {
        if (!hasPermission(grants, "content_editor")) return send(res, 403, { error: "forbidden" });
        const kind = ["ambassador", "volunteer"].includes(input.kind) ? input.kind : null;
        const title = plain(input.title, 4, 180);
        const scope = plain(input.scope || "", 0, 500) || "";
        const requirements = plain(input.requirements || "", 0, 4000) || "";
        const programId = plain(input.program_id || "", 0, 100) || null;
        const pillarId = plain(input.pillar_id || "", 0, 100) || null;
        const quota = input.accepted_quota === "" || input.accepted_quota === null || input.accepted_quota === undefined ? null : Number(input.accepted_quota);
        const minimumAge = input.minimum_age === "" || input.minimum_age === null || input.minimum_age === undefined ? null : Number(input.minimum_age);
        if (!kind || !title || !scope || !requirements || (kind === "ambassador" && !pillarId) ||
          (kind === "volunteer" && !programId && !pillarId) || (quota !== null && (!Number.isInteger(quota) || quota < 0)) ||
          (minimumAge !== null && (!Number.isInteger(minimumAge) || minimumAge < 1 || minimumAge > 120))) {
          return send(res, 400, { error: "check_recruitment_fields" });
        }
        const fields = {
          kind, title, scope, requirements, program_id: programId, pillar_id: pillarId,
          opens_at: input.opens_at || null, closes_at: input.closes_at || null,
          accepted_quota: quota, minimum_age: minimumAge, guardian_review_required: true,
          result_instructions: plain(input.result_instructions || "", 0, 1000) || "", status: "closed", updated_by: user.id, updated_at: new Date().toISOString()
        };
        const saved = input.id
          ? await rest("recruitments?id=eq." + encodeURIComponent(input.id), { method: "PATCH", body: fields })
          : await rest("recruitments", { method: "POST", body: { ...fields, status: "draft" } });
        const recruitment = saved && saved[0];
        if (!recruitment) return send(res, 404, { error: "recruitment_not_found" });
        await audit(user.id, input.id ? "recruitment_updated" : "recruitment_created", "recruitment", recruitment.id, { status: recruitment.status });
        return send(res, input.id ? 200 : 201, { recruitment });
      }
      else if (input.action === "publish_recruitment") {
        const rows = await rest("recruitments?id=eq." + encodeURIComponent(input.id) + "&select=id,status,opens_at,closes_at,minimum_age,program_id,pillar_id");
        const recruitment = rows && rows[0];
        if (!recruitment) return send(res, 404, { error: "recruitment_not_found" });
        if (!hasRecruitmentPermission(grants, "publisher", recruitment)) return send(res, 403, { error: "forbidden" });
        if (!recruitment.minimum_age) return send(res, 409, { error: "age_requirement_unconfirmed" });
        if (recruitment.minimum_age < 18) return send(res, 409, { error: "guardian_flow_unavailable" });
        const now = Date.now();
        if ((recruitment.opens_at && Date.parse(recruitment.opens_at) > now) || (recruitment.closes_at && Date.parse(recruitment.closes_at) <= now)) {
          return send(res, 409, { error: "recruitment_outside_window" });
        }
        const opened = await rest("recruitments?id=eq." + encodeURIComponent(input.id), { method: "PATCH", body: { status: "open", updated_by: user.id, updated_at: new Date().toISOString() } });
        await audit(user.id, "recruitment_opened", "recruitment", input.id, {});
        return send(res, 200, { recruitment: opened[0] });
      }
      else if (input.action === "close_recruitment") {
        const rows = await rest("recruitments?id=eq." + encodeURIComponent(input.id) + "&select=id,program_id,pillar_id");
        const recruitment = rows && rows[0];
        if (!recruitment) return send(res, 404, { error: "recruitment_not_found" });
        if (!hasRecruitmentPermission(grants, "publisher", recruitment)) return send(res, 403, { error: "forbidden" });
        const closed = await rest("recruitments?id=eq." + encodeURIComponent(input.id), { method: "PATCH", body: { status: "closed", updated_by: user.id, updated_at: new Date().toISOString() } });
        if (!closed || !closed[0]) return send(res, 404, { error: "recruitment_not_found" });
        await audit(user.id, "recruitment_closed", "recruitment", input.id, {});
        return send(res, 200, { recruitment: closed[0] });
      }
      else if (input.action === "grant_permission") {
        result = await grantPermission(input, user, grants);
      }
      else if (input.action === "revoke_permission") {
        result = await revokePermission(input, user, grants);
      }
      else return send(res, 400, { error: "unknown_action" });
      return send(res, result.status, result.body);
    }

    return send(res, 400, { error: "unknown_action" });
  } catch (error) {
    if (/cms_conflict/i.test(String(error.code || error.message))) return send(res,409,{error:"cms_conflict"});
    if (error.code === "23505") return send(res,409,{error:"slug_already_exists"});
    if (error.message === "payload_too_large") return send(res,413,{error:"payload_too_large"});
    if (error.message === "server_not_configured") return send(res, 503, { error: "admin_service_not_configured" });
    if (/quota_reached/i.test(String(error.code || error.message))) return send(res, 409, { error: "quota_reached" });
    if (/last_access_manager/i.test(String(error.code || error.message))) return send(res, 409, { error: "last_access_manager" });
    if (/age_requirement_unconfirmed/i.test(String(error.code || error.message))) return send(res, 409, { error: "age_requirement_unconfirmed" });
    if (/guardian_flow_unavailable/i.test(String(error.code || error.message))) return send(res, 409, { error: "guardian_flow_unavailable" });
    if (/revision_not_submitted/i.test(String(error.code || error.message))) return send(res, 409, { error: "revision_not_submitted" });
    if (/article_not_submitted/i.test(String(error.code || error.message))) return send(res, 409, { error: "article_not_submitted" });
    if (/article_not_found/i.test(String(error.code || error.message))) return send(res, 404, { error: "article_not_found" });
    if (/decision_final/i.test(String(error.code || error.message))) return send(res, 409, { error: "decision_final" });
    if (/partnership_not_found/i.test(String(error.code || error.message))) return send(res, 404, { error: "partnership_not_found" });
    if (/not_found_or_forbidden/i.test(String(error.code || error.message))) return send(res, 404, { error: "application_not_found" });
    return send(res, 503, { error: "admin_request_failed" });
  }
};