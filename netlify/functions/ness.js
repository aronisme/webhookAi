const fetch = require("node-fetch");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = "1296836457"; // Boss

// URL Web App Google Apps Script
const GAS_URL = process.env.GAS_URL; 

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const message = body.message?.text || "";
    let reply = "";

    // === Parser perintah sederhana ===
    if (/catat/i.test(message)) {
      // contoh: "Ness catat belanja besok jam 3"
      const noteText = message.replace(/ness/i, "").replace(/catat/i, "").trim();
      const payload = {
        cmd: "addNote",
        title: "Catatan Boss",
        content: noteText,
        createdBy: "Boss"
      };
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      reply = `📌 Catatan tersimpan, Boss: "${noteText}"`;

    } else if (/jadwal/i.test(message)) {
      // contoh: "Ness jadwalkan meeting besok jam 10"
      const eventText = message.replace(/ness/i, "").replace(/jadwal/i, "").trim();
      const time = new Date(); // sementara dummy, nanti bisa parse waktu
      time.setMinutes(time.getMinutes() + 1); // buat demo → 1 menit ke depan

      const payload = {
        cmd: "addSchedule",
        event: eventText,
        time: time.toISOString(),
        callback: process.env.NETLIFY_CALLBACK // callback balik ke Ness
      };
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      reply = `⏰ Jadwal ditambahkan: "${eventText}" (${time.toLocaleString()})`;

    } else if (/list catatan/i.test(message)) {
      const payload = { cmd: "listNotes", limit: 5 };
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const notes = data.result || [];
      if (notes.length === 0) {
        reply = "Belum ada catatan, Boss 🗒️";
      } else {
        reply = "📖 Catatan terbaru:\n" + notes.map(n => `- ${n.title}: ${n.content}`).join("\n");
      }

    } else {
      reply = "Boss, Ness siap catat atau buat jadwal 📌⏰";
    }

    // === Kirim balasan ke Telegram ===
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: reply })
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
