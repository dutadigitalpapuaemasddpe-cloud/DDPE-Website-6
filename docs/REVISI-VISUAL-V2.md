# Revisi visual V2 — 2 November 2026

## Ruang lingkup
Beranda index.html dan seluruh CSS/JavaScript yang dimuat beranda tetap identik dengan paket sebelumnya (diverifikasi SHA-256). Warna, logo, menu utama dan fungsi backend dipertahankan.

## Perubahan
- Halaman dalam memiliki hero dengan hierarki judul yang lebih terkendali serta panel identitas organisasi/pilar.
- Bacaan panjang memakai grid editorial: indeks section di sisi kiri, konten di sisi kanan. Pada ponsel indeks menjadi dua kolom sebelum isi.
- Jarak antarbagian, ukuran heading, lebar bacaan, kartu, alur, FAQ dan status pendaftaran diselaraskan.
- Galeri dokumentasi memakai kolom mengikuti tinggi foto asli; bukan potongan gambar dalam ukuran seragam.
- Foto profil, program, galeri, kartu berita dan artikel menggunakan tinggi otomatis, rasio intrinsik dan object-fit:contain. Logo tetap menggunakan bingkai contain.
- Ukuran intrinsik width/height pada gambar statis diperbarui mengikuti aset agar ruang gambar lebih akurat sebelum pemuatan.
- css/interior.css dimuat hanya pada halaman selain beranda/dashboard. Renderer artikel produksi ditambah kelas dan stylesheet yang sama; query, escaping, otorisasi, dan isi API tidak diubah.

## Verifikasi
12/12 pengujian Node lulus. Tautan lokal/anchor valid, tidak ada ID ganda. SHA-256 beranda dan dependensinya sama dengan versi sebelumnya. Dashboard dan sumber aset tetap dipertahankan.

## Batas verifikasi
Pemeriksaan visual browser pada ukuran layar nyata belum dilakukan karena browser pada sesi sebelumnya tidak menjangkau server pratinjau. Perlu pemeriksaan 360, 390, 768, 1024 dan 1440 px di Live Server/Vercel Preview. Tidak melakukan deployment atau migrasi database.

Perubahan foto ini berlaku pada halaman dalam. Foto beranda tetap mengikuti tampilan sebelumnya sesuai instruksi agar halaman awal tidak berubah.

Laporan REDESIGN-LAPORAN.md mencatat tahap sebelumnya; dokumen ini merupakan catatan perubahan terbaru. Klaim bahwa semua API identik pada laporan lama kini memiliki satu pengecualian: penambahan stylesheet dan kelas pada HTML renderer artikel.
