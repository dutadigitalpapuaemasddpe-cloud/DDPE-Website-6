# Setup Supabase DDPE

Status saat ini: kode dan migrasi disiapkan, tetapi proyek Supabase belum diperiksa atau diubah. Jangan jalankan SQL ini pada database produksi sebelum nama tabel, kolom, policies, bucket, dan backup diperiksa.

## Sebelum mulai

1. Masuk ke project Supabase DDPE yang memang dipakai website. Pastikan project ref cocok dengan konfigurasi yang sudah ada di `js/news-config.js`; jangan menyalin publishable key atau service-role key ke chat.
2. Buka **Database → Backups** dan buat/catat backup yang dapat dipulihkan. Jika tidak ada backup otomatis pada paket aktif, ekspor database/schema melalui alat yang disediakan Supabase dan verifikasi hasil ekspor.
3. Buka **Table Editor** dan **Database → Policies**. Catat skema/policies tabel `articles`, `media_albums`, `article_likes`, `article_comments`, serta bucket Storage yang sudah ada. Jangan drop atau mengganti primary key artikel lama.
4. Jika project ini adalah database produksi, hentikan di sini. Buat/siapkan project uji terpisah dengan persetujuan pemilik, lalu jalankan tahap di bawah pada project uji terlebih dahulu. Preview Vercel tidak boleh diarahkan ke database produksi untuk pengujian.

## Terapkan fondasi pada project uji

1. Buka **SQL Editor → New query**.
2. Tinjau `supabase/migrations/20261020_001_foundation.sql` bersama hasil pemeriksaan schema. Migrasi ini menambah tabel/policy/RPC; ia sengaja tidak mengubah tabel artikel lama. Jika ada nama yang sudah dipakai atau struktur berbeda, sesuaikan secara additive sebelum menjalankan.
3. Jalankan SQL sekali. Pastikan hasil query tidak berisi error. Periksa tabel baru: `site_settings`, `pillars`, `programs`, `recruitments`, `activities`, `site_articles`, `site_article_revisions`, `media_assets`, `public_people`, `ddpe_permissions`, `applications`, `partnership_inquiries`, dan `ddpe_audit_log`.
4. Pada **Storage → Buckets**, gunakan bucket `ddpe-media` yang sudah ada bila cocok. Jika belum ada di project uji, buat bucket publik bernama `ddpe-media`, batasi MIME ke `image/webp`, `image/jpeg`, `image/png`, dan ukuran maksimum 3 MB. Jangan campur dokumen pendaftar ke bucket publik. Upload server memakai service-role; publik hanya membaca objek gambar.
5. Buat akun pengelola pertama melalui **Authentication → Users** dengan email milik orang yang disetujui. Gunakan password manager/fitur undangan Supabase, bukan chat.
6. Salin `supabase/bootstrap-admin.template.sql`, ganti email placeholder di salinan lokal, lalu jalankan sekali di SQL Editor project uji. Template hanya memberikan `access_manager`, `content_editor`, dan `publisher` pada cakupan organisasi. Peninjau dan pengekspor pendaftar tidak diberikan otomatis.
7. Uji RLS memakai akun anonim dan akun uji: artikel terbit dapat dibaca; draf, lamaran, catatan internal, audit, dan daftar izin tidak dapat dibaca anonim. Pastikan editor tidak bisa menulis status `published` lewat REST.

## Auth dan konfigurasi server

1. Buka **Authentication → URL Configuration**. Untuk project uji, masukkan URL Vercel Preview yang sedang dipakai ke **Site URL** dan **Redirect URLs**. Tambahkan domain DDPE produksi hanya saat pemilik mengizinkan tahap produksi; pertahankan `https://ddpe.my.id` dan `https://www.ddpe.my.id`.
2. Di Vercel project settings, isi **Preview environment only**: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable/anon key dari project uji), `SUPABASE_SERVICE_ROLE_KEY`, `DDPE_RATE_LIMIT_SECRET`, dan `DDPE_PUBLIC_MEDIA_BUCKET=ddpe-media`.
3. Service-role key dan rate-limit secret hanya disimpan pada Vercel Server Environment Variables. Jangan isi ke file JS, Pinegrow, browser, atau Git. Nilai contoh nama variable ada di `.env.example`; file itu bukan kredensial siap pakai.
4. `js/news-config.js` menjadi konfigurasi browser yang sudah ada untuk Supabase Auth/publishable key. Pastikan key dan URL-nya berasal dari project uji sebelum menguji Preview. Jangan mengganti project aktif tanpa persetujuan.

## Pemeriksaan wajib sebelum publikasi

- Coba login dengan akun tanpa baris `ddpe_permissions`; API harus menolak akses admin.
- Uji setiap izin menggunakan akun berbeda: editor, penerbit, peninjau, pengekspor, dan pengelola akses. Coba request REST langsung, bukan hanya menyembunyikan tombol.
- Uji submit form, status rekrutmen tutup/buka, duplikasi, rate limit, dan batas penerimaan pada data uji. Coba dua penerimaan bersamaan saat kuota hampir penuh.
- Batas usia resmi harus diisi dari persyaratan yang disahkan. Rekrutmen tidak bisa dibuka tanpa nilai itu. Nilai di bawah 18 ditolak sampai alur persetujuan wali ditinjau dan diimplementasikan.
- Jangan klaim koneksi berhasil sampai log Vercel dan tabel project uji menunjukkan operasi nyata. Tes Node lokal memakai mock dan bukan bukti koneksi Supabase.

## Rollback

Migrasi bersifat additive. Untuk rollback aplikasi, kembalikan deployment ke versi sebelumnya dan biarkan tabel baru tetap ada. Jangan menjalankan `DROP`, menghapus bucket, menghapus baris, atau mengembalikan backup di atas data baru tanpa persetujuan pemilik dan backup terbaru. Jika migration gagal, hentikan publikasi dan tinjau perubahan yang sudah berhasil sebelum mencoba lagi.