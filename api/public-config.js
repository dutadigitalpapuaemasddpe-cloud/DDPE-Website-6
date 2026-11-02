"use strict";

const { publicConfig, send } = require("./_lib/supabase");

module.exports = function publicConfigEndpoint(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET" });
  try {
    const settings = publicConfig();
    return send(res, 200, { supabaseUrl: settings.base, supabaseAnonKey: settings.anonKey });
  } catch (_error) {
    return send(res, 503, { error: "public_config_not_available" });
  }
};