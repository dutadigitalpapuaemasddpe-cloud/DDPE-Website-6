"use strict";

const crypto = require("node:crypto");
const { authenticate, config, hasPermission, permissions, readJson, rest, sameOrigin, send } = require("./_lib/supabase");

function imageType(buffer) {
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
  return "";
}

module.exports = async function media(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" }, { Allow: "POST" });
  if (!sameOrigin(req)) return send(res, 403, { error: "origin_not_allowed" });
  let user;
  let input;
  try {
    config();
    user = await authenticate(req);
    if (!user) return send(res, 401, { error: "sign_in_required" });
    input = await readJson(req, 4300000);
  } catch (_error) {
    return send(res, 503, { error: "media_service_not_configured" });
  }

  try {
    const grants = await permissions(user.id);
    if (!hasPermission(grants, "content_editor")) return send(res, 403, { error: "forbidden" });
    const alt = typeof input.alt === "string" ? input.alt.trim() : "";
    if (alt.length < 4 || alt.length > 220) return send(res, 400, { error: "alt_text_required" });
    if (typeof input.data !== "string" || input.data.length > 7 * 1024 * 1024) return send(res, 413, { error: "image_too_large" });
    const bytes = Buffer.from(input.data, "base64");
    const type = imageType(bytes);
    if (!type || bytes.length > 5 * 1024 * 1024) return send(res, 415, { error: "unsupported_image" });
    const bucket = process.env.DDPE_PUBLIC_MEDIA_BUCKET;
    if (!bucket || !/^[a-z0-9][a-z0-9_-]{1,62}$/.test(bucket)) return send(res, 503, { error: "media_bucket_not_configured" });

    const settings = config();
    const path = "editorial/" + new Date().toISOString().slice(0, 10) + "/" + crypto.randomUUID() + "." + type.split("/")[1].replace("jpeg", "jpg");
    const response = await fetch(settings.base + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" + path.split("/").map(encodeURIComponent).join("/"), {
      method: "POST",
      headers: {
        apikey: settings.serviceKey,
        Authorization: "Bearer " + settings.serviceKey,
        "Content-Type": type,
        "Cache-Control": "31536000",
        "x-upsert": "false"
      },
      body: bytes
    });
    if (!response.ok) return send(res, 502, { error: "media_upload_failed" });
    const publicUrl = settings.base + "/storage/v1/object/public/" + encodeURIComponent(bucket) + "/" + path.split("/").map(encodeURIComponent).join("/");
    let metadata;
    try {
      metadata = await rest("media_assets", { method: "POST", body: {
        storage_path: path, public_url: publicUrl, mime_type: type, byte_size: bytes.length, alt_text: alt, uploaded_by: user.id
      } });
    } catch (error) {
      await fetch(settings.base + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" + path.split("/").map(encodeURIComponent).join("/"), {
        method: "DELETE",
        headers: { apikey: settings.serviceKey, Authorization: "Bearer " + settings.serviceKey }
      }).catch(() => {});
      throw error;
    }
    return send(res, 201, { saved: true, id: metadata[0].id, url: publicUrl, alt });
  } catch (_error) {
    return send(res, 503, { error: "media_upload_failed" });
  }
};