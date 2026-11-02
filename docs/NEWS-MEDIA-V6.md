# DDPE V6 — Berita, artikel, dan dokumentasi

Pasang seluruh isi paket kode pada folder proyek V5 yang sama, atau gunakan proyek lengkap V6. Semua file adalah versi lengkap, bukan potongan/diff. Folder assets tetap diperlukan; aset baru sudah tersedia dalam proyek.

Perubahan:
- Semua referensi HTML/JS ke Foto_lokasi_survei.jpg dan versi gapura nmp-lokasi-survei-2-web.jpg diganti dengan survei_lok_timsesVolunteer.png. Keterangan foto disesuaikan menjadi dokumentasi survei tim Volunteer.
- Foto kartu memakai rasio 16:10, tinggi maksimum 260px, cover dan posisi tengah. Dokumentasi penuh maksimum 420px. Logo tidak mengikuti crop foto.
- Berita utama adalah artikel terbaru dari API, diikuti pencarian, pill kategori, dan grid tiga kolom. Berita utama tidak diulang pada grid default, tetapi tetap dapat ditemukan lewat filter/pencarian. Pagination sembilan kartu per halaman dalam maksimal 50 artikel yang dikembalikan API lama.
- Artikel memakai cover maksimum 460px, ruang baca dan sidebar rekomendasi tiga artikel terbit lain. Kategori sama diprioritaskan, lalu tanggal terbaru. Status kosong/gagal tetap ditampilkan.
- media.html kini halaman dokumentasi nyata. Pengalihan lama pada vercel.json dihapus. kegiatan-terlaksana.html mendapat galeri seragam dan tautan foto utuh.
- Navbar, formulir, dan data organisasi dipertahankan.

Jangan hanya mengganti HTML/CSS: js/news-list.js, js/article-client.js, js/article-enhancements.js, api/article-page.js, dan vercel.json juga diperlukan. Hosting Vercel memakai api/article-page.js untuk artikel.html, sehingga template server ikut diperbarui. Tidak ada perubahan database.

Validasi: 16 tes proyek lulus; simulasi DOM memeriksa headline, pagination, pencarian/kategori, berita kosong/gagal, sanitasi artikel, tautan berbagi, rekomendasi yang mengecualikan artikel aktif, dan fallback rekomendasi. Sintaks CSS/JS serta tautan lokal valid. ZIP diperiksa CRC dan ekstraksi.

Pratinjau visual browser belum terverifikasi karena akses berkas lokal dibatasi. Pengujian perilaku memakai respons API simulasi, bukan database produksi.
