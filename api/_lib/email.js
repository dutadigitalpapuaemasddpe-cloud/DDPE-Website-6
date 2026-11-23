"use strict";

const DEFAULT_RECIPIENT = "dutadigitalpapuaemasddpe@gmail.com";

function plainText(value) {
  return typeof value === "string" ? value.replace(/[\r\n\t]+/g, " ").trim() : "";
}

async function sendApplicationNotice(reference, recruitmentTitle, application) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DDPE_NOTIFICATION_FROM;
  const to = process.env.DDPE_NOTIFICATION_TO || DEFAULT_RECIPIENT;
  if (!apiKey || !from) return { status: "not_configured" };

  const lines = [
    "Pendaftaran baru diterima oleh formulir DDPE.",
    "",
    "Nomor referensi: " + plainText(reference),
    "Kesempatan: " + plainText(recruitmentTitle),
    "Nama: " + plainText(application.full_name),
    "Email: " + plainText(application.email),
    "WhatsApp: " + plainText(application.whatsapp),
    "Domisili: " + plainText(application.regency) + ", " + plainText(application.province),
    "Usia: " + String(application.age) + (application.age < 18 ? " (di bawah 18 tahun; data wali dan persetujuan hanya tersedia di dashboard)" : ""),
    "Aktivitas: " + plainText(application.activity),
    "",
    "Jawaban motivasi, minat, dan pengalaman tetap tersedia di dashboard pengurus.",
    "Jangan membalas email ini untuk mengubah status pendaftaran."
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "ddpe-application-" + plainText(reference)
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: plainText(application.email),
        subject: "Pendaftar DDPE baru · " + plainText(reference),
        text: lines.join("\n")
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return { status: "failed" };
    return { status: "sent" };
  } catch (_error) {
    return { status: "failed" };
  }
}

module.exports = { sendApplicationNotice };
