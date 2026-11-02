 # Audit Awal DDPE

Tanggal pemeriksaan: 20 Oktober 2026.

## Root dan Git

- Root lokal yang dibuka adalah `/Users/mymac/Downloads/ddpe-official 11`, clone GitHub `dutadigitalpapuaemasddpe-cloud/ddpe-official-11` (remote `origin`). Branch dasar `main` berada di commit `0022440` dan cocok dengan `origin/main` saat diperiksa.
- Folder bernama `ddpe-official`, `ddpe-official 2` sampai `ddpe-official 10` juga ada di Downloads, tetapi bukan clone Git. Folder `ddpe-official 11` adalah satu-satunya clone Git dalam kelompok nama tersebut.
- Branch tinjauan lokal: `copilot/ddpe-review-2026-10`. Branch ini tidak mengubah production branch dan belum didorong ke GitHub.
- Perubahan pengguna yang sudah ada sebelum pekerjaan ini: `README.md`, `css/main.css`, `js/news-config.js`, `js/news-store.js`, `.DS_Store`, penghapusan `assets/twibbon-frame.png`, serta file/folder tak terlacak termasuk `pinegrow.json`, `_pgbackup/`, `_pginfo/`, dan ZIP. Perubahan itu dipertahankan; konfigurasi berita/CSS yang telah diedit tidak ditimpa.
- Tidak ditemukan `AGENTS.md`, `copilot-instructions.md`, `package.json`, `.vercel/project.json`, atau `vercel.json` di clone ini. Repository berisi HTML multipage, CSS, JavaScript browser, aset, dan satu SQL schema lama; tidak ada proses build/dependency manager.

## Deployment dan produksi

- Root deployment Vercel, project yang terhubung, production branch, preview settings, dan environment variables tidak dapat dibuktikan dari file lokal. Nama remote GitHub saja bukan bukti bahwa folder ini adalah root produksi. Jangan menghubungkan atau menerbitkan branch ini sebelum pemilik memeriksa pengaturan Vercel.
- Pembacaan publik pada `https://www.ddpe.my.id/` dan `https://www.ddpe.my.id/artikel.html?id=art-mvflzbqe-fpdpa` berhasil. Artikel lama menampilkan artikel AMEX, termasuk lokasi Naena Muktipura/SP 6, kuota 35 relawan, serta tanggal 14–15 November 2026 sebagai waktu pelaksanaan, dengan pendaftaran yang tetap belum dibuka.
- Metadata produksi artikel yang dibaca menyertakan sampul sebagai data URL besar. Ini bukan bukti bahwa jalur unggah lokal aman atau bahwa artikel lokal dan produksi sinkron. Jangan mengubah data artikel atau sampul produksi dalam pekerjaan ini.
- Produksi yang dibaca memiliki halaman beranda dengan intro animasi, metrik organisasi, dan navigasi lama. Halaman dapat berbeda dari checkout; URL/domain produksi tidak akan diubah.

## Supabase dan risiko lokal

- Berkas konfigurasi lokal berisi URL proyek Supabase dan publishable key untuk kode browser. Nilainya tidak disalin ke dokumen ini. Tidak ada bukti akses dashboard, skema aktif, policies aktual, Auth pengguna, atau Storage bucket yang dapat diverifikasi dari checkout.
- `js/news-store.js` menggabungkan artikel seed dan data `localStorage` dengan berita Supabase; ketika remote gagal, konten lokal masih dapat tampil seolah-olah konten publik. Jalur lama `tulis-berita.html` memerlukan evaluasi otorisasi server/RLS sebelum dipakai untuk data baru.
- `supabase-media-schema.sql` adalah petunjuk skema lama, bukan migrasi aman untuk dijalankan. Policy lamanya mengizinkan operasi kepada role authenticated secara luas, dan engagement publik memiliki izin tulis langsung. SQL baru harus additive dan diuji pada proyek uji setelah skema/policies sebenarnya dikonfirmasi.
- Tidak ada secret service-role yang dimasukkan ke dokumentasi. Tidak ada migrasi atau perubahan Supabase yang dijalankan.

## Keputusan kerja

- Pertahankan HTML multipage dan struktur Pinegrow; root lokal digunakan untuk implementasi dan preview saja sampai root Vercel dikonfirmasi.
- Pertahankan ID artikel `art-mvflzbqe-fpdpa` dan URL lama. Tanggal AMEX disimpan sebagai tanggal usulan sampai dikonfirmasi.
- Pisahkan alur baru dari login/penyimpanan lama sampai migrasi dapat diuji, gunakan RLS dan server endpoints untuk data pribadi, dan tampilkan kegagalan koneksi apa adanya.
- Perubahan dibuat pada branch tinjauan lokal. Tidak ada push, perubahan domain, deployment produksi, atau migrasi produksi.