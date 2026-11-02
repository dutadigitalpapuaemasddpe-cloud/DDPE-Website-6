# Panduan Pengurus

## Masuk dan izin

Gunakan akun individual di `/dashboard.html`. Login Supabase Auth saja tidak memberi akses. Administrator pertama harus di-bootstrap melalui prosedur tepercaya pada `docs/SETUP-SUPABASE.md`. Jangan membagikan password atau service-role key.

Izin teknis berbeda dari jabatan. Pengelola akses dapat menambahkan akun Auth yang sudah ada, memberi cakupan organisasi/pilar/program/angkatan, dan mencabut izin. Pengelola akses tidak otomatis dapat membaca pendaftar atau kemitraan; izin `application_reviewer`, `application_exporter`, dan `partnership_reviewer` harus diberikan terpisah. Pengelola akses terakhir tidak dapat dicabut.

## Konten

- Editor menyimpan berita sebagai draf lalu mengajukannya. Penerbit memeriksa dan menerbitkan. Perubahan artikel terbit menjadi revisi; versi terbit tidak diubah langsung.
- Modul **Website** dapat mengubah judul dan pengantar pada halaman publik yang terdaftar. Struktur section, layout, dan isi panjang halaman masih mengikuti HTML; berita, artikel, program rekrutmen, dan data mitra mempunyai jalur masing-masing.
- Gambar dapat dipilih atau ditarik ke area unggah. Isi alt text; dashboard mengompres gambar, memperlihatkan progres, dan mengisi URL hanya setelah file serta metadata Storage tersimpan.
- Simpan program/angkatan sebagai tertutup. Isi syarat usia hanya dari dokumen resmi. Penerbitan ditolak tanpa usia minimum yang disahkan; usia di bawah 18 juga memerlukan alur persetujuan wali yang belum tersedia.
- Agenda kosong berarti belum ada agenda publik yang dikonfirmasi, bukan kegagalan halaman.

## Pendaftar dan kemitraan

Peninjau hanya melihat cakupan yang diberikan. Status dapat ditinjau, diterima, atau ditolak. Kuota mengacu pada jumlah yang diterima; server mengunci penerimaan agar dua peninjau tidak melampaui kuota. Ekspor CSV hanya untuk izin ekspor dan dicatat pada audit log.

Pendaftaran yang tersimpan mengirim notifikasi ringkas melalui Resend jika `RESEND_API_KEY` dan `DDPE_NOTIFICATION_FROM` sudah dikonfigurasi. Notifikasi diarahkan ke `DDPE_NOTIFICATION_TO` (default: email resmi DDPE) dan hanya memuat referensi serta data dasar; jawaban motivasi/pengalaman tetap di dashboard. Status email terlihat di kartu pendaftar. Pendaftaran tetap tersimpan jika layanan email gagal.

Tautan email/WhatsApp pada kartu peninjau hanya membuka aplikasi pesan; tindakan itu tidak mengubah status pemberitahuan menjadi terkirim. Data formulir tidak ditampilkan pada halaman publik. Jangan aktifkan formulir produksi sebelum draf kebijakan privasi disahkan, retensi ditetapkan, dan alamat pengirim Resend diverifikasi.