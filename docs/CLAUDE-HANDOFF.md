# Handoff Claude Code — DDPE Website (status 2026-11-24)

## Arsitektur & koneksi
- Situs statis HTML/CSS/JS di root, tanpa framework. Backend: Vercel Functions di `api/` (helper `api/_lib/`). Database/Auth/Storage: Supabase `khjbkktetfzckxarkggl` (ddpe-official). Login pengurus = Supabase Auth; hak akses = tabel `ddpe_permissions`.
- GitHub `dutadigitalpapuaemasddpe-cloud/DDPE-Website-6`, `main` = production (push = deploy otomatis). Vercel project `ddpe-website-6` (`prj_NzLEI38KnVEUOQNsmmQ5ZVw5PCl8`), domain `ddpe.my.id`. Env Vercel sudah lengkap (jangan dicatat/ditampilkan).
- `/artikel.html` dilayani statis; rewrite di `vercel.json` tidak efektif.

## Commit & deployment terakhir (semua READY, production)
- `072748d` Konten Halaman (dpl_9yvKsXrx…) ← production saat ini. Sebelumnya: `1c04ced` Ruang Redaksi, `739d4c7` Rekrutmen + usia/wali, `a79abb1` layout Ruang Pengurus.
- Perubahan kode lokal belum di-commit: tidak ada. Hanya untracked `.kilo/` (jangan di-commit) dan berkas handoff ini.

## Selesai sesi ini (semua live)
- Desain "Tinta & Emas": `css/dashboard.css`, sidebar navy 240px (9 modul: Konten/Orang/Sistem), menu mobile `js/dashboard-shell.js`. Dashboard memuat `js/dashboard.js` (+ `js/dashboard-content.js`, jembatan `window.DDPEDashboard`).
- Rekrutmen: preset DLDPE/DIDPE/AMEX, status+jadwal, Buka/Tutup/Simpan (Simpan tidak mengubah status), tanggal WIT. Penolakan pendaftar di luar periode ditegakkan di RPC.
- Usia: DLDPE 14, DIDPE 14, AMEX 16, dihitung dari tanggal lahir pada hari daftar (WIT) di `api/_lib/age.js` dan SQL. <18 tahun wajib data+persetujuan wali (tidak masuk email/CSV). SQL `supabase/reconcile/20261124_usia_wali/` 01–03 SUDAH diterapkan di production (rollback: `04_rollback.sql`; backup `ddpe_backup.ag_*_20261124`).
- Ruang Redaksi: form judul/editor/foto sampul, Pengaturan Lanjutan, daftar berstatus, Simpan Draft/Ajukan Review/Terbitkan sesuai izin, progres upload.
- Konten Halaman: alur Halaman → Section → Elemen, penanda lokasi tampil, pratinjau, Terbitkan dengan konfirmasi, cek API publik setelah terbit. Backend hanya satu versi (langsung publik), jadi TIDAK ada draf server.

## Konten Halaman: belum selesai / batasan
- Halaman `struktur.html` memakai direktori Kepengurusan, tidak membaca CMS (Terbitkan dinonaktifkan, kelola lewat Kepengurusan).
- Urutan section hanya berpengaruh untuk section tambahan (`data-cms-extra`); pratinjau hanya meniru kartu, bukan tata letak penuh.
- Belum ada draf server/riwayat versi; bila diperlukan butuh perubahan skema + RPC (izin user dulu).

## Hasil tes
- `npm test`: 68 tes; 62 lulus + 6 tes SQL dilewati tanpa PGlite, 68 lulus dengan `PGLITE_DIR=<path>/node_modules/@electric-sql/pglite` (PGlite bukan dependency repo; pasang di folder sementara). Tes alur: `test/recruitment-manager`, `age-*`, `ruang-redaksi`, `site-content-flow`.
- UI diuji dengan simulasi (Chrome headless + fetch tiruan), desktop & 390px. Production: endpoint publik 200, API admin tanpa login 401.
- BELUM pernah diuji dengan login pengurus asli: tulis artikel/upload gambar, buat & buka periode rekrutmen, pendaftaran nyata <18 tahun, terbitkan Konten Halaman.

## Masalah lama yang masih terbuka
- Tombol suka publik gagal (`article_likes.user_identifier` NOT NULL, JS hanya kirim `device_id`).
- Policy RLS terlalu longgar (`articles`/`media_albums`, storage `ddpe-media`, anon boleh hapus like); Leaked Password Protection Auth belum aktif; `api/engagement.js` memakai tabel yang tidak ada.
- Teks Kebijakan Privasi (`privasi.html`, lewat Konten Halaman) belum menyebut data peserta <18 tahun dan wali.

## Langkah berikutnya (usulan)
1. Uji manual dengan akun pengurus: satu artikel uji, satu periode rekrutmen, satu perubahan kecil Konten Halaman (bisa dikembalikan dengan "Pakai konten bawaan").
2. Tambah paragraf privasi peserta di bawah umur; perbaiki tombol suka dan policy RLS.
3. Pertimbangkan draf/versi untuk Konten Halaman bila pengurus memerlukannya.

## Aturan untuk sesi baru
- Jangan audit ulang hal di atas; skema live ≠ `supabase/migrations/001–004` (JANGAN dijalankan). Perubahan DB: tulis di `supabase/reconcile/<tanggal>_<topik>/` (backup, apply, verify, rollback), uji lokal dulu, minta izin user sebelum production.
- Jangan ubah nama/tipe kolom, status vocab, atau signature RPC tanpa menyesuaikan kode + tes.
- Jangan commit/push/deploy tanpa izin (push ke `main` = production). Jangan simpan secrets/password/data pengurus di repo atau chat; jangan login ke dashboard production atas nama user.

## 2026-11-25 — v8/v9 tampilan, tautan KAMI, Makna Logo
- Tampilan v8 (`css/ddpe-v8.css`, `js/v8.js`) + v9 (bagian akhir file yang sama): slideshow hero, "DDPE dalam angka" (jumlah berita live dari `/api/public-articles` → `total`), pita cerita visi, gerak halus saat digulir.
- Tautan induk KAMI di header/footer (komponen + `scripts/sync-layout.cjs`), bagian `#kami` di beranda & tentang. Halaman baru `makna-logo.html` (teks makna disusun dari unsur yang terlihat; mohon dikonfirmasi pengurus).
- `api/public-articles.js` mengizinkan CORS GET dari karsamuda.my.id (kabar DDPE tampil di halaman Unit Papua KAMI).
- Semua tambahan di luar `data-cms-section`.
