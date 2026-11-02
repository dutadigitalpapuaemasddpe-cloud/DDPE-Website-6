# Audit redesign DDPE — 2 November 2026

## Dasar pemeriksaan
Sumber: ZIP ddpe-website-terbaru.zip dan instruksi redesign pengguna. Stack tetap HTML multipage, CSS vanilla, JavaScript vanilla, API Vercel dan Supabase. README lama sebagian tidak mencerminkan implementasi terakhir; docs/STATUS-IMPLEMENTASI.md dijadikan catatan implementasi, bukan bukti koneksi produksi.

BINUS telah dicoba dibuka melalui layanan penelusuran tetapi gagal timeout. Tidak ada klaim tinjauan visual BINUS. Pola institusional mengikuti brief pengguna.

## Temuan sebelum perubahan
- Program DLDPE, DIDPE dan AMEX ditumpuk dalam program.html.
- Kepengurusan induk dan pilar hanya anchor pada struktur.html.
- Jalur rekrutmen bercampur pada terlibat.html; kontrak API data-opportunity harus dipertahankan.
- Agenda dan arsip masih berbagi halaman yang sangat singkat.
- Beranda belum memberi bagian program unggulan AMEX/Volunteer yang cukup kuat.
- Tidak ada breadcrumb pada sebagian besar halaman publik.
- Status menu aktif hanya mengenali rute lama.
- Title/intro 12 halaman lama dapat ditimpa CMS; selector perlu dipertahankan.
- Status implementasi menyatakan AMEX 14–15 November 2026 telah dikonfirmasi, sedangkan halaman kegiatan menyatakan tidak ada agenda. Versi ini menggunakan tanggal pada catatan tersebut; lokasi detail dan pendaftaran tidak diasumsikan.
- Refresh rekrutmen menambahkan tombol berulang dan dapat menyisakan tombol lama setelah kegagalan layanan.
- Caption DDPE foto 04 menyebut warga Naena, tetapi pemeriksaan gambar menunjukkan potret anggota. Caption diperbaiki berdasarkan isi gambar.
- Foto survei 01 berorientasi menyamping; tampilan baru menggunakan foto survei 02. Seluruh sumber tetap disimpan.

## Batas perubahan
Tidak mengubah dashboard.html, js/dashboard.js, api/, Supabase schema/RLS, vercel.json, news-config.js, news-store.js, formulir atau payload backend. Tidak menjalankan migrasi, push, atau deployment.

## Implementasi
13 halaman detail baru; overview program, kegiatan, struktur dan keterlibatan dipisahkan. Beranda disusun ulang. CSS institutional.css memakai token yang ada tanpa mengganti palet. Komponen header/footer disimpan sebagai HTML dan disinkronkan dengan skrip Node tanpa ketergantungan build. Bahasa ID/EN navigasi tetap, dengan fallback Indonesia dan penandaan lang untuk konten yang belum diterjemahkan resmi.
