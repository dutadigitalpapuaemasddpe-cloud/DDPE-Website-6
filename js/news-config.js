/**
 * DDPE — Konfigurasi sistem berita
 * Edit file ini untuk mengatur Formspree atau Supabase.
 */
window.DDPE_NEWS_CONFIG = {
  // Endpoint Formspree (opsional) — notifikasi email saat artikel baru
  formspreeEndpoint: "",

  // Supabase — sinkron berita dan media antarperangkat
  supabaseUrl: "https://khjbkktetfzckxarkggl.supabase.co",
  supabaseAnonKey: "sb_publishable_qQyPsHEUOjjckLMQ1Rp66w_tB7OnL0R",
  table: "articles",
  mediaTable: "media_albums",
  storageBucket: "ddpe-media"
};
