# Panduan Asset & Logo di Pinegrow

## Tujuan

Dokumen ini membantu proses penggantian logo, foto, banner, dan aset visual website tanpa merusak struktur file utama.

## Lokasi aset

- Semua gambar utama dan logo website berada di folder `assets/`.
- Nama file sebaiknya ringkas dan konsisten, misalnya:
  - `ddpe_logo_new.png`
  - `Logo_Mitra_Yapis.jpeg`
  - `logo-pilar1-literasi.jpg`
  - `tim-ddpe-banner.jpg`
  - `tim-ddpe-1.jpg`

## Prosedur saat mengganti logo atau gambar

1. Simpan aset baru ke `assets/`.
2. Pindai semua halaman yang memakai gambar lama.
3. Buka file HTML tersebut di Pinegrow.
4. Klik elemen gambar yang ingin diganti.
5. Di panel properti, ubah `src` ke file baru.
6. Pastikan `alt` teks benar dan sesuai konteks.
7. Sesuaikan `width` dan `height` bila perlu.
8. Lakukan preview responsif di ukuran 360, 768, dan 1440 px.

## Mengubah atau menambah foto carousel beranda

1. Buka `index.html` di Pinegrow dan pilih salah satu foto pada area hero.
2. Untuk mengganti foto, ubah kolom **Source** pada panel properti gambar ke file di folder `assets/`. Perbarui juga **Alt text** dan caption di bawah foto.
3. Untuk menambah foto, duplikasi satu elemen `figure.site-hero-slide` di dalam `div.site-hero-track` melalui panel Structure/Navigator.
4. Pada slide baru, ubah `src` gambar, teks `alt`, dan caption. Tidak perlu menambah tombol atau titik indikator; carousel membuat indikator secara otomatis.
5. Simpan dan uji tombol panah serta swipe pada pratinjau mobile.

Foto asli `ddpe_1.JPEG` sampai `ddpe_4.JPEG` tetap disimpan tanpa perubahan. Salinan web `ddpe-01-web.jpg` sampai `ddpe-04-web.jpg` berukuran 2000 × 1333 piksel dan digunakan di website: foto 01–02 untuk carousel hero, foto 03–04 untuk galeri dokumentasi. Carousel memakai rasio 2.12:1 pada desktop, 1.9:1 pada tablet, dan 1.45:1 pada ponsel. Foto diposisikan agak ke atas agar wajah tetap terlihat; periksa crop sebelum mengganti foto karena framing tiap gambar dapat berbeda.

## Panduan foto DDPE

- Untuk foto banner, utamakan foto horizontal dengan resolusi asli sekitar 1600–2000 piksel pada sisi panjang. Rasio 3:2 atau 16:9 biasanya paling mudah disesuaikan dengan carousel.
- Untuk galeri, siapkan variasi: foto tim/kegiatan horizontal, interaksi atau proses kerja, dan satu foto vertikal bila tersedia. Foto vertikal cocok untuk panel pendamping, bukan banner utama.
- Pilih foto yang tajam, cukup terang, dan menunjukkan kegiatan atau konteks dengan jelas. Hindari foto buram dari dalam kendaraan, tangkapan layar, foto terlalu gelap, atau gambar yang subjeknya terpotong.
- Simpan salinan web sebagai JPG atau WebP dengan nama deskriptif dan konsisten, misalnya `ddpe-kunjungan-naena-2026-01.webp`. Jangan menimpa file sumber atau aset lama sebelum versi baru diperiksa.
- Kirim 3–5 foto pilihan dalam satu kelompok, lalu sertakan keterangan singkat untuk tiap foto: kegiatan yang terlihat, lokasi umum, perkiraan waktu, dan caption yang diinginkan.
- Pastikan DDPE memiliki izin untuk memublikasikan foto, terutama jika wajah warga atau anak-anak terlihat jelas. Hindari menyertakan informasi pribadi atau lokasi sensitif yang tidak perlu.
- Tulis teks alternatif berdasarkan isi foto, misalnya “Relawan DDPE berbincang dengan warga saat kunjungan lapangan”, bukan sekadar “foto kegiatan”. Caption dapat memberi konteks tambahan yang tidak terlihat di gambar.
- Sebelum publikasi, periksa crop pada desktop dan ponsel serta pastikan foto dan caption tidak menyiratkan jadwal atau status program yang sudah berubah.

## Tips penting

- Jangan langsung menimpa file lama sebelum file baru diverifikasi.
- Untuk logo utama, cek header, footer, favicon, dan halaman yang memakai brand.
- Untuk banner/hero, pastikan rasio gambar tetap proporsional agar tidak pecah layout.
- Gambar yang terlalu besar bisa memperlambat loading halaman; gunakan ukuran yang masuk akal untuk web.
- Gunakan format yang konsisten: JPG untuk foto, PNG untuk logo dengan transparansi bila dibutuhkan, dan hindari file terlalu berat.

## Panduan cepat untuk layout

- Header brand: `index.html` dan halaman lain yang memakai `site-brand`.
- Logo sumber: `assets/ddpe_logo_new.png`; versi ringan yang dipakai website: `assets/ddpe_logo_web.png`.
- Logo mitra YAPIS: `assets/Logo_Mitra_Yapis.jpeg`, ditampilkan pada kartu mitra.
- Logo AMEX: lambang `assets/logo-amex-icon-web.png` dipadukan dengan wordmark `assets/logo_amex_sdg.jpeg` pada section program AMEX.
- Hero carousel: elemen `img` di dalam `.site-hero-slide` pada `index.html`.
- Pilar program: aset `logo-pilar1-literasi.jpg` dan `logo-pilar2-inovasi.jpg`.
- Foto tim: file `tim-ddpe-*.jpg` yang dipakai pada halaman profil atau organisasi.

## Checklist sebelum final

- Cek semua logo/gambar masih muncul di browser.
- Cek ukuran layar mobile dan desktop.
- Cek judul, caption, dan alt text benar.
- Cek tidak ada gambar broken atau link asset yang rusak.
- Pastikan file baru tidak menambah folder acak di luar `assets/`.

## Catatan pengembangan

Untuk kebutuhan masa depan, lebih baik menjaga satu folder aset yang stabil dan menambahkan subfolder spesifik bila mulai tumbuh, misalnya:

- `assets/brand/`
- `assets/people/`
- `assets/program/`
- `assets/banners/`

Namun, saat ini project masih menggunakan satu folder `assets/` yang sudah dipakai banyak file. Hindari migrasi massal aset tanpa kebutuhan, agar tidak merusak link lama di halaman yang sudah ada.
