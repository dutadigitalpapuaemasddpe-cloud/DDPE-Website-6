# Membuka hasil redesign di VS Code

1. Ekstrak ZIP ke folder kerja terpisah, lalu buka folder tersebut melalui File → Open Folder.
2. Buka index.html menggunakan Live Server untuk memeriksa tampilan statis.
3. Uji `program-amex.html`, `program-dldpe.html`, `program-didpe.html`, serta navigasi desktop/mobile.
4. Jalankan `node --test test/*.test.js` dari terminal folder proyek (Node modern, tanpa npm install).
5. Live Server tidak menjalankan folder api. Berita dan rekrutmen akan menampilkan status layanan tidak tersedia. Untuk integrasi nyata, gunakan Vercel Preview dengan environment uji sesuai docs/DEPLOY-VERCEL.md dan docs/SETUP-SUPABASE.md.
6. Jangan menimpa konfigurasi environment atau data produksi hanya untuk pratinjau.

## Mengedit komponen bersama
Edit components/header.html atau components/footer.html lalu jalankan:

```sh
node scripts/sync-layout.cjs
node --test test/*.test.js
```

Markup tetap tersimpan langsung dalam HTML sehingga dapat diedit oleh VS Code/Pinegrow dan dibuka pada hosting statis. Tidak memerlukan fetch HTML saat halaman dimuat. Dashboard dikecualikan dari sinkronisasi.

## Mengedit konten
Konten detail berada di masing-masing HTML. CSS tambahan struktural berada di css/institutional.css dan menggunakan token css/site.css. Backend editor Website masih memiliki allowlist halaman lama; 13 halaman baru diedit melalui file HTML sampai CMS diperluas dalam pekerjaan terpisah. Header artikel produksi dirender oleh api/article-page.js, yang dipertahankan seperti versi asal.

## Pemeriksaan visual sebelum rilis
Uji 360, 390, 768, 1024, 1440, dan 1920 px: menu, fokus keyboard, Escape, FAQ, crop foto, scrollbar horizontal dan formulir. Pemeriksaan ini belum dapat dilakukan pada lingkungan pengerjaan karena browser tidak menjangkau server lokal. Tidak ada deployment produksi dalam paket ini.
