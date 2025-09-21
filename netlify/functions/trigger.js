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

let keyIndex = 0; // round robin antar key

// === Daftar model fallback ===
const models = [
  "x-ai/grok-4-fast:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "moonshotai/kimi-vl-a3b-thinking:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
];

async function callAI(cmd) {
  let lastError = null;

  // Loop semua model
  for (const model of models) {
    // Loop semua key
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
            model,
            messages: [
              {
                role: "system",
                content: `Kamu adalah Ness, asisten pribadi cewek.
Selalu panggil user dengan sebutan "Boss".
Gaya ramah, santai, penuh emoji.
Tugasmu sekarang: buat pesan singkat untuk perintah ini: "${cmd}".
Hasilkan teks siap kirim ke Boss, tanpa embel-embel tambahan.`
              },
            ],
          }),
        });

        const data = await res.json();
        console.log(`Response from ${model}:`, JSON.stringify(data, null, 2));

        if (data.choices && data.choices[0]?.message?.content) {
          return data.choices[0].message.content.trim();
        }

        lastError = new Error(data.error?.message || `Unknown error on ${model}`);
      } catch (err) {
        lastError = err;
        console.error(`Error pakai ${model} dengan key ${i + 1}:`, err.message);
      }
    }
  }

  // Semua model gagal
  return `Boss ✨ Ness hadir 🚀 (AI error: ${lastError?.message || "all models failed"})`;
}

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const cmd = params.cmd || "sapaan pagi";

    const text = await callAI(cmd);

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
