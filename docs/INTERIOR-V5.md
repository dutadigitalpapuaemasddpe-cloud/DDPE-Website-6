# Revisi halaman dalam DDPE — V5

## Pemasangan

Gunakan folder proyek lengkap dari ZIP V5 untuk menerapkan revisi pada seluruh 26 halaman dengan kelas `ddpe-interior`. `index.html` dan desain beranda V4 tetap sama.

File contoh lengkap yang disertakan terpisah:

1. `css/interior.css`
2. `tentang.html`
3. `agenda.html`
4. `js/interior.js`

Jika hanya memasang contoh tersebut ke proyek V4, ganti tiga file pertama dan tambahkan `js/interior.js`. Skrip ini diperlukan untuk indikator sidebar aktif saat menggulir. Navbar memakai aturan bersama dalam `css/institutional.css` dari V4. Semua aset tetap merujuk folder `assets/` proyek.

Mengganti CSS saja belum menyamakan struktur navbar dan breadcrumb pada halaman lainnya. ZIP lengkap sudah memuat seluruh perubahan HTML yang diperlukan.

Urutan stylesheet halaman dalam: `site.css`, `institutional.css`, `motion-home.css`, lalu `interior.css` paling akhir agar aturan lama tidak menimpa tata letak baru.

## Hasil perubahan

- Navbar dua tingkat menggunakan struktur yang sama dengan beranda: lokasi dan utilitas di atas, logo, lima dropdown, serta tombol Terlibat di bawah.
- Hero menjadi banner dengan latar lembut, breadcrumb di atas judul, deskripsi, dan kartu identitas horizontal. Logo memakai ukuran 48–56 piksel pada desktop, tanpa meregangkan tinggi kartu.
- Sidebar kiri tetap terlihat saat menggulir pada desktop. Garis emas dan `aria-current="location"` mengikuti bagian aktif, tautan langsung, serta perpindahan hash. Pada layar kecil, navigasi kembali mengikuti alur halaman.
- Kartu bantuan memakai warna ungu DDPE dan tombol kontak. Halaman Kontak mengarah langsung ke alamat email resmi yang sudah tersedia di proyek.
- Bagian konten ditata sebagai kartu, kotak sorotan, daftar fitur dua kolom, dan langkah bernomor. Dokumen privasi dipecah mengikuti judul bagian yang sudah ada tanpa mengubah isinya.
- Tentang DDPE: profil, dua pilar, nilai kerja, jangkauan, dan tata kelola.
- Agenda: kartu AMEX 14–15 November 2026 dengan blok tanggal, badge Dijadwalkan, logo asli, metadata waktu/wilayah, informasi keikutsertaan, serta tombol detail/kontak. Badge ini menyatakan jadwal yang tersedia, bukan konfirmasi pelaksanaan atau pembukaan pendaftaran.
- Foto dokumentasi mempertahankan proporsi aslinya. Formulir, status rekrutmen, berita dari API, dan atribut data yang sudah ada tetap dipertahankan.

## Template bersama dan artikel

`components/header.html` kini memakai navbar V4. `scripts/sync-layout.cjs` mengenali kelas navbar baru dan juga memperbarui `api/_lib/public-header.js`, yang dipakai respons artikel dari server. `api/article-page.js` hanya disesuaikan pada template navbar, pemuatan CSS, dan skrip navigasi.

Skrip lama `site.js`, `home-news.js`, `legacy-routes.js`, dan `refinement-motion.js` tidak berubah. `js/interior.js` adalah penambahan khusus sidebar. Tidak ada perubahan database, konfigurasi autentikasi, atau deployment.

## Validasi

- 16 tes proyek lulus melalui `node --test test/*.test.js`.
- Pengujian DOM pada 26 halaman untuk menu desktop/seluler, Escape, bahasa, penempatan switcher, tautan sidebar, dan pemuatan berita.
- Pemeriksaan struktur memastikan ID lama, atribut data, kolom formulir, tautan lokal, dan target anchor tetap valid.
- Sintaks CSS dan JavaScript valid; beranda dan skrip inti identik dengan V4.
- ZIP diuji integritas dan ekstraksinya.

Pratinjau visual di browser belum terverifikasi karena browser pengujian membatasi akses berkas lokal. Simulasi DOM memeriksa perilaku, bukan tata letak piksel. Pengujian API menggunakan respons simulasi, bukan data produksi.
