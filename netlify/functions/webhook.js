const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// === Ambil API keys satu per satu dari environment ===
const apiKeys = [
  process.env.OPENROUTER_KEY1,
  process.env.OPENROUTER_KEY2,
  process.env.OPENROUTER_KEY3,
  process.env.OPENROUTER_KEY4,
  process.env.OPENROUTER_KEY5,
  process.env.OPENROUTER_KEY6,
  process.env.OPENROUTER_KEY7,
].filter(Boolean);

let keyIndex = 0; // round-robin antar key

// === Daftar model fallback ===
const models = [
  "google/gemini-2.0-flash-exp:free",
  "x-ai/grok-4-fast:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "moonshotai/kimi-vl-a3b-thinking:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
];

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

    // === Cek apakah ada gambar ===
    let imageUrl = null;
    if (message.photo && message.photo.length > 0) {
      // ambil resolusi terbesar
      const fileId = message.photo[message.photo.length - 1].file_id;
      const fileResp = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const fileData = await fileResp.json();
      if (fileData.ok) {
        imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
      }
    }

    // === Simpan riwayat singkat (max 5 pesan terakhir) ===
    if (!userMemory[chatId]) {
      userMemory[chatId] = [];
    }
    userMemory[chatId].push(`Boss Aron: ${text || "[kirim gambar]"}`);
    if (userMemory[chatId].length > 5) {
      userMemory[chatId].shift();
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
Pesan terbaru Boss: ${text || "[gambar]"}
`;

    // === Panggil OpenRouter dengan multi-model & multi-key fallback ===
    let reply = "Boss, Ness lagi bingung jawabnya nih 😅";

    outerLoop:
    for (const model of models) {
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[keyIndex];
        keyIndex = (keyIndex + 1) % apiKeys.length; // round robin

        try {
          const payload = {
            model,
            messages: [
              {
                role: "system",
                content:
                  "Kamu adalah Ness, asisten pribadi cewek yang selalu manggil user dengan sebutan 'Boss'.",
              },
              {
                role: "user",
                content: imageUrl
                  ? [
                      { type: "text", text: contextText },
                      { type: "image_url", image_url: { url: imageUrl } },
                    ]
                  : [{ type: "text", text: contextText }],
              },
            ],
          };

          const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });

          const data = await resp.json();
          console.log(`Response from ${model}:`, JSON.stringify(data, null, 2));

          if (data?.choices?.[0]?.message?.content) {
            reply = data.choices[0].message.content.trim();
            break outerLoop; // sukses → keluar dari semua loop
          }
        } catch (err) {
          console.error(`Error pakai ${model} dengan key ${i + 1}:`, err.message);
        }
      }
    }

    // Simpan balasan ke memori
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
