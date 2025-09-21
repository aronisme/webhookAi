const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEYS = process.env.API_KEYS.split(","); // banyak key pisah koma
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// === Memori sederhana per user ===
const userMemory = {}; // { chatId: [riwayat pesan] }

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

      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts[0].text
      ) {
        return data.candidates[0].content.parts[0].text;
      }

      if (data.error && data.error.code === 429) {
        console.warn("Quota habis di key", i+1, "→ coba key berikutnya...");
        continue;
      }

      throw new Error(data.error?.message || "Unknown Gemini error");
    } catch (err) {
      console.error("Error pakai key", i+1, err.message);
      continue;
    }
  }

  return "Boss, quota AI Ness habis semua 😅";
}

export async function handler(event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body);
    const message = body?.message;
    if (!message) {
      return { statusCode: 200, body: "no message" };
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    if (!userMemory[chatId]) {
      userMemory[chatId] = [];
    }
    userMemory[chatId].push(`Boss: ${text}`);
    if (userMemory[chatId].length > 5) userMemory[chatId].shift();

    const contextText = `
Kamu Ness, asisten pribadi cewek.
Sifat: friendly, asik.
Kamu selalu manggil aku "Boss".
Jangan sebut dirimu AI, cukup Ness.
Jangan keluar dari karakter.

Riwayat percakapan terakhir:
${userMemory[chatId].join("\n")}
Pesan terbaru Boss: ${text}
`;

    const reply = await callGemini(contextText);

    userMemory[chatId].push(`Ness: ${reply}`);
    if (userMemory[chatId].length > 5) userMemory[chatId].shift();

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    });

    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}
