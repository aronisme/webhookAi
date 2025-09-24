// ===== Config =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// === Endpoint Note Proxy (Netlify Function) ===
const NOTE_API = "https://whimsical-haupia-4ec491.netlify.app/.netlify/functions/note";

// ===== OpenRouter keys & models =====
const apiKeys = [
  process.env.OPENROUTER_KEY1,
  process.env.OPENROUTER_KEY2,
  process.env.OPENROUTER_KEY3,
  process.env.OPENROUTER_KEY4,
  process.env.OPENROUTER_KEY5,
  process.env.OPENROUTER_KEY6,
  process.env.OPENROUTER_KEY7,
].filter(Boolean);
let keyIndex = 0;

// Daftar model OpenRouter (semua harus mendukung chat)
const models = [
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "moonshotai/kimi-vl-a3b-thinking:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "x-ai/grok-4-fast:free",
];

const modelAliases = {
  dolphin: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  gemini: "google/gemini-2.0-flash-exp:free",
  mistral31: "mistralai/mistral-small-3.1-24b-instruct:free",
  maverick: "meta-llama/llama-4-maverick:free",
  scout: "meta-llama/llama-4-scout:free",
  kimi: "moonshotai/kimi-vl-a3b-thinking:free",
  mistral32: "mistralai/mistral-small-3.2-24b-instruct:free",
  grok: "x-ai/grok-4-fast:free"
};

function getAlias(model) {
  return Object.keys(modelAliases).find(k => modelAliases[k] === model) || model;
}

// ===== Helpers =====
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function typing(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

async function getFileUrl(fileId) {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) throw new Error("Gagal ambil file dari Telegram");
  const filePath = data.result.file_path;
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
}

function extractNumber(s, def = 10) {
  const m = s.match(/(\d{1,3})\b/);
  return m ? parseInt(m[1], 10) : def;
}

async function toBase64(url) {
  const buffer = await (await fetch(url)).arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

async function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
  ]);
}

// ✅ Hanya OpenRouter digunakan untuk semua AI call
async function callOpenRouter(model, messages) {
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[keyIndex];
    keyIndex = (keyIndex + 1) % apiKeys.length;

    try {
      const resp = await withTimeout(fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages }),
      }), 5000);

      const data = await resp.json();
      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
    } catch (err) {
      console.error(`OpenRouter error [${model}]`, err.message);
    }
  }
  return null;
}

// Helper AI untuk parsing perintah catatan
async function callHelperAI(messages) {
  return await callOpenRouter("mistralai/mistral-small-3.2-24b-instruct:free", messages);
}

// ✅ Logika perintah catatan tetap pakai OpenRouter
async function handleNoteCommand(chatId, text) {
  try {
    const { tanggal, jam, waktu } = getWIBTimeInfo();
    const helperPrompt = `
Sekarang ${tanggal}, jam ${jam}, masih ${waktu} (WIB).

Kamu adalah AI parser perintah catatan/jadwal/event.
Balas HANYA dengan:
1. JSON valid salah satu:
   {"action":"add","type":"note","content":"..."}
   {"action":"add","type":"schedule","datetime":"YYYY-MM-DDTHH:mm:ss","content":"..."}
   {"action":"add","type":"event","datetime":"YYYY-MM-DDTHH:mm:ss","content":"..."}
   {"action":"edit","id":"<id>","content":"..."} 
   {"action":"delete","id":"<id>"}
2. Atau string "PASS".

Catatan:
- Gunakan "add" untuk perintah baru.
- Gunakan "edit" kalau user minta ubah detil catatan/jadwal yang sudah ada.
- Gunakan "delete" kalau user mau hapus.
- Jangan tulis teks lain di luar JSON/PASS.

Pesan: "${text}"
    `.trim();

    const result = await withTimeout(
      callHelperAI([{ role: "user", content: helperPrompt }]),
      5000
    );

    if (!result || result.trim() === "PASS") {
      return false;
    }

    if (!result.trim().startsWith("{")) {
      return false;
    }

    const parsed = JSON.parse(result);

    let response;

    if (parsed.action === "add") {
      response = await fetch(NOTE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (response.ok) {
        await sendMessage(chatId, "✅ Oke Boss, sudah aku catat/jadwalkan!");
      } else {
        await sendMessage(chatId, "⚠️ Boss, gagal simpan ke catatan/jadwal.");
      }

    } else if (parsed.action === "edit") {
      response = await fetch(NOTE_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const resultJson = await response.json();

      if (resultJson.status === "success") {
        await sendMessage(chatId, `✏️ Oke Boss, catatan #${parsed.id} sudah diupdate.`);
      } else {
        await sendMessage(chatId, "⚠️ Boss, gagal edit catatan.");
      }

    } else if (parsed.action === "delete") {
      response = await fetch(NOTE_API, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const resultJson = await response.json();

      if (resultJson.status === "success") {
        await sendMessage(chatId, `🗑️ Catatan #${parsed.id} sudah dihapus, Boss.`);
      } else {
        await sendMessage(chatId, "⚠️ Boss, gagal hapus catatan.");
      }

    } else {
      return false;
    }

    return true;
  } catch (err) {
    console.error("handleNoteCommand error:", err);
    return false;
  }
}

function getWIBTimeInfo() {
  const now = new Date();
  const jam = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta"
  });
  const tanggal = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  });

  const hour = parseInt(now.toLocaleString("id-ID", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }));
  let waktu;
  if (hour >= 5 && hour < 12) waktu = "pagi";
  else if (hour >= 12 && hour < 15) waktu = "siang";
  else if (hour >= 15 && hour < 18) waktu = "sore";
  else waktu = "malam";

  return { tanggal, jam, waktu };
}

// ✅ Batasi memory context
const MEMORY_LIMIT = parseInt(process.env.MEMORY_LIMIT, 10) || 10;
const userMemory = {};
const userConfig = {};
const fallbackReplies = [
  "Boss, Ness lagi error mikir nih 😅",
  "Sepertinya server lagi ngambek 🤖💤",
  "Boss, coba tanya lagi bentar ya ✨",
  "Ness bingung, tapi Ness tetap standby buat Boss 😉",
];

function summarizeContext(history) {
  if (history.length <= MEMORY_LIMIT) return history;
  return history.slice(-MEMORY_LIMIT);
}

// ===== Main handler =====
exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: "error", error: "Method Not Allowed" }),
    };
  }

  try {
    if (event.httpMethod === "GET") {
      const url = TELEGRAM_API + "/getMe";
      const response = await fetch(url);
      const text = await response.text();
      return { statusCode: response.ok ? 200 : 500, body: text };
    }

    if (event.httpMethod === "POST") {
      const update = JSON.parse(event.body || "{}");
      const message = update?.message;
      if (!message) return { statusCode: 200, body: "no message" };

      const chatId = message.chat.id;
      const text = (message.text || "").trim();
      const photos = message.photo || [];
      const hasPhoto = photos.length > 0;

      if (text.length > 1000) {
        await sendMessage(chatId, "Boss, pesan terlalu panjang 😅");
        return { statusCode: 200, body: "too long" };
      }

      await typing(chatId);

      // Perketat regex perintah
      if (/\b(catat|catatan|dicatat|note|notes|noted|tulis|simpan|jadwal|jadwalkan|dijadwalkan|schedule|scheduling|appointment?|rapat|meeting|event|acara|kegiatan|ulang\s*tahun|ultah|pesta|remind(er)?|ingatkan|pengingat|alarm)\b/i.test(text)) {
        const handled = await handleNoteCommand(chatId, text);
        if (handled) {
          return { statusCode: 200, body: "note handled" };
        }
      }

      const { tanggal, jam, waktu } = getWIBTimeInfo();

      // === HANDLE PHOTO ===
      if (hasPhoto) {
        try {
          const fileId = photos[photos.length - 1].file_id;
          const photoUrl = await getFileUrl(fileId);
          const caption = message.caption || "Foto terbaru";

          if (!userMemory[chatId]) userMemory[chatId] = [];
          userMemory[chatId].push({
            text: `Boss kirim foto: ${caption}`,
            timestamp: Date.now()
          });

          let reply = null;
          let usedModel = null;

          // Coba model multimodal dari OpenRouter
          // Catatan: Tidak semua model gratis mendukung gambar, tapi kita coba
          outerLoop: for (const model of models) {
            // Skip model yang jelas tidak mendukung vision (opsional)
            // Tapi biarkan OpenRouter handle error jika tidak support
            for (let i = 0; i < apiKeys.length; i++) {
              const apiKey = apiKeys[keyIndex];
              keyIndex = (keyIndex + 1) % apiKeys.length;

              try {
                const payload = {
                  model,
                  messages: [
                    { role: "system", content: "" },
                    {
                      role: "user",
                      content: [
                        { type: "text", text: caption },
                        { type: "image_url", image_url: { url: photoUrl } }
                      ]
                    }
                  ]
                };

                const resp = await withTimeout(fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                  },
                  body: JSON.stringify(payload)
                }), 5000);

                const data = await resp.json();
                if (data?.choices?.[0]?.message?.content) {
                  reply = data.choices[0].message.content.trim();
                  usedModel = model;
                  break outerLoop;
                }
              } catch (err) {
                console.error(`OpenRouter image error [${model}]`, err.message);
              }
            }
          }

          if (!reply) {
            reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
          }

          if (usedModel) {
            reply += `\n(${getAlias(usedModel)})`;
          }

          userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
          await sendMessage(chatId, reply);
          return { statusCode: 200, body: "image handled by openrouter" };
        } catch (err) {
          console.error("Photo error:", err.message);
          await sendMessage(chatId, "Boss ❌ gagal proses gambar");
          return { statusCode: 200, body: "image error" };
        }
      }

      // ==== TEKS BIASA ====
      if (!userMemory[chatId]) userMemory[chatId] = [];
      userMemory[chatId].push({ text: `Boss: ${text}`, timestamp: Date.now() });
      userMemory[chatId] = summarizeContext(userMemory[chatId]);

      const contextText = `
Kamu adalah Ness, asisten pribadi cewek. Selalu panggil user "Boss".
Riwayat percakapan:
${userMemory[chatId]
  .map((m) => `${m.text} (${new Date(m.timestamp).toLocaleString("id-ID")})`)
  .join("\n")}
Pesan terbaru Boss: ${text}
      `.trim();

      let reply = null;
      let usedModel = null;
      const preferModel = userConfig[chatId]?.model;

      // Jika ada preferensi model
      if (preferModel && models.includes(preferModel)) {
        reply = await callOpenRouter(preferModel, [
          { role: "system", content: "" },
          { role: "user", content: contextText }
        ]);
        if (reply) usedModel = preferModel;
      }

      // Jika belum ada reply, coba semua model
      if (!reply) {
        outerLoop: for (const model of models) {
          reply = await callOpenRouter(model, [
            { role: "system", content: "" },
            { role: "user", content: contextText }
          ]);
          if (reply) {
            usedModel = model;
            break outerLoop;
          }
        }
      }

      if (!reply) {
        reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
      }

      if (usedModel) {
        reply += `\n(${getAlias(usedModel)})`;
      }

      userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
      userMemory[chatId] = summarizeContext(userMemory[chatId]);
      await sendMessage(chatId, reply);

      return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
    }
  } catch (err) {
    console.error("Error Ness webhook:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", error: err.message }),
    };
  }
};