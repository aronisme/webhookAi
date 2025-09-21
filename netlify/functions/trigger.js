const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const chatId = "1296836457"; // Chat ID Boss Aron

// === Ambil semua API Key dari env ===
const apiKeys = [
  process.env.OPENROUTER_KEY1,
  process.env.OPENROUTER_KEY2,
  process.env.OPENROUTER_KEY3,
  process.env.OPENROUTER_KEY4,
].filter(Boolean);

let keyIndex = 0; // round robin

async function callGemini(cmd) {
  let lastError = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[keyIndex];
    keyIndex = (keyIndex + 1) % apiKeys.length;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            {
              role: "system",
              content: `Kamu adalah Ness, asisten pribadi cewek. 
Selalu panggil user dengan sebutan "Boss".
Gaya ramah, santai, penuh emoji.
Tugasmu sekarang: buat pesan singkat untuk perintah ini: "${cmd}".
Hasilkan teks siap kirim ke Boss, tanpa embel-embel "ini pesan sesuai perintah" atau "oke Boss". 
Langsung keluarkan teks finalnya.`,
            },
          ],
        }),
      });

      const data = await res.json();
      console.log("Gemini response:", JSON.stringify(data, null, 2));

      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }

      lastError = new Error(data.error?.message || "Unknown Gemini error");
    } catch (err) {
      lastError = err;
      console.error(`Gemini error with key ${i + 1}:`, err.message);
    }
  }

  return `Boss ✨ Ness hadir 🚀 (AI error: ${lastError?.message || "all keys failed"})`;
}

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const cmd = params.cmd || "sapaan pagi";

    const text = await callGemini(cmd);

    const tgRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const tgData = await tgRes.json();
    console.log("Telegram response:", JSON.stringify(tgData, null, 2));

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
