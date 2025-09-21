const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function handler(event) {
  try {
    const chatId = "6929677613"; // Chat ID Boss Aron

    // Bisa custom pesan lewat query string ?text=...
    const urlParams = new URLSearchParams(event.queryStringParameters);
    const text = urlParams.get("text") || "Ness coba bikin inspirasi harian ✨";

    // === Panggil Gemini ===
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

    const data = await geminiResp.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Boss, Ness belum dapet inspirasi 😅";

    // === Kirim ke Telegram ===
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    });

    return { statusCode: 200, body: "Triggered Ness OK" };
  } catch (err) {
    console.error("Trigger error:", err);
    return { statusCode: 500, body: "Trigger Error" };
  }
}
