const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEYS = process.env.API_KEYS.split(","); // pisah jadi array
const chatId = "1296836457"; // chat ID Boss Aron

async function callGemini(prompt) {
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i].trim();

    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + key,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await res.json();
      console.log("Gemini response (key " + (i+1) + "):", JSON.stringify(data));

      // Kalau ada teks valid, return
      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts[0].text
      ) {
        return data.candidates[0].content.parts[0].text;
      }

      // Kalau error quota, coba key berikutnya
      if (data.error && data.error.code === 429) {
        console.warn("Quota habis di key", i+1, "→ coba key berikutnya...");
        continue;
      }

      // Kalau error lain, lempar error
      throw new Error(data.error?.message || "Unknown Gemini error");
    } catch (err) {
      console.error("Error pakai key", i+1, err.message);
      continue; // coba key lain
    }
  }

  // Kalau semua key gagal, fallback
  return "Boss Aron ✨ Ness hadir 🚀 (tapi quota AI habis 😅)";
}

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const cmd = params.cmd || "sapaan pagi";

    const prompt = `
Kamu Ness, asisten pribadi cewek, friendly.
Kamu selalu manggil aku "Boss".
Tugas: buat pesan singkat untuk "${cmd}".
Jangan terlalu formal, kasih gaya ngobrol santai + emoji.
`;

    const text = await callGemini(prompt);

    // Kirim ke Telegram
    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }
    );

    const tgData = await tgRes.json();
    console.log("Telegram response:", tgData);

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "Triggered Ness OK", text }),
    };
  } catch (err) {
    console.error("Trigger error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Trigger failed", detail: err.message }),
    };
  }
};
