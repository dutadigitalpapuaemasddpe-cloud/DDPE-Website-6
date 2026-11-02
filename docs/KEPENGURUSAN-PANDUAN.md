# DDPE V7.1 — Direktori & CMS Kepengurusan

Pembaruan ini melanjutkan V7. Semua file dalam paket kode merupakan file lengkap. Pasang seluruh paket sesuai foldernya, bukan hanya HTML atau CSS.

## Pemasangan satu kali

1. Pastikan migrasi V7 sudah terpasang. Jalankan `supabase/migrations/20261102_004_leadership.sql` pada proyek Supabase DDPE. Migrasi menambahkan fungsi simpan dan data awal 16 pengurus; entri leadership yang sudah ada tidak ditimpa.
2. Pasang file paket dan deploy ulang. `npm ci` dan `npm test` menggunakan dependensi V7.
3. Login dengan akun berizin `content_editor` cakupan organisasi. Buka tab **Kelola Kepengurusan**.
4. Periksa daftar 16 personel, unggah foto profil yang benar, dan sunting ringkasan peran bila diperlukan. Data bersumber dari daftar pengguna, masa bakti 2026–2028. Ringkasan peran adalah teks editorial yang dapat disesuaikan.

## Pengelolaan

Form mencakup unit, nama, jabatan, level pimpinan/tim, tahun awal/akhir, urutan, ringkasan, URL atau unggahan foto, dan status posisi. Unggahan menggunakan endpoint media, bucket, kompresi serta izin V7. Foto dipotong proporsional 4:5 dengan titik fokus dekat bagian atas.

Belum ada foto individu yang dapat dipasangkan berdasarkan nama berkas. Direktori memakai monogram inisial; tidak memasangkan foto secara menebak. Upload foto melalui CMS untuk menggantinya.

Semua nama terkonfirmasi berstatus Terisi. Co-Founder adalah Melati Putri Kalean. Jangan mengubah posisi tersebut menjadi kosong. Status **Dalam Tahap Pemilihan** dan **Terbuka** tersedia untuk posisi lain yang benar-benar belum terisi; nama dapat dikosongkan untuk kedua status itu.

Data disimpan sebagai objek `{members:[...]}` pada `site_settings.setting_key = 'leadership'`. Admin mengirim versi data yang terakhir dibaca; fungsi SQL mengunci entri dan menolak penyimpanan jika versi sudah berubah. Audit perubahan dicatat. Hapus personel membutuhkan konfirmasi di dashboard.

Empat halaman publik memiliki daftar awal dalam HTML agar tetap terbaca tanpa JavaScript. Saat API berhasil dimuat, daftar diganti dengan data terbaru. Daftar kosong yang sengaja disimpan tidak digantikan oleh data awal. Jika API gagal, ada pemberitahuan bahwa susunan awal ditampilkan; data statis tidak otomatis mengikuti perubahan database saat situs tidak tersambung.

Kepengurusan dikelola melalui tab khusus, bukan editor section umum. Navbar, fitur berita, formulir dan halaman lain tetap memakai modul V7.

## Validasi

32 tes Node lulus. Simulasi DOM memeriksa memuat direktori, tambah, edit, hapus, pengiriman versi dan sintaks CSS. Validasi mencakup batas tahun, URL gambar, status, unit, hierarki, duplikasi ID, izin editor, serta escaping teks.

Migrasi belum dijalankan pada database produksi, dan tampilan belum diuji langsung di browser. Lakukan uji upload foto, penyimpanan data, dan tampilan desktop/mobile pada deployment preview sebelum publikasi.
