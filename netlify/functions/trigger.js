const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const chatId = "1296836457"; // chat ID Boss Aron

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const cmd = params.cmd || "sapaan pagi";

    // Prompt untuk Gemini (Ness)
    const prompt = `
Kamu Ness, asisten pribadi cewek, friendly, asik, ramah.
Kamu selalu manggil aku "Boss Aron".
Tugas: buat pesan singkat untuk "${cmd}".
Jangan terlalu formal, kasih gaya ngobrol santai + emoji.
`;

    // Panggil Gemini API
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const geminiData = await geminiRes.json();
    console.log("Gemini response:", JSON.stringify(geminiData, null, 2));

    let text = "Boss Aron ✨ Ness hadir 🚀";
    if (
      geminiData.candidates &&
      geminiData.candidates[0] &&
      geminiData.candidates[0].content &&
      geminiData.candidates[0].content.parts[0].text
    ) {
      text = geminiData.candidates[0].content.parts[0].text;
    }

    // Kirim hasil ke Telegram
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
