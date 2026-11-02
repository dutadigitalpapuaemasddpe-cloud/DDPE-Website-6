# Redesign institusional — 2 November 2026

Mulai dari [panduan VS Code](docs/MULAI-DI-VSCODE.md), [laporan perubahan](docs/REDESIGN-LAPORAN.md), dan [pemetaan URL](docs/REDESIGN-SITEMAP.md). Catatan di bawah merupakan dokumentasi historis proyek.

# Website Resmi — Duta Digital Papua Emas

**Domain:** ddpe.my.id  
**Versi:** Agustus 2026  

Website profil organisasi (bukan portal pemetaan pengurus).

Catatan arsitektur: repositori ini menggunakan HTML/CSS/JavaScript vanilla dan tidak memiliki folder Next.js `app` atau `pages`. Fitur detail berita dan Media Center karena itu dipasang pada `artikel.html` dan `media.html` agar tetap berjalan pada deployment static Vercel.

---

## Struktur folder

```
ddpe-official/
├── index.html          → Beranda + intro animasi
├── tentang.html        → Profil, visi, nilai
├── struktur.html       → Kepemimpinan & sistem Duta
├── program.html        → Pilar Literasi & Inovasi
├── kegiatan.html       → Aksi / kegiatan
├── media.html          → Media center (PTFI-style)
├── berita.html         → Daftar berita formal
├── artikel.html        → Baca artikel (?id=...)
├── gabung.html         → Coming soon pendaftaran
├── kontak.html         → Kontak resmi
├── tulis-berita.html   → Ruang kerja pengurus (password)
├── css/main.css        → Semua gaya
├── robots.txt          → Aturan crawler dan tautan sitemap
├── sitemap.xml         → Daftar halaman publik ddpe.my.id
├── js/
│   ├── main.js         → Navbar, reveal, menu mobile
	│   ├── theme.js        → Tema Terang/Gelap/Sistem
│   ├── news-config.js  → Password & integrasi (EDIT DI SINI)
│   └── news-store.js   → Data berita + Kompasiana
└── assets/             → Logo, foto tim, twibbon
```

---

## Cara edit di VS Code

1. Buka folder `ddpe-official` di VS Code.
2. Live preview: extension **Live Server** → klik Go Live pada `index.html`.
3. Ganti teks/halaman langsung di file HTML yang sesuai.
4. Ganti warna di `css/site.css` dan `css/main.css` sesuai kebutuhan, lalu cek apakah token warna masih konsisten.
5. Halaman pengurus menggunakan akun Supabase Auth; jangan menyimpan password di file JavaScript.
6. Tambah artikel bawaan di `js/news-store.js` → array `SEED`.
7. Saat menambah atau mengganti gambar/logo, simpan file baru di `assets/` dan update `src`/`alt` pada HTML yang relevan.

### Struktur kerja yang disarankan

- `index.html` dan halaman publik: layout, section, dan copy utama.
- `css/site.css`: styling utama untuk desain modern yang digunakan saat ini.
- `js/site.js`: interaksi umum seperti menu mobile, reveal, dan kecilnya behavior global.
- `js/*.js`: modul UI spesifik seperti berita, form, atau dashboard.
- `assets/`: logo, foto, banner, icon, dan gambar statis website.
- `docs/`: panduan setup, deployment, Pinegrow, dan admin.

### Workflow Pinegrow untuk logo dan gambar

- Simpan aset baru di folder `assets/` dengan nama yang jelas, misalnya `logo-ddpe-2026.jpg`, `banner-tim-ddpe.jpg`.
- Jangan menimpa file lama sebelum logo/gambar baru sudah disetujui.
- Di Pinegrow, pilih elemen gambar lalu ganti `src` ke file baru. Pastikan `alt`, `width`, dan `height` ikut diperbarui.
- Untuk logo header, footer, atau ikon pilar, cek semua file HTML yang memakai aset yang sama agar tidak ada yang tertinggal.
- Setelah gambar atau logo baru masuk, lakukan preview responsif di 360px, 768px, dan 1440px.

### Engagement artikel

Jalankan tambahan SQL pada `supabase-media-schema.sql` untuk membuat tabel likes dan komentar secara additive. Halaman artikel tetap dapat dimuat jika tabel tersebut belum dibuat; jumlah suka akan fallback ke `0` dan komentar ke empty state.

---

## Update ke domain production

Website ini tetap dirilis melalui domain lama `ddpe.my.id` dan `www.ddpe.my.id`. Setiap pembaruan cukup dilakukan pada deployment yang sama; tidak perlu membuat domain baru.

1. Upload folder ini ke GitHub (repo baru, misalnya `ddpe-official`).
2. Vercel → Import Project → pilih repo.
3. Root directory = folder yang berisi `index.html`.
4. Deploy.
5. Domains → pasang `ddpe.my.id` dan `www.ddpe.my.id`.

`robots.txt` dan `sitemap.xml` sudah menggunakan domain production lama.

---

## Halaman pengurus

- URL: `/tulis-berita.html`
- Login memakai email dan password akun Supabase Auth.
- Berita dan album media disimpan ke Supabase saat tabel dan kebijakan aksesnya sudah dikonfigurasi. `localStorage` masih dipakai sebagai data lokal/fallback, sehingga bukan sumber sinkronisasi lintas perangkat.
- Supabase publishable/anon key memang digunakan di frontend; jangan pernah menaruh service role key atau rahasia server di file publik.
- Pastikan Row Level Security (RLS) membatasi perubahan berita dan media hanya untuk pengurus yang berwenang.

---

## Kompasiana

Profil resmi: https://www.kompasiana.com/ddpe  

Artikel dari Kompasiana sudah dimasukkan ke sistem berita website (dengan tautan sumber).

---

## Kontak organisasi

- Email: dutadigitalpapuaemasddpe@gmail.com
- Founder: Rohilman Putra Jagong
- Lokasi: Mimika, Papua Tengah
