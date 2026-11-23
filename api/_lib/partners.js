'use strict';
// Mitra resmi DDPE. Disimpan di site_settings (kunci cms_partner:<id>) lewat RPC save_ddpe_cms_setting,
// sama seperti Agenda. Satu sumber data untuk dashboard dan semua halaman publik.
const { rest, rpc } = require('./supabase');

const STATUSES = ['draft', 'published', 'archived'];
const ID = /^[a-zA-Z0-9_-]{1,100}$/;
const text = (v, min, max) => (typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null);

function logoOk(v) { return v === '' || /^assets\/[a-zA-Z0-9_./-]{1,200}$/.test(v) || httpsUrl(v); }
function httpsUrl(v) {
  if (typeof v !== 'string' || v.length > 1200 || /[\u0000- \\]/.test(v)) return false;
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch (_) { return false; }
}

// Mengembalikan mitra yang sudah dinormalkan, atau null bila tidak valid.
function partner(input) {
  if (!input || typeof input !== 'object') return null;
  const o = {
    id: ID.test(input.id || '') ? input.id : null,
    name: text(input.name, 2, 160),
    category: text(input.category || 'Mitra', 2, 60),
    summary: text(input.summary || '', 0, 600),
    summary_en: text(input.summary_en || '', 0, 600),
    logo: typeof input.logo === 'string' ? input.logo.trim() : null,
    logo_alt: text(input.logo_alt || '', 0, 220),
    website: typeof input.website === 'string' ? input.website.trim() : null,
    order: Number.isInteger(input.order) && input.order >= 0 && input.order <= 10000 ? input.order : null,
    featured: input.featured === true,
    status: STATUSES.includes(input.status) ? input.status : null
  };
  if (Object.values(o).includes(null) || o.name === '' || o.category === '') return null;
  if (!logoOk(o.logo)) return null;
  if (o.website && !httpsUrl(o.website)) return null;
  if (o.logo && !o.logo_alt) o.logo_alt = 'Logo ' + o.name;
  return o;
}

const key = (id) => 'cms_partner:' + id;
function clean(row) {
  if (!row || !row.value || row.value.deleted) return null;
  const p = partner(row.value);
  return p ? { ...p, version: row.updated_at } : null;
}
const byOrder = (a, b) => a.order - b.order || a.name.localeCompare(b.name);

async function readAll() {
  const rows = await rest('site_settings?setting_key=like.cms_partner:*&select=value,updated_at');
  return rows.map(clean).filter(Boolean).sort(byOrder);
}

// Publik: hanya Terbit. `managed` false = belum ada data CMS sama sekali, sehingga halaman memakai daftar bawaan.
async function readPublic() {
  const rows = await rest('site_settings?setting_key=like.cms_partner:*&is_public=eq.true&select=value,updated_at');
  const all = rows.map(clean).filter(Boolean);
  const hasRecords = rows.some((r) => r.value && (r.value.deleted || partner(r.value)));
  const published = all.filter((p) => p.status === 'published').sort(byOrder).map(({ version, status, ...pub }) => pub);
  return { managed: hasRecords, partners: published };
}

async function save(input, user, grants, hasPermission) {
  if (!hasPermission(grants, 'content_editor')) return { status: 403, body: { error: 'forbidden' } };
  const p = partner(input.partner);
  if (!p) return { status: 400, body: { error: 'check_partner_fields' } };
  const rows = await rest('site_settings?setting_key=eq.' + encodeURIComponent(key(p.id)) + '&select=value,updated_at&limit=1');
  const existing = rows[0] && !rows[0].value.deleted ? rows[0].value : null;
  // Perubahan yang membuat/mengubah mitra Terbit langsung tampil publik, jadi butuh izin penerbit.
  if ((p.status === 'published' || (existing && existing.status === 'published')) && !hasPermission(grants, 'publisher')) {
    return { status: 403, body: { error: 'publisher_required' } };
  }
  await rpc('save_ddpe_cms_setting', { p_key: key(p.id), p_value: p, p_actor: user.id, p_version: input.version || null });
  return { status: 200, body: { saved: true, id: p.id } };
}

// Arsip = status archived (dapat dikembalikan). Hapus permanen hanya untuk Draf/Arsip.
async function remove(input, user, grants, hasPermission) {
  if (!hasPermission(grants, 'content_editor')) return { status: 403, body: { error: 'forbidden' } };
  if (typeof input.id !== 'string' || !ID.test(input.id)) return { status: 400, body: { error: 'invalid_id' } };
  const rows = await rest('site_settings?setting_key=eq.' + encodeURIComponent(key(input.id)) + '&select=value,updated_at&limit=1');
  const row = rows[0];
  const current = row && !row.value.deleted ? partner(row.value) : null;
  if (!current) return { status: 404, body: { error: 'partner_not_found' } };
  if (current.status === 'published' && !hasPermission(grants, 'publisher')) return { status: 403, body: { error: 'publisher_required' } };
  const permanent = input.action === 'delete_partner';
  if (permanent && current.status === 'published') return { status: 409, body: { error: 'archive_before_delete' } };
  const value = permanent ? { deleted: true, id: current.id } : { ...current, status: 'archived' };
  await rpc('save_ddpe_cms_setting', { p_key: key(current.id), p_value: value, p_actor: user.id, p_version: input.version || row.updated_at });
  return { status: 200, body: { saved: true, id: current.id } };
}

module.exports = { partner, readAll, readPublic, save, remove, STATUSES };
