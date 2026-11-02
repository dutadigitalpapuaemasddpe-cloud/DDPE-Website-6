# DDPE V7 — Portal berita & CMS

Paket berisi kode lengkap, bukan diff. Salin seluruh file sesuai struktur folder. Gunakan proyek lengkap jika tidak ingin menggabungkan perubahan dengan V6 secara manual. Versi ini belum dideploy dan migrasi belum dijalankan pada Supabase produksi.

## Pemasangan satu kali

1. Cadangkan database dan kode yang sedang digunakan. Proyek ini melanjutkan skema V6 (foundation 20261020_001 dan konfigurasi media yang sudah ada).
2. Jalankan `supabase/migrations/20261102_003_editorial_cms.sql` di SQL Editor Supabase pada proyek DDPE yang benar. Migrasi menambah metadata artikel/revisi, fungsi publikasi, penyimpanan CMS dengan pemeriksaan versi, tabel suka dan komentar. Tidak menghapus artikel lama.
3. Pasang semua file paket V7, termasuk `package.json`, `package-lock.json`, `api/_lib/`, `js/editorial.js`, CSS baru, `data/cms-defaults.json`, halaman publik, `robots.txt`, dan `vercel.json`.
4. Jalankan `npm ci` lalu `npm test`. Vercel juga perlu memasang dependensi `parse5` dari package lock untuk renderer server.
5. Pertahankan environment server: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DDPE_PUBLIC_MEDIA_BUCKET`, dan `DDPE_RATE_LIMIT_SECRET`. Bucket publik dan tabel `media_assets` menggunakan setup V6. Kunci service role hanya untuk server.
6. Deploy ulang Vercel. Membuka HTML dari Finder/Live Server saja tidak menjalankan API, autentikasi, atau SSR.
7. Uji satu draf, preview, publish, edit/revisi, arsip, unggah foto, agenda, perubahan kartu, serta komentar sebelum digunakan pengurus.

## Urutan file yang diminta

- Tahap 1: `api/article-page.js`, `artikel.html`, `js/article-client.js`.
- Tahap 2: `api/admin.js`, `api/public-site-content.js`.
- Tahap 3: `dashboard.html`, `js/dashboard.js`, `js/site.js`.

Ketiga tahap memiliki dependensi bersama dan harus dipasang sebagai satu rilis. File pendukung terdapat dalam paket lengkap; jangan memasang hanya delapan file tersebut.

## Ruang redaksi

Masuk ke `dashboard.html` dengan akun pengurus yang sudah diberi izin. Editor dapat membuat dan mengedit draf, memasukkan gambar sampul/sisipan, memformat H2/H3, tebal, miring, daftar, kutipan dan tautan. Slug dibuat dari judul sampai slug diedit manual atau draf disimpan. Nama penulis, profil penulis, caption, alt, tags dan meta description tersimpan bersama revisi.

Tombol Preview membuka pratinjau draf lokal dalam dialog terisolasi. Gambar sampul yang baru dipilih diunggah ketika draf disimpan; simpan draf sebelum memeriksa sampul baru dalam Preview. Preview tidak menerbitkan berita. Tombol Terbitkan sekarang menjalankan simpan → ajukan → publikasi dan hanya muncul untuk akun yang memiliki `content_editor` sekaligus `publisher` dalam cakupan organisasi. Penerbit terpisah dapat menerbitkan pengajuan dari daftar.

Edit artikel terbit membuat revisi; artikel publik tetap memakai versi lama sampai revisi diterbitkan. Tanggal terbit pertama dipertahankan, sedangkan `dateModified` mengikuti pembaruan publik. Slug sebaiknya tetap dipertahankan setelah publikasi: URL dengan ID lama tetap berfungsi, tetapi versi ini belum menyimpan riwayat alias jika slug sengaja diganti.

Arsipkan menghapus berita dari tampilan publik secara reversibel, termasuk mencegah salinan artikel lama muncul kembali. Artikel arsip dapat diedit dan diajukan kembali. Tidak tersedia penghapusan permanen artikel dari dashboard.

## Agenda dan halaman

Tab Kegiatan & agenda menyediakan tambah/edit/hapus, tanggal/waktu WIT, lokasi, status Akan datang/Terlaksana, gambar, deskripsi, teks dan link tombol. Setiap kegiatan disimpan sebagai entri `cms_event:<id>` di `site_settings`. Halaman agenda menampilkan status Akan datang; dokumentasi/media menampilkan Terlaksana; kegiatan dan beranda menampilkan keduanya. Hapus kegiatan membuat tombstone agar konflik perubahan tetap terdeteksi.

Migrasi menyiapkan satu agenda awal AMEX 14–15 November 2026 dari informasi proyek. Jam belum dikonfirmasi dan disimpan sebagai 00:00; tampilan publik menyembunyikan jam 00:00. Pengurus dapat menetapkan jam yang benar melalui dashboard. Status Terlaksana diubah manual setelah acara selesai.

Tab Konten halaman menyediakan judul/pengantar dan section/kartu terstruktur untuk 20 halaman. Konten awal diimpor dari V6 melalui `data/cms-defaults.json`. Section asli tetap tampil sebelum halaman disimpan; setelah disimpan, section yang dikelola memakai komponen kartu seragam. Formulir pendaftaran, daftar berita dinamis, navigasi dan fungsi khusus tetap menggunakan modulnya sendiri. Menambah/menghapus section atau kartu, mengganti foto dan tombol dilakukan melalui formulir; tidak ada input HTML mentah.

Perubahan halaman tersimpan per halaman (`cms_page:<file>`) di `site_settings`. Jika pengurus lain sudah menyimpan versi baru, simpan ditolak dengan pesan konflik; muat ulang untuk menggunakan versi terbaru. Konten halaman umum dimuat melalui JavaScript, sementara artikel dirender penuh oleh server.

## Komentar dan suka

Suka disimpan per identitas browser, dengan pembatasan frekuensi berdasarkan sidik alamat jaringan. Jumlah suka bukan hitungan orang unik. Komentar masuk sebagai pending, belum terlihat publik; penerbit menyetujui atau menyembunyikannya di tab Moderasi komentar. Tidak ada penyimpanan sukses palsu ketika server gagal.

## SEO artikel

SSR dan browser memakai renderer serta allowlist HTML yang sama: H2/H3, strong/em, blockquote, daftar, tautan HTTPS/mailto, figure, gambar dan caption. Script, event handler, iframe, SVG dan URL berbahaya dibuang. Metadata title, description, canonical, OpenGraph, Twitter Card dan NewsArticle berasal dari artikel terbit. ID lama tetap dapat dipakai; canonical dan tautan berita menggunakan slug bila tersedia.

Sitemap artikel dinamis tersedia di `/sitemap-news.xml` dan dicantumkan pada robots.txt. Sitemap hanya berisi artikel terbit (batas standar satu sitemap 50.000 URL). Setelah deployment, daftarkan sitemap pada Google Search Console dan periksa beberapa URL dengan Rich Results Test. Structured data membantu mesin pencari memahami artikel; tidak menjamin indeks, ranking atau rich result.

Referensi: https://developers.google.com/search/docs/appearance/structured-data/article

## Validasi paket

27 tes Node lulus: keamanan HTML/JSON-LD, privasi draf, arsip/legacy, izin penerbit, konflik CMS, ukuran payload, API lama dan tautan lokal. Simulasi DOM terpisah memeriksa sinkronisasi renderer, tombol publikasi, slug, penyimpanan section, tanggal WIT, headline dan CSS.

Belum dilakukan: eksekusi migrasi pada PostgreSQL/Supabase nyata, pengujian end-to-end dengan akun/database produksi, pemeriksaan visual browser dan pemeriksaan langsung Google. Pengujian API menggunakan respons tiruan. Lakukan pemasangan dan uji penerimaan sesuai langkah di atas.
