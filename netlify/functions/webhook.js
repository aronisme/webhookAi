const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const GAS_URL = process.env.GAS_URL; // URL WebApp GAS

// === API Keys OpenRouter ===
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

// === Model fallback ===
const models = [
  "google/gemini-2.0-flash-exp:free",
  "x-ai/grok-4-fast:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "moonshotai/kimi-vl-a3b-thinking:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
];

// === Memori per user ===
const userMemory = {}; // { chatId: [riwayat pesan] }

// === Fallback replies ===
const fallbackReplies = [
  "Boss, Ness lagi error mikir nih 😅",
  "Sepertinya server lagi ngambek 🤖💤",
  "Boss, coba tanya lagi bentar ya ✨",
  "Ness bingung, tapi Ness tetap standby buat Boss 😉",
];

export async function handler(event) {
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
    const text = (message.text || "").trim();
    const lower = text.toLowerCase();

    // === Kirim typing action ===
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });

    // === Parser ke GAS ===
    if (lower.includes("catat")) {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "addNote", text }),
      });
      const data = await res.json();
      await sendMessage(chatId, `Boss ✨ ${data.message || "Catatan berhasil disimpan"}`);
      return { statusCode: 200, body: "note saved" };
    }

    if (lower.includes("jadwal")) {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "addSchedule", text }),
      });
      const data = await res.json();
      await sendMessage(chatId, `Boss ✨ ${data.message || "Jadwal berhasil disimpan"}`);
      return { statusCode: 200, body: "schedule saved" };
    }

    if (lower.includes("lihat catatan")) {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "listNotes" }),
      });
      const data = await res.json();
      await sendMessage(chatId, `Boss ✨ Catatan:\n${data.notes?.join("\n") || "(kosong)"}`);
      return { statusCode: 200, body: "notes listed" };
    }

    if (lower.includes("lihat jadwal")) {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "listSchedule" }),
      });
      const data = await res.json();
      await sendMessage(chatId, `Boss ✨ Jadwal:\n${data.schedules?.join("\n") || "(kosong)"}`);
      return { statusCode: 200, body: "schedules listed" };
    }

    // === Kalau bukan perintah → jalankan AI ===
    // Simpan riwayat singkat
    if (!userMemory[chatId]) userMemory[chatId] = [];
    userMemory[chatId].push(`Boss: ${text || "[gambar]"}`);
    if (userMemory[chatId].length > 5) userMemory[chatId].shift();

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

    let reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];

    outerLoop:
    for (const model of models) {
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[keyIndex];
        keyIndex = (keyIndex + 1) % apiKeys.length;

        try {
          const payload = {
            model,
            messages: [
              {
                role: "system",
                content:
                  "Kamu adalah Ness, asisten pribadi cewek yang selalu manggil user dengan sebutan 'Boss'.",
              },
              { role: "user", content: [{ type: "text", text: contextText }] },
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
          if (data?.choices?.[0]?.message?.content) {
            reply = data.choices[0].message.content.trim();
            break outerLoop;
          }
        } catch (err) {
          console.error(`Error pakai ${model} dengan key ${i + 1}:`, err.message);
        }
      }
    }

    // Simpan balasan
    userMemory[chatId].push(`Ness: ${reply}`);
    if (userMemory[chatId].length > 5) userMemory[chatId].shift();

    await sendMessage(chatId, reply);
    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  } catch (err) {
    console.error("Error Ness webhook:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}

// === Helper ===
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
