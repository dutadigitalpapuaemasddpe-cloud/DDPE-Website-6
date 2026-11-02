# Revisi V3 — 2 November 2026

Arahan terbaru mengizinkan perubahan beranda, menggantikan batas pada revisi V2.

## Referensi
Beranda https://binus.ac.id/ berhasil diperiksa melalui browser. Pola yang diadaptasi: judul sambutan terpusat di bawah header, carousel lebar dan deretan akses cepat. Warna, logo, teks, foto dan identitas tetap DDPE; tidak menyalin materi BINUS.

## Perubahan
- Hero dua kolom diganti sambutan terpusat dan carousel tiga foto asli.
- Mimika · Papua Tengah ditempatkan simetris di tengah sebagai metadata lokasi terpisah.
- Tombol sebelumnya/berikutnya dan indikator carousel memakai interaksi js/site.js yang sudah ada. Tanpa autoplay agar pengunjung mengontrol perpindahan foto.
- Akses cepat menuju profil, katalog program dan keterlibatan tersedia di bawah carousel.
- Foto galeri beranda memakai tinggi asli dan contain; tidak menggunakan crop pendek yang menghilangkan wajah. Foto carousel juga ditampilkan utuh.
- Logo assets/logo_amex_sdg.jpeg ditampilkan di beranda, katalog program dan halaman khusus AMEX tanpa mengubah file sumber.
- Animasi masuk ringan, perpindahan foto dan hover ditambahkan melalui css/motion-home.css dan js/refinement-motion.js. prefers-reduced-motion dihormati. Konten tetap muncul tanpa JavaScript; fallback membuka konten bila observer berhenti.
- CMS judul/intro beranda tetap memakai selector yang sama.

## Verifikasi
12/12 tes bawaan dan regresi lulus; skrip animasi lulus node --check. Foto sumber/logo ditinjau. Struktur dan aset ZIP diperiksa serta divalidasi kembali setelah disimpan.

Browser dapat menampilkan referensi BINUS, tetapi server lokal proyek belum dapat dijangkau oleh browser cloud; tidak mengklaim pengujian visual semua viewport. Tidak ada deployment, migrasi, atau perubahan data produksi.
