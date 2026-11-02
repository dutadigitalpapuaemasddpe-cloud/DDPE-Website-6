# Panduan Pinegrow

## Buka proyek

1. Buka folder repository yang berisi `index.html`, `css/site.css`, `js/`, dan `assets/` sebagai proyek di Pinegrow.
2. Struktur halaman, urutan section, teks statis, dan class berada di file HTML. Styling baru ada di `css/site.css`. JavaScript perilaku ada di `js/site.js`, `js/news-list.js`, `js/opportunities.js`, dan `js/apply-form.js`.
3. Halaman lama yang belum didesain ulang, seperti `artikel.html` fallback lokal dan `media.html`, masih memiliki struktur lama. Saat deployment Vercel, `artikel.html` dirender oleh `api/article-page.js` dan `media.html` dialihkan ke berita. Jangan menghapus file endpoint/API.

## Mengubah tampilan

- Mengganti foto statis: pilih `src` gambar di HTML, simpan gambar yang sudah disetujui ke `assets/`, lalu ubah `src`, `alt`, `width`, dan `height`. Logo sumber `assets/ddpe_logo_new.png` memiliki salinan ringan `assets/ddpe_logo_web.png` yang dipakai pada header, footer, dan favicon.
- Mengubah warna: token ada di awal `css/site.css` (`--site-purple`, `--site-blue`, `--site-ink`, `--site-surface`). Cek kontras teks/tombol setelah perubahan.
- Memindahkan section: pindahkan blok `<section>` utuh di HTML dan pertahankan `id` yang dipakai link anchor, seperti `dldpe`, `didpe`, dan `amex`.
- Header/footer pada halaman baru ditulis langsung pada HTML agar terlihat di Pinegrow. Tidak ada proses build template yang menimpa berkas; samakan perubahan header/footer secara manual pada halaman yang memakai pola baru.
- Dashboard menyimpan konten di Supabase. Mengubah copy statis di Pinegrow tidak otomatis mengubah data dinamis. Daftar berita dan status rekrutmen dimuat kembali dari API; jangan mengedit isi pendaftar di HTML.

## Preview dan HP

Gunakan preview/responsive mode Pinegrow pada lebar 360 px, 768 px, dan 1440 px. Cek menu mobile, fokus keyboard, judul panjang, label form, preview gambar, dan tidak adanya scroll horizontal. Form dan API membutuhkan server Vercel; preview file lokal tidak menguji koneksi.

## Kirim perubahan

1. Simpan file yang diedit di root repository.
2. Di Source Control VS Code, periksa seluruh diff agar `.env.local`, kredensial, atau data pendaftar tidak ikut.
3. Commit ke branch tinjauan dan push melalui GitHub Desktop/VS Code. Tinjau URL Vercel Preview sebelum merge.

Kompatibilitas aktual dengan aplikasi Pinegrow belum diuji pada sesi ini. Dokumen dan HTML memakai struktur biasa, tetapi pemeriksaan visual di Pinegrow masih perlu dilakukan pengguna.