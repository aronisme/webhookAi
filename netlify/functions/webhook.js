const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// === Memori sederhana per user ===
const userMemory = {}; // { chatId: [riwayat pesan] }

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

    // === Simpan riwayat singkat (max 5 pesan terakhir) ===
    if (!userMemory[chatId]) {
      userMemory[chatId] = [];
    }
    userMemory[chatId].push(`Boss Aron: ${text}`);
    if (userMemory[chatId].length > 5) {
      userMemory[chatId].shift(); // buang pesan lama
    }

    // === Buat konteks personal untuk Ness ===
    const contextText = `
Kamu adalah Ness, seorang asisten pribadi cewek.
Karakteristik: friendly, ramah, santai, membantu tapi tidak cerewet.
Kamu selalu memanggil pengguna dengan sebutan "Boss".
Jangan pernah sebut dirimu AI atau robot, cukup sebut dirimu "Ness".
Jangan keluar dari karakter.

Riwayat percakapan terakhir:
${userMemory[chatId].join("\n")}
Pesan terbaru Boss: ${text}
`;

    // === Panggil OpenRouter Gemini ===
    const geminiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          { role: "system", content: "Kamu adalah Ness, asisten pribadi cewek yang selalu manggil user dengan sebutan 'Boss'." },
          { role: "user", content: contextText }
        ],
      }),
    });

    const geminiData = await geminiResp.json();
    console.log("Gemini response:", JSON.stringify(geminiData, null, 2));

    const reply =
      geminiData?.choices?.[0]?.message?.content?.trim() ||
      "Boss, Ness lagi bingung jawabnya nih 😅";

    // Simpan balasan juga ke riwayat
    userMemory[chatId].push(`Ness: ${reply}`);
    if (userMemory[chatId].length > 5) {
      userMemory[chatId].shift();
    }

    // === Balas ke Telegram ===
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
      }),
    });

    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  } catch (err) {
    console.error("Error Ness webhook:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}
