# Status Implementasi DDPE

Terakhir diperbarui: 2 November 2026.
Branch tinjauan: `copilot/ddpe-review-2026-10` (lokal; belum di-push).

Catatan: pembaruan tampilan, empat foto DDPE, editor judul/pengantar halaman, dan jalur notifikasi email sudah dikerjakan lokal. Produksi tidak diubah. Preview lokal memakai server statis; endpoint Vercel dan koneksi Supabase belum tersedia di preview ini.

## Sudah dikerjakan lokal

- Audit awal tersedia di `docs/AUDIT-AWAL.md`. Root Git lokal diketahui; root Vercel dan production branch belum terbukti.
- Beranda, profil, pilar/program, struktur tanpa data personel rekaan, agenda kosong yang jujur, halaman keterlibatan, form pendaftaran/kemitraan, privasi draf, kontak, berita, artikel, dashboard, dan 404 disiapkan dengan HTML multipage.
- Motion ringan ditambahkan pada hero/section/list: reveal saat viewport, hover lift kecil, fallback jika observer tidak aktif, dan dukungan `prefers-reduced-motion`.
- URL lama dipertahankan/diarahkan: `/artikel.html?id=art-mvflzbqe-fpdpa` tetap dikenali; `/media.html` diarahkan ke berita; `/gabung.html` ke jalur keterlibatan; `/tulis-berita.html` ke dashboard.
- Endpoint server Vercel disiapkan untuk baca artikel legacy/baru, metadata artikel server-rendered, gambar cover legacy, rekrutmen publik, submit form, admin, upload, konfigurasi publik, dan audit.
- Dashboard memiliki modul berita/revisi, rekrutmen, pendaftar, kemitraan privat, ekspor, dan akses akun. Izin peninjau kemitraan terpisah dari izin pendaftar.
- Modul Website pada dashboard dapat mengubah judul dan pengantar untuk 12 halaman publik melalui tabel `site_settings` yang sudah ada. Layout, urutan section, dan isi panjang masih statis; berita, rekrutmen, serta kemitraan tetap dikelola di modulnya masing-masing.
- Setelah pendaftaran tersimpan, API mendukung notifikasi Resend ke alamat DDPE dengan nomor referensi dan data kontak dasar. Jawaban minat/motivasi/ketersediaan/pengalaman tidak dikirim lewat email. Notifikasi fail-soft: kegagalan email tidak membatalkan data pendaftar.
- Migrasi additive dan template bootstrap admin ada di `supabase/migrations/20261020_001_foundation.sql` dan `supabase/bootstrap-admin.template.sql`. Tidak ada SQL yang dijalankan.
- `.env.example`, `docs/SETUP-SUPABASE.md`, `docs/DEPLOY-VERCEL.md`, `docs/PANDUAN-PINEGROW.md`, dan `docs/PANDUAN-ADMIN.md` tersedia.

## Bukti pengujian lokal

- `node --check` lulus untuk skrip browser/API yang diperiksa.
- `node --test`: 8/8 lulus (API publik, helper/email fail-soft, simpan pendaftaran mock, allowlist konten publik, dan otorisasi editor). Tes memakai fetch mock; ini bukan bukti koneksi database atau pengiriman email nyata.
- Browser sweep 19 route pada 360, 768, dan 1440 px: 57/57 halaman merespons tanpa overflow horizontal, judul kosong, atau status route error pada server statis lokal. Ikon dan CMS copy juga diuji dengan mock browser.
- Route publik utama dibuka pada browser lokal di 360 px tanpa overflow dan tanpa broken image. Login dashboard lokal dinonaktifkan karena endpoint konfigurasi server tidak tersedia.
- `get_errors` melaporkan tidak ada error pada file HTML/CSS/SQL yang diperiksa. `psql`/Postgres server tidak tersedia; migrasi SQL belum dieksekusi atau diuji terhadap Postgres.
- Pinegrow tidak dijalankan; kompatibilitas visual dalam aplikasi tersebut belum diverifikasi.

## Belum terverifikasi / perlu tindakan pemilik

- Vercel project, root directory, production branch, project/domain bindings, build settings, dan preview URL belum diketahui dari repo. `vercel.json` baru harus ditinjau di Preview sebelum merge.
- Supabase project URL/key aktual, schema dan RLS yang aktif, bucket, Auth redirect URL, serta kapasitas layanan belum diverifikasi. Koneksi Supabase tidak boleh diklaim berhasil.
- Resend belum dikonfigurasi. Pemilik harus mengisi `RESEND_API_KEY` dan alamat `DDPE_NOTIFICATION_FROM` yang telah diverifikasi di Vercel Preview; `DDPE_NOTIFICATION_TO` diarahkan ke email resmi DDPE.
- `js/news-config.js` dan `js/news-store.js` berisi perubahan pengguna yang sudah ada sebelum pekerjaan ini; konfigurasi tersebut tidak ditimpa. Dashboard baru tidak memuat file konfigurasi itu dan hanya memakai `/api/public-config` dari environment Vercel Preview.
- Migrasi membutuhkan pemeriksaan schema produksi dan backup yang dapat dipulihkan sebelum disetujui. Jangan menghapus tabel legacy atau mengganti primary key artikel.
- Waktu pelaksanaan AMEX telah dikonfirmasi untuk 14–15 November 2026. Formulir AMEX tidak dibuka otomatis; batas usia harus disahkan dan peserta di bawah 18 memerlukan alur wali yang belum tersedia.
- Kebijakan privasi masih draf. Pengelola perlu menetapkan retensi/penghapusan dan petugas kontak privasi sebelum menerima data produksi.
- Uji otorisasi API, submission/rate limit, upload Storage, ekspor CSV, kuota simultan, Auth, dan lintas-browser harus dilakukan terhadap project uji Supabase dan Vercel Preview. Tidak ada data pelamar dummy yang dimasukkan.
- Dashboard editor Website baru mencakup judul dan pengantar halaman, belum mengubah seluruh section, galeri, logo, atau layout. Modul kegiatan terstruktur, mitra, dan struktur dinamis juga belum memiliki UI pengelolaan lengkap.

## Aman untuk tahap selanjutnya

1. Pemilik memeriksa root Vercel dan mengonfirmasi bahwa branch ini menghasilkan Preview, bukan deployment produksi.
2. Pemilik memeriksa schema/policies dan backup Supabase, lalu menyetujui project uji.
3. Jalankan migrasi pada project uji, isi environment Preview ke project uji, bootstrap akun awal, lalu uji izin dan alur end-to-end.
4. Lengkapi review privasi dan tanggal/usia AMEX. Setelah Preview disetujui, pemilik dapat memutuskan kapan branch di-merge ke production.