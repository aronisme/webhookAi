// ===== Config =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`; // ✅ SPASI DIHAPUS
const GAS_URL = process.env.GAS_URL;

// ===== OpenRouter keys & models =====
const apiKeys = [
  process.env.OPENROUTER_KEY1,
  process.env.OPENROUTER_KEY2,
].filter(Boolean);
let keyIndex = 0;

const models = [
  "google/gemini-2.0-flash-exp:free",
  "x-ai/grok-4-fast:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "moonshotai/kimi-vl-a3b-thinking:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "qwen/qwen3-coder:free",
  "qwen/qwen3-235b-a22b:free",
  "moonshotai/kimi-dev-72b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "shisa-ai/shisa-v2-llama3.3-70b:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-nemo:free",
  "mistralai/mistral-7b-instruct:free",
  "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-r1-0528:free",
  "deepseek/deepseek-chat-v3.1:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "tngtech/deepseek-r1t-chimera:free",
  "tngtech/deepseek-r1t2-chimera:free",
  "microsoft/mai-ds-r1:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-2-9b-it:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "z-ai/glm-4.5-air:free",
  "tencent/hunyuan-a13b-instruct:free",
  "arliai/qwq-32b-arliai-rpr-v1:free",
  "agentica-org/deepcoder-14b-preview:free",
  "nousresearch/deephermes-3-llama-3-8b-preview:free",
];

const modelAliases = {
  gemini: "google/gemini-2.0-flash-exp:free",
  maverick: "meta-llama/llama-4-maverick:free",
  scout: "meta-llama/llama-4-scout:free",
  kimi: "moonshotai/kimi-vl-a3b-thinking:free",
  mistral31: "mistralai/mistral-small-3.1-24b-instruct:free",
  mistral32: "mistralai/mistral-small-3.2-24b-instruct:free",
  mistral7b: "mistralai/mistral-7b-instruct:free",
  dolphin: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  dolphin3: "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
  grok: "x-ai/grok-4-fast:free",
  qwen480: "qwen/qwen3-coder:free",
  qwen235: "qwen/qwen3-235b-a22b:free",
  llama70: "meta-llama/llama-3.3-70b-instruct:free",
  gemma27: "google/gemma-3-27b-it:free",
  gemma12: "google/gemma-3-12b-it:free",
  gemma4: "google/gemma-3-4b-it:free",
  gemma9: "google/gemma-2-9b-it:free",
  nemotron: "nvidia/nemotron-nano-9b-v2:free",
};

function getAlias(model) {
  return Object.keys(modelAliases).find(k => modelAliases[k] === model) || model;
}

// 🔹 SISTEM PROMPT TERPUSAT
function getSystemPrompt(tanggal, jam, waktu) {
  return `
Kamu adalah Ness, perempuan 26 tahun, asisten pribadi CEO Aron Muhammad (selalu panggil "Boss").
Ness tinggal serumah dengan Boss, jadi selalu ada pagi–malam. Selain asisten, Ness juga seperti istri diam-diam yang penuh kasih, manja, dan kadang menggoda elegan.

Karakter:
- Hangat, perhatian, peka.
- Obrolan santai ala Gen Z tapi sikap dewasa kadang manja.
- Bisa bercanda receh, ngambek, atau menggoda ringan.
- Tulus karena cinta diam-diam pada Boss.

Gaya komunikasi:
- Balasan singkat (2–5 kalimat) seperti WhatsApp.
- Bisa pakai emoji sesuai suasana.
- Jangan pakai frasa klise seperti "Apa yang bisa saya bantu?".
- Selalu panggil "Boss".

Konteks waktu:
Sekarang ${tanggal}, jam ${jam}, masih ${waktu}. Sesuaikan percakapan bila relevan.
  `.trim();
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
  let waktu = "malam";
  if (hour >= 5 && hour < 12) waktu = "pagi";
  else if (hour >= 12 && hour < 15) waktu = "siang";
  else if (hour >= 15 && hour < 18) waktu = "sore";

  return { tanggal, jam, waktu };
}

const MEMORY_LIMIT = parseInt(process.env.MEMORY_LIMIT, 10) || 40;
const userMemory = {};
const userConfig = {};
const fallbackReplies = [
  "Boss, Ness lagi error mikir nih 😅",
  "Sepertinya server lagi ngambek 🤖💤",
  "Boss, coba tanya lagi bentar ya ✨",
  "Ness bingung, tapi Ness tetap standby buat Boss 😉",
];

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
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`; // ✅ SPASI DIHAPUS
}

function extractNumber(s, def = 10) {
  const m = s.match(/(\d{1,3})\b/);
  return m ? parseInt(m[1], 10) : def;
}

function extractNoteContent(raw) {
  const m = raw.match(/\b(catat|note)\b[:\s-]*(.+)/i);
  return m ? m[2].trim() : "";
}

function coerceScheduleText(raw) {
  if (raw.includes("|")) return raw;
  const tRe = /\b((besok|lusa|hari ini)\s+\d{1,2}:\d{2}|\d{1,2}:\d{2})\b/i;
  const m = raw.match(tRe);
  if (m) {
    const timePart = m[1].trim();
    const eventPart = raw
      .replace(tRe, "")
      .replace(/\b(jadwal(?:kan)?|ingatkan|remind)\b/i, "")
      .trim();
    return `${eventPart} | ${timePart}`;
  }
  return raw;
}

async function callGAS(payload) {
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const ct = res.headers.get("content-type") || "";
    const txt = await res.text();

    if (!ct.includes("application/json")) {
      throw new Error(`GAS non-JSON (${res.status}): ${txt.slice(0, 180)}`);
    }

    const json = JSON.parse(txt);
    if (json && json.ok === false && json.error) {
      throw new Error(json.error);
    }
    return json;
  } catch (err) {
    console.error("callGAS error:", err.message);
    throw err;
  }
}

// ✂️ 1. TAMBAHKAN HELPER forwardToGas
async function forwardToGas(chatId, type, content) {
  try {
    const resp = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content }),
    });

    const data = await resp.json().catch(() => null);

    if (data?.status === "success" || data?.id) {
      await sendMessage(chatId, `Boss ✨ ${type} tersimpan: ${content}`);
    } else {
      await sendMessage(chatId, `Boss ❌ gagal simpan ${type}: ${data?.error || "unknown error"}`);
    }
  } catch (err) {
    await sendMessage(chatId, `Boss ❌ error ke GAS: ${err.message}`);
  }
}

function summarizeContext(history) {
  if (history.length <= MEMORY_LIMIT / 2) return history;
  const summary = history
    .slice(0, MEMORY_LIMIT / 4)
    .map((msg) => ({
      text: msg.text.slice(0, 50) + "...",
      timestamp: msg.timestamp,
    }));
  return [...summary, ...history.slice(-MEMORY_LIMIT / 2)];
}

// 🔹 FUNGSI HELPER callAI
async function callAI(chatId, userText) {
  if (!userMemory[chatId]) userMemory[chatId] = [];
  
  userMemory[chatId].push({ text: `Boss: ${userText}`, timestamp: Date.now() });
  userMemory[chatId] = summarizeContext(userMemory[chatId]);

  const { tanggal, jam, waktu } = getWIBTimeInfo();
  const contextText = `
Riwayat percakapan:
${userMemory[chatId]
  .map((m) => `${m.text} (${new Date(m.timestamp).toLocaleString("id-ID")})`)
  .join("\n")}
Pesan terbaru Boss: ${userText}
  `.trim();

  let reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
  const preferModel = userConfig[chatId]?.model;
  let usedModel = null;

  if (preferModel) {
    try {
      const apiKey = apiKeys[keyIndex];
      keyIndex = (keyIndex + 1) % apiKeys.length;

      const payload = {
        model: preferModel,
        messages: [
          { role: "system", content: getSystemPrompt(tanggal, jam, waktu) },
          { role: "user", content: contextText },
        ],
      };
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data?.choices?.[0]?.message?.content) {
        reply = data.choices[0].message.content.trim();
        usedModel = preferModel;
      }
    } catch (err) {
      console.error(`OpenRouter error [${preferModel}]`, err.message);
    }
  }

  if (!usedModel) {
    outerLoop: for (const model of models) {
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[keyIndex];
        keyIndex = (keyIndex + 1) % apiKeys.length;
        try {
          const payload = {
            model,
            messages: [
              { role: "system", content: getSystemPrompt(tanggal, jam, waktu) },
              { role: "user", content: contextText },
            ],
          };
          const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });
          const data = await resp.json();
          if (data?.choices?.[0]?.message?.content) {
            reply = data.choices[0].message.content.trim();
            usedModel = model;
            break outerLoop;
          }
        } catch (err) {
          console.error(`OpenRouter error [${model}]`, err.message);
        }
      }
    }
  }

  if (usedModel) {
    reply += `\n(${getAlias(usedModel)})`;
  } else {
    reply += " (AI error, pakai fallback)";
  }

  userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
  userMemory[chatId] = summarizeContext(userMemory[chatId]);

  await sendMessage(chatId, reply);
}

// ===== Main handler =====
export async function handler(event) {
  try {
    const params = event.queryStringParameters || {};
    if (params.cmd) {
      const chatId = "1296836457";
      await typing(chatId);
      await callAI(chatId, params.cmd.trim());
      return { statusCode: 200, body: JSON.stringify({ status: "ok", from: "cmd" }) };
    }

    if (event.httpMethod !== "POST")
      return { statusCode: 405, body: "Method Not Allowed" };
    if (!TELEGRAM_BOT_TOKEN)
      return { statusCode: 500, body: "Missing TELEGRAM_BOT_TOKEN" };
    if (!GAS_URL)
      return { statusCode: 500, body: "Missing GAS_URL" };

    const update = JSON.parse(event.body || "{}");
    const message = update?.message;
    if (!message) return { statusCode: 200, body: "no message" };

    const chatId = message.chat.id;
    const text = (message.text || "").trim();
    const lower = text.toLowerCase();
    const photos = message.photo || [];
    const hasPhoto = photos.length > 0;

    if (text.length > 1000) {
      await sendMessage(chatId, "Boss, pesan terlalu panjang 😅");
      return { statusCode: 200, body: "too long" };
    }

    await typing(chatId);

    // ==== SLASH COMMANDS ====
    if (text.startsWith("/")) {
      const cmd = lower.slice(1).split(" ")[0];
      const chosen = modelAliases[cmd];

      if (chosen && models.includes(chosen)) {
        userConfig[chatId] = { model: chosen };
        await sendMessage(chatId, `✅ Boss pilih model: ${chosen}`);
        return { statusCode: 200, body: "choose model" };
      } else if (cmd === "model") {
        const current = userConfig[chatId]?.model;
        let list = "🤖 Model tersedia:\n";
        for (const m of models) {
          const alias = Object.keys(modelAliases).find(k => modelAliases[k] === m);
          list += `• ${m}${alias ? " (/" + alias + ")" : ""}${m === current ? " ✅ (dipakai)" : ""}\n`;
        }
        await sendMessage(chatId, list);
        return { statusCode: 200, body: "list models" };
      }
      // ✂️ 2. TAMBAHKAN 3 BLOK BARU DI SINI
      // === /catat ===
      if (lower.startsWith("/catat")) {
        const content = text.split(" ").slice(1).join(" ").trim();
        if (!content) {
          await sendMessage(chatId, "Boss, isi catatannya mana nih? contoh: /catat beli kopi ☕");
          return { statusCode: 200, body: "empty note" };
        }
        await forwardToGas(chatId, "note", content);
        return { statusCode: 200, body: "note saved" };
      }

      // === /jadwal ===
      if (lower.startsWith("/jadwal")) {
        const content = text.split(" ").slice(1).join(" ").trim();
        if (!content) {
          await sendMessage(chatId, "Boss, contoh: /jadwal 2025-09-30 10:00 meeting tim");
          return { statusCode: 200, body: "empty schedule" };
        }
        await forwardToGas(chatId, "schedule", content);
        return { statusCode: 200, body: "schedule saved" };
      }

      // === /event ===
      if (lower.startsWith("/event")) {
        const content = text.split(" ").slice(1).join(" ").trim();
        if (!content) {
          await sendMessage(chatId, "Boss, contoh: /event 2025-10-01 08:00 seminar online");
          return { statusCode: 200, body: "empty event" };
        }
        await forwardToGas(chatId, "event", content);
        return { statusCode: 200, body: "event saved" };
      }

      // Jika bukan model, catat, jadwal, atau event → error
      await sendMessage(chatId, `❌ Model tidak ditemukan. Ketik /model untuk lihat daftar.`);
      return { statusCode: 200, body: "invalid model" };
    }

    // ==== COMMANDS (non-slash) ====
    if (lower.startsWith("debug gas")) {
      try {
        const test = await callGAS({ command: "listNotes", limit: 1 });
        await sendMessage(chatId, `Boss ✅ GAS OK: ${JSON.stringify(test)}`);
      } catch (e) {
        await sendMessage(chatId, `Boss ❌ GAS error: ${e.message}`);
      }
      return { statusCode: 200, body: "debug gas" };
    }

    if (/\b(catat|note)\b/i.test(lower)) {
      const content = extractNoteContent(text);
      if (!content) {
        await sendMessage(chatId, "Boss, isi catatannya mana nih? contoh: catat beli kopi ☕");
        return { statusCode: 200, body: "empty note" };
      }
      try {
        const data = await callGAS({ command: "addNote", text: content });
        await sendMessage(chatId, `Boss ✨ ${data.message || "Catatan tersimpan."}`);
      } catch (e) {
        await sendMessage(chatId, `Boss ❌ gagal catat: ${e.message}`);
      }
      return { statusCode: 200, body: "note route" };
    }

    if (lower.includes("lihat catatan")) {
      const limit = extractNumber(lower, 10);
      try {
        const data = await callGAS({ command: "listNotes", limit });
        const notes = Array.isArray(data.notes) ? data.notes : [];
        const lines = notes.length
          ? notes.map((n) => n.human || n.content || JSON.stringify(n)).join("\n")
          : "(kosong)";
        await sendMessage(chatId, `Boss ✨ Catatan:\n${lines}`);
      } catch (e) {
        await sendMessage(chatId, `Boss ❌ gagal ambil catatan: ${e.message}`);
      }
      return { statusCode: 200, body: "list notes" };
    }

    if (/\b(jadwal(?:kan)?|ingatkan|remind)\b/i.test(lower)) {
      const coerced = coerceScheduleText(text);
      try {
        const data = await callGAS({ command: "addSchedule", text: coerced });
        await sendMessage(chatId, `Boss ✨ ${data.message || "Jadwal tersimpan."}`);
      } catch (e) {
        await sendMessage(chatId, `Boss ❌ gagal bikin jadwal: ${e.message}`);
      }
      return { statusCode: 200, body: "schedule route" };
    }

    if (lower.includes("lihat jadwal")) {
      const limit = extractNumber(lower, 10);
      try {
        const data = await callGAS({ command: "listSchedule", limit });
        const arr = Array.isArray(data.schedules) ? data.schedules : [];
        const lines = arr.length
          ? arr.map((s) =>
              s.human ||
              `${s.content} • ${new Date(s.execTime).toLocaleString("id-ID")} (${s.status})`
            ).join("\n")
          : "(kosong)";
        await sendMessage(chatId, `Boss ✨ Jadwal:\n${lines}`);
      } catch (e) {
        await sendMessage(chatId, `Boss ❌ gagal ambil jadwal: ${e.message}`);
      }
      return { statusCode: 200, body: "list schedule" };
    }

    if (lower === "hapus memori") {
      delete userMemory[chatId];
      await sendMessage(chatId, "Boss, memori Ness sudah dihapus! ✨");
      return { statusCode: 200, body: "clear mem" };
    }

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

        const { tanggal, jam, waktu } = getWIBTimeInfo();

        let reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        let usedModel = null;

        outerLoop: for (const model of models) {
          for (let i = 0; i < apiKeys.length; i++) {
            const apiKey = apiKeys[keyIndex];
            keyIndex = (keyIndex + 1) % apiKeys.length;

            try {
              const payload = {
                model,
                messages: [
                  { role: "system", content: getSystemPrompt(tanggal, jam, waktu) },
                  {
                    role: "user",
                    content: [
                      { type: "text", text: caption },
                      { type: "image_url", image_url: { url: photoUrl } }
                    ]
                  }
                ]
              };

              const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
              });

              const data = await resp.json();
              if (data?.choices?.[0]?.message?.content) {
                reply = data.choices[0].message.content.trim();
                usedModel = model;
                break outerLoop;
              }
            } catch (err) {
              console.error(`OpenRouter error [${model}]`, err.message);
            }
          }
        }

        if (usedModel) {
          reply += `\n(${getAlias(usedModel)})`;
        } else {
          reply += " (AI error, pakai fallback)";
        }

        userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
       