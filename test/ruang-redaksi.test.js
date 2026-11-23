"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
const js = fs.readFileSync(path.join(root, "js/dashboard.js"), "utf8");
const panel = html.slice(html.indexOf('data-panel="articles"'), html.indexOf('data-panel="site_content"'));
const form = panel.slice(panel.indexOf('id="article-form"'), panel.indexOf("</form>"));
const advanced = form.slice(form.indexOf('id="article-advanced"'), form.indexOf("</details>"));
const main = form.replace(advanced, "");

test("form utama hanya Judul, Isi Artikel, Foto Sampul; slug, SEO, dan teknis ada di Pengaturan Lanjutan", () => {
  for (const name of ["title"]) assert.match(main, new RegExp('name="' + name + '"'));
  assert.match(main, /id="article-editor"/);
  assert.match(main, /id="article-image"/);
  assert.match(main, /name="cover_alt"/);
  for (const name of ["slug", "excerpt", "category", "author", "author_bio", "cover_caption", "tags", "meta_description", "cover_url"]) {
    assert.match(advanced, new RegExp('name="' + name + '"'), name + " di Pengaturan Lanjutan");
    assert.ok(!main.includes('name="' + name + '"'), name + " tidak di form utama");
  }
  assert.match(advanced, /id="seo-counter"/);
  assert.match(form, /Pengaturan Lanjutan/);
});

test("toolbar mendukung heading, bold, italic, daftar, tautan, dan sisip gambar", () => {
  for (const marker of ['data-value="h2"', 'data-value="h3"', 'data-format="bold"', 'data-format="italic"', 'data-format="insertUnorderedList"', 'data-format="insertOrderedList"', 'id="editor-link"', 'id="toggle-inline-image"', 'id="insert-image"', 'id="inline-image"', 'id="inline-alt"']) {
    assert.ok(form.includes(marker), marker);
  }
});

test("ID, nama field, dan event handler yang dipakai alur publikasi tetap ada", () => {
  for (const id of ["article-form", "article-list", "revision-list", "article-editor", "article-dropzone", "article-image-preview", "article-image-status", "article-image-alt", "article-feedback", "submit-article", "preview-article", "publish-now", "new-article", "article-preview"]) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  for (const name of ["id", "revision_id", "cover_media_id", "body"]) assert.match(form, new RegExp('name="' + name + '"'));
  for (const action of ["save_article", "submit_article", "publish_article", "archive_article"]) assert.ok(js.includes(action), action);
});

test("tombol aksi mengikuti izin: Simpan/Ajukan untuk editor, Terbitkan hanya penerbit sekaligus editor", () => {
  assert.match(form, /id="submit-article"[^>]*data-permission="content_editor"/);
  assert.match(form, /id="publish-now"[^>]*data-permission="content_editor"[^>]*hidden/);
  assert.match(panel, /class="redaksi-main" data-permission="content_editor"/);
  assert.match(js, /getElementById\("publish-now"\)\.hidden=!\(has\("publisher"\) && has\("content_editor"\)\)/);
});

test("progres upload, validasi, dan konfirmasi ada", () => {
  assert.match(form, /id="article-upload-progress"/);
  assert.match(js, /Mengunggah gambar… /);
  assert.match(js, /Judul minimal 4 karakter/);
  assert.match(js, /Isi artikel minimal 20 karakter/);
  assert.match(js, /window\.confirm\("Terbitkan artikel ini/);
  assert.match(js, /Mengompres gambar/);
});
