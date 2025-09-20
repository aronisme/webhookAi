

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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

    // === Panggil Gemini API ===
    const geminiResp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
        GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
        }),
      }
    );

    const geminiData = await geminiResp.json();
    const reply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Maaf, AI tidak memberikan jawaban.";

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
    console.error("Error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}
