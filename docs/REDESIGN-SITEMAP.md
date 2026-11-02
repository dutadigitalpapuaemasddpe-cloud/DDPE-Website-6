# Sitemap dan pemetaan URL

## URL lama → baru

| Lama | Baru |
|---|---|
| `tentang.html#visi-misi` | `visi-misi.html` |
| `struktur.html#pengurus-induk` | `pengurus-induk.html` |
| `struktur.html#pengurus-dldpe` | `pengurus-dldpe.html` |
| `struktur.html#pengurus-didpe` | `pengurus-didpe.html` |
| `program.html#dldpe` | `program-dldpe.html` |
| `program.html#didpe` | `program-didpe.html` |
| `program.html#amex` | `program-amex.html` |
| `kegiatan.html#agenda-mendatang` | `agenda.html` |
| `kegiatan.html#kegiatan-terlaksana` | `kegiatan-terlaksana.html` |
| `terlibat.html#dldpe` | `pendaftaran-dldpe.html` |
| `terlibat.html#didpe` | `pendaftaran-didpe.html` |
| `terlibat.html#volunteer` | `pendaftaran-volunteer.html` |

Menu Program → DDPE Volunteer mengarah ke `program-volunteer.html`; menu Terlibat → Volunteer ke `pendaftaran-volunteer.html`. Anchor lama Volunteer mengikuti konteks asal keterlibatan.

Redirect hanya untuk daftar eksplisit pada js/legacy-routes.js. Hash tidak dikirim ke server sehingga migrasi anchor dilakukan di browser. Query string dipertahankan. Anchor lokal seperti #faq tidak diubah.

## Halaman detail baru

- `program-dldpe.html`
- `program-didpe.html`
- `program-amex.html`
- `program-volunteer.html`
- `pendaftaran-dldpe.html`
- `pendaftaran-didpe.html`
- `pendaftaran-volunteer.html`
- `pengurus-induk.html`
- `pengurus-dldpe.html`
- `pengurus-didpe.html`
- `visi-misi.html`
- `agenda.html`
- `kegiatan-terlaksana.html`

## Halaman overview

- tentang.html: profil dan ringkasan arah
- program.html: katalog dua pilar serta program
- struktur.html: hubungan fungsi
- kegiatan.html: pintu agenda dan arsip
- terlibat.html: pilihan jalur pendaftaran

Halaman berita, artikel, mitra, kemitraan, kontak, konsultasi, daftar, privasi dan dashboard dipertahankan. Sitemap memuat 25 URL publik; halaman dinamis artikel memerlukan id dan tidak dicantumkan sebagai URL kosong.
