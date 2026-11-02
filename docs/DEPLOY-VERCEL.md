# Preview dan Deployment Vercel

Status audit: folder ini adalah clone GitHub multipage, tetapi tidak ada `.vercel/project.json` atau `vercel.json` sebelumnya. Project Vercel, root directory, production branch, environment, dan domain yang terhubung belum dapat dibuktikan dari checkout. Konfigurasi baru di repository menambahkan route detail artikel dan redirect media; uji pada Preview sebelum merge.

## Siapkan Preview

1. Di Vercel Dashboard, buka project yang saat ini melayani `ddpe.my.id` dan `www.ddpe.my.id`. Catat **Git Repository**, **Root Directory**, **Production Branch**, dan custom domains. Jangan mengubah pengaturan ini saat tahap audit.
2. Pastikan root project benar-benar menunjuk ke repository DDPE ini. Bila root lain, jangan menggabungkan branch ini ke produksi sampai pemilik memutuskan migrasi root dan memeriksa fitur aktif.
3. Branch perubahan lokal bernama `copilot/ddpe-review-2026-10`. Branch belum didorong. Setelah pemilik meninjau diff, push branch melalui GitHub Desktop/VS Code, lalu buat pull request agar Vercel membuat Preview. Jangan merge ke `main` dahulu.
4. Tambahkan environment variables berikut hanya pada **Preview** dan arahkan ke project Supabase uji: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DDPE_RATE_LIMIT_SECRET`, `DDPE_PUBLIC_MEDIA_BUCKET`, `RESEND_API_KEY`, `DDPE_NOTIFICATION_FROM`, dan `DDPE_NOTIFICATION_TO`. Buat secret rate-limit acak lokal dengan password manager/command generator; masukkan API key Resend langsung ke Vercel Settings, jangan ke Git atau chat. Domain pada `DDPE_NOTIFICATION_FROM` harus sudah diverifikasi di Resend. Jangan menambahkan service-role key ke Preview yang menunjuk database produksi.
5. Periksa build/deployment logs dan URL Preview. Uji `/`, `/berita.html`, `/artikel.html?id=art-mvflzbqe-fpdpa`, `/terlibat.html`, `/daftar.html`, `/kemitraan.html`, dan `/dashboard.html`.
6. Kirim satu pendaftaran uji hanya pada project Supabase uji. Pastikan data tersimpan di dashboard dan email notifikasi ringkas tiba di `DDPE_NOTIFICATION_TO`; email tidak menyertakan jawaban motivasi/pengalaman. Pastikan kegagalan layanan email tidak menghapus pendaftaran.
7. Verifikasi source HTML pada URL artikel memiliki title, canonical, `og:title`, `og:description`, dan `og:image` sebelum JavaScript. Pastikan `/media.html` mengarah ke `/berita.html`.

## Menjalankan lokal

Situs statis dapat dibuka dengan Live Server di `index.html`, tetapi endpoint `/api/*` hanya bekerja pada runtime Vercel. Untuk menguji API secara lokal setelah project Supabase uji disiapkan, gunakan Vercel CLI dari root clone:

```sh
npx vercel dev
```

CLI mungkin meminta autentikasi/link project. Jangan setuju menghubungkan project produksi untuk tes. Isi secret pada environment lokal yang diabaikan Git (`.env.local`) atau gunakan environment Preview khusus; jangan mencetak nilainya ke terminal/chat.

## Publikasi dan pemulihan

- Produksi tidak berubah pada tahap ini. Pemilik harus menyetujui URL Preview, hasil uji, root Vercel, dan backup sebelum merge/deploy produksi.
- Pertahankan custom domains `ddpe.my.id` dan `www.ddpe.my.id`; canonical baru memakai `www` secara konsisten.
- Rollback aplikasi dilakukan dengan mempromosikan deployment Vercel sebelumnya atau membatalkan merge. Jangan menghapus tabel/bucket baru sebagai bagian rollback aplikasi.
- Tidak ada perintah migrasi produksi dalam panduan ini. Jalankan migrasi hanya setelah inspeksi schema, backup terverifikasi, hasil Preview disetujui, dan pemilik menyetujui perubahan konkret.