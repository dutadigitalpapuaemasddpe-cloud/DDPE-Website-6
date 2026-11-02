# Beranda DDPE — Portal V4

## Memasang revisi

Salin tiga file berikut ke lokasi yang sama dalam proyek Anda:

1. `index.html`
2. `css/institutional.css`
3. `js/home-news.js`

Ketiganya berisi kode lengkap. `index.html` tetap memakai aset dan skrip lain dari proyek DDPE; file ini bukan halaman mandiri tanpa folder proyek.

Perubahan kecil pada `home-news.js` diperlukan karena versi sebelumnya hanya menampilkan dua artikel dan gambar artikel pertama. Atribut `data-news-layout="cards"` dan `data-news-limit="3"` mengaktifkan tampilan tiga kartu. Tanpa atribut itu, perilaku lama tetap berlaku. Tiga kartu akan muncul jika tersedia setidaknya tiga artikel terbit yang valid; tidak ada berita contoh yang dimasukkan ke database.

## Perubahan tampilan

- Header beranda menjadi utility bar tipis dan navbar satu baris dengan tombol Terlibat.
- Split hero memakai ungu `#24104f`, biru gelap `#1b2a4a`, dan emas `#c89b3c` dari palet DDPE yang ada.
- Foto kelompok `assets/ddpe-01-web.jpg` memakai bingkai dengan rasio asli 2000:1333 dan `object-fit: cover`, sehingga seluruh wajah tetap terlihat tanpa letterbox.
- Lima akses cepat, dua kartu pilar, agenda AMEX 14–15 November 2026, kartu relawan/kemitraan, dan berita tiga kolom.
- Logo AMEX memakai `assets/logo_amex_sdg.jpeg`.
- Layout menyesuaikan layar kecil; menu seluler memakai breakpoint 1080px yang sama dengan skrip lama.
- Animasi masuk dan hover menghormati `prefers-reduced-motion`.

## Kompatibilitas

`js/site.js`, `js/legacy-routes.js`, dan `js/refinement-motion.js` tidak berubah. Atribut menu, penerjemahan navigasi, ID berita, serta pengambilan judul/deskripsi dari CMS dipertahankan. Konten utama tetap berbahasa Indonesia, mengikuti mekanisme terjemahan proyek sebelumnya.

`css/institutional.css` dimuat setelah `css/site.css`. Beranda tidak lagi memuat `css/motion-home.css`; animasi yang diperlukan tersedia dalam institutional.css. File motion-home.css tetap tersedia untuk halaman lama.

Aturan beranda dibatasi oleh kelas `.ddpe-portal` / `.portal-*`; helper `.rd-*` tetap disertakan untuk halaman dalam. Template header halaman dalam tidak diganti pada revisi ini.

## Pemeriksaan

- 12 tes proyek lulus: `node --test test/*.test.js`.
- Sintaks JavaScript dan CSS valid.
- Simulasi DOM lulus untuk lima dropdown, Escape, menu seluler, ID/EN, penempatan satu switcher bahasa, pembaruan copy CMS, dan berita tiga kartu.
- Status berita kosong/gagal, gambar tidak valid/gagal, teks artikel yang harus di-escape, dan kompatibilitas format berita lama sudah diperiksa.
- Tautan lokal, aset, serta ID tujuan valid.
- ZIP diuji integritas CRC dan ekstraksinya.

Pratinjau visual pada browser belum terverifikasi: browser pengujian membatasi pembukaan berkas lokal. Pengujian DOM bukan pengujian layout piksel. API berita diuji memakai respons simulasi; verifikasi data produksi dilakukan ketika proyek dijalankan pada hosting/API DDPE.

Revisi ini tidak menerbitkan perubahan ke website aktif dan tidak mengubah database atau konfigurasi deployment.
