# Peta Edit Website DDPE

Dokumen ini menjelaskan area utama di website yang perlu diedit agar pengelolaan konten, gambar, dan layout tetap jelas di masa depan.

## 1. Halaman utama

### index.html
- File layout: halaman beranda
- Sumber teks: HTML statis dan text yang dibaca dari JavaScript untuk konfigurasi umum
- Sumber gambar: `assets/ddpe_logo_new.png`, lima foto carousel dokumentasi/survei Naena Muktipura, dan `assets/logo-pilar1-literasi.jpg` serta `assets/logo-pilar2-inovasi.jpg`
- Diedit di: Pinegrow untuk layout dan HTML; dashboard untuk konten dinamis bila nanti dihubungkan ke Supabase
- Catatan: halaman ini juga menampilkan daftar mitra unggulan

## 2. Halaman umum

### tentang.html
- File layout: profil organisasi
- Sumber teks: statis HTML
- Sumber gambar: foto organisasi dan ikon jika ada
- Diedit di: Pinegrow atau file HTML langsung

### program.html
- File layout: pilar, program, dan AMEX
- Sumber teks: statis HTML
- Sumber gambar: ikon pilar dan gambar pendukung
- Diedit di: Pinegrow atau file HTML langsung

### kegiatan.html
- File layout: jadwal kegiatan dan agenda
- Sumber teks: sebagian statis, sebagian dinamis bila data berasal dari Supabase
- Sumber gambar: foto kegiatan, poster, atau thumbnail
- Diedit di: Pinegrow untuk layout; dashboard untuk item aktivitas yang dikelola server-side

### konsultasi.html
- File layout: informasi ruang lingkup konsultasi dan jalur komunikasi dengan DDPE
- Sumber teks: statis HTML
- Pengiriman permintaan: email resmi melalui tautan mailto; halaman tidak menyimpan data formulir
- Diedit di: file HTML langsung; tautan navigasi umum ditambahkan melalui `js/site.js`

### berita.html
- File layout: daftar berita
- Sumber teks: Supabase / data publik dan HTML fallback
- Sumber gambar: cover berita, thumbnail, media publik
- Diedit di: dashboard/editor dan halaman berita publik untuk layout

### artikel.html
- File layout: halaman berita detail
- Sumber teks: artikel dari Supabase / API publik
- Sumber gambar: cover artikel dan metadata media
- Diedit di: dashboard dan API server; layout tetap di HTML

### kontak.html
- File layout: kontak organisasi dan jalur kemitraan
- Sumber teks: statis HTML
- Sumber gambar: logo dan ilustrasi pendukung jika ada
- Diedit di: Pinegrow atau file HTML langsung

### kemitraan.html
- File layout: formulir minat kemitraan
- Sumber teks: statis HTML + JS validasi form
- Sumber gambar: logo brand / ikon pendukung
- Diedit di: Pinegrow untuk layout; server API untuk pengiriman data

### mitra.html
- File layout: daftar mitra resmi DDPE
- Sumber teks: array partner yang di-render lewat `js/site.js`
- Sumber gambar: logo mitra, atau placeholder awal jika logo belum tersedia
- Diedit di: front-end JS untuk data partner; Pinegrow untuk layout card dan grid

## 3. File layout global

### css/site.css
- File layout: seluruh styling global, token warna, layout, tombol, form, dan grid
- Sumber teks: CSS token + HTML
- Sumber gambar: tidak bersumber data, hanya referensi visual
- Diedit di: Pinegrow atau langsung di CSS

## 4. File JavaScript

### js/site.js
- File layout: menu mobile, reveal motion, bahasa, dan data mitra
- Sumber teks: dictionary bahasa dan data mitra yang didefinisikan di JavaScript
- Diedit di: manual editing atau Pinegrow bila ada perubahan komponen umum

### js/news-config.js
- File layout: konfigurasi publik untuk berita dan storage
- Sumber teks: URL Supabase, bucket publik, dan konfigurasi umum
- Diedit di: manual editing, bukan Pinegrow

### js/dashboard.js
- File layout: dashboard pengurus dan pengelolaan konten
- Sumber teks: API Supabase dan state UI
- Diedit di: manual editing untuk alur backend atau UI administratif

## 5. Folder asset

### assets/
- Sumber gambar utama: logo, tim, pilar, foto, banner, dan media lain
- Diedit di: Pinegrow dan file manager, lalu reference ulang di HTML/JS
- Catatan: simpan file baru dengan nama jelas; jangan mengganti semua aset sekaligus tanpa review

## 6. Dokumentasi dan setup

### docs/
- `PANDUAN-PINEGROW.md` = alur desain dan preview
- `PANDUAN-ASSET-PINEGROW.md` = pengganti logo dan gambar di Pinegrow
- `DEPLOY-VERCEL.md` = proses preview dan deployment aman
- `SETUP-SUPABASE.md` = pengaturan Supabase
- `STATUS-IMPLEMENTASI.md` = status audit dan review

## 7. Aturan pengelolaan konten

- Konten statis: diedit di file HTML/CSS
- Konten dinamis: diedit di dashboard atau Supabase
- Gambar yang dikelola melalui dashboard: sebaiknya diletakkan di bucket storage yang sesuai
- Teks yang perlu bilingual: dikelola lewat dictionary JavaScript agar konsisten di pengunjung dan url yang dipilih
- Halaman baru harus mengikuti pola header, footer, dan class utama yang sudah ada agar aman untuk layout responsif

## 8. Catatan penting untuk Pinegrow

- Struktur section nyata harus tetap dipertahankan di HTML
- Jangan mengubah frontend menjadi framework baru
- Jangan mengandalkan JavaScript yang menulis seluruh halaman sekaligus
- Perubahan visual di Pinegrow tidak otomatis berpindah ke Supabase
- Gambar, teks, dan konten dinamis tetap mengikuti sumber data masing-masing

## 9. Ringkasan cepat

- Layout: `index.html`, halaman statis, `css/site.css`
- Konten publik: HTML + data publik dari Supabase
- Gambar: folder `assets/` dan media storage
- Mitra: data partner di `js/site.js` dan halaman `mitra.html`
- Bahasa: selector bahasa di header, dictionary di `js/site.js`
