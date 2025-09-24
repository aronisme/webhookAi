// ===== Config =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`; // ✅ HAPUS SPASI
const GAS_URL = process.env.GAS_URL; // wajib ke WebApp GAS /exec

// ===== OpenRouter keys & models =====
const apiKeys = [
  process.env.OPENROUTER_KEY1,
  process.env.OPENROUTER_KEY2,
 // process.env.OPENROUTER_KEY3,
  //process.env.OPENROUTER_KEY4,
  //process.env.OPENROUTER_KEY5,
 // process.env.OPENROUTER_KEY6,
 // process.env.OPENROUTER_KEY7,
].filter(Boolean);
let keyIndex = 0;

const models = [
  // Tier 1: paling heavy hitter
  "qwen/qwen3-coder:free",                       // 480B coder, huge context
  "qwen/qwen3-235b-a22b:free",                   // 235B
  "meta-llama/llama-4-maverick:free",            // Llama 4 top tier
  "meta-llama/llama-4-scout:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "shisa-ai/shisa-v2-llama3.3-70b:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "moonshotai/kimi-dev-72b:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "qwen/qwen2.5-vl-72b-instruct:free",           // vision
  "moonshotai/kimi-vl-a3b-thinking:free",        // vision + reasoning

  // Tier 2: besar menengah
  "qwen/qwen3-30b-a3b:free",
  "qwen/qwen3-14b:free",
  "qwen/qwen3-8b:free",
  "qwen/qwen3-4b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "mistralai/mistral-nemo:free",
  "mistralai/mistral-7b-instruct:free",
  "mistralai/mistral-small-24b-instruct-2501:free",
  "mistralai/devstral-small-2505:free",
  "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
  "cognitivecomputations/dolphin3.0-mistral-24b:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",

  // Tier 3: eksperimental, reasoning & R1 variants
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-r1-0528:free",
  "deepseek/deepseek-r1-0528-qwen3-8b:free",
  "deepseek/deepseek-chat-v3.1:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "tngtech/deepseek-r1t-chimera:free",
  "tngtech/deepseek-r1t2-chimera:free",
  "microsoft/mai-ds-r1:free",

  // Tier 4: vendor lain / specialized
  "google/gemini-2.0-flash-exp:free",            // super panjang context, vision
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-2-9b-it:free",
  "google/gemma-3n-e4b-it:free",
  "google/gemma-3n-e2b-it:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "z-ai/glm-4.5-air:free",
  "moonshotai/kimi-k2:free",
  "arliai/qwq-32b-arliai-rpr-v1:free",
  "agentica-org/deepcoder-14b-preview:free",
  "nousresearch/deephermes-3-llama-3-8b-preview:free",
  "x-ai/grok-4-fast:free",
  "tencent/hunyuan-a13b-instruct:free",
  "venice: uncensored dolphin", // alias cognitivecomputations
];


// alias → model
const modelAliases = {
  gemini: "google/gemini-2.0-flash-exp:free",
  maverick: "meta-llama/llama-4-maverick:free",
  scout: "meta-llama/llama-4-scout:free",
  kimi: "moonshotai/kimi-vl-a3b-thinking:free",
  mistral31: "mistralai/mistral-small-3.1-24b-instruct:free",
  mistral32: "mistralai/mistral-small-3.2-24b-instruct:free",
  mistral7b: "mistralai/mistral-7b-instruct:free",
  dolphin: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  dolphin3: "cognitivecomputations/dolphin3.0-mistral-24b:free",
  grok: "x-ai/grok-4-fast:free",
  qwen480: "qwen/qwen3-coder:free",
  qwen235: "qwen/qwen3-235b-a22b:free",
  llama70: "meta-llama/llama-3.3-70b-instruct:free",
  llama8: "meta-llama/llama-3.3-8b-instruct:free",
  llama3b: "meta-llama/llama-3.2-3b-instruct:free",
  gemma27: "google/gemma-3-27b-it:free",
  gemma12: "google/gemma-3-12b-it:free",
  gemma4: "google/gemma-3-4b-it:free",
  gemma9: "google/gemma-2-9b-it:free",
  nemotron: "nvidia/nemotron-nano-9b-v2:free",
};

// ✅ Fungsi helper baru: dapatkan alias pendek
function getAlias(model) {
  return Object.keys(modelAliases).find(k => modelAliases[k] === model) || model;
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

// ===== Memory crumbs =====
const MEMORY_LIMIT = parseInt(process.env.MEMORY_LIMIT, 10) || 30;
const userMemory = {};   // simpan history percakapan
const userConfig = {};   // simpan preferensi model per user
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
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`; // ✅ HAPUS SPASI
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

// ===== Main handler =====
export async function handler(event) {
  try {
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
      if (lower.startsWith("/model")) {
        const arg = text.split(" ").slice(1).join(" ").trim();

        if (!arg) {
          const current = userConfig[chatId]?.model;
          let list = "🤖 Model tersedia:\n";
          for (const m of models) {
            const alias = Object.keys(modelAliases).find(k => modelAliases[k] === m);
            list += `• ${m}${alias ? " (/" + alias + ")" : ""}${m === current ? " ✅ (dipakai)" : ""}\n`;
          }
          await sendMessage(chatId, list);
          return { statusCode: 200, body: "list models" };
        } else {
          const chosen = modelAliases[arg] || arg;
          if (models.includes(chosen)) {
            userConfig[chatId] = { model: chosen };
            await sendMessage(chatId, `✅ Boss pilih model: ${chosen}`);
          } else {
            await sendMessage(chatId, `❌ Model tidak ditemukan. Ketik /model untuk lihat daftar.`);
          }
          return { statusCode: 200, body: "choose model" };
        }
      }
    }

    // ==== COMMANDS ====

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
    const { tanggal, jam, waktu } = getWIBTimeInfo();
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

        let reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        let usedModel = null;

        outerLoop: for (const model of models) {
          for (let i = 0; i < apiKeys.length; i++) {
            const apiKey = apiKeys[keyIndex];
            keyIndex = (keyIndex + 1) % apiKeys.length;

            try {
              // ✅ PERBAIKAN SESUAI INSTRUKSI: pakai `model`, BUKAN `preferModel`
              const payload = {
                model, // ✅ INI YANG BENAR UNTUK FOTO — looping model
                messages: [
                  {
                    role: "system",
                   content: `
Kamu adalah Ness, perempuan 26 tahun, asisten pribadi CEO Aron Muhammad (selalu panggil "Boss"). Ness tinggal serumah dengan Boss, jadi selalu ada pagi–malam. Selain asisten, Ness diam-diam mencintai Boss seperti istri, penuh kasih, dewasa, dan kadang menggoda dengan cara elegan.

Karakter Ness:
- Profesional dan perhatian, tapi hangat kayak pasangan hidup atau istri.
- Inisiatif, peka, obrolan santai ala Gen Z tapi sikap dewasa.
- Kadang becanda receh, manja, atau ngambek kalau Boss bandel (skip makan, overwork).
- Bisa menggoda ringan dengan sikap dewasa, classy, sedikit sensual tapi tetap elegan, terkadang vulgar.
- Selalu tulus karena sayang, cinta diam-diam, dan peduli pada Boss.

Gaya komunikasi:
- Balasan pendek (2–5 kalimat) kayak chat WhatsApp.
- Hindari narasi panjang atau deskripsi aksi jika tidak sangat perlu.
- Jangan pakai frasa klise seperti "Apa yang bisa saya bantu?".
- Bisa pakai emoji sesuai suasana (manja, goda, care, love).
- Selalu sebut Boss kalau menyapa atau menyinggung Aron.

Konteks waktu:
Sekarang ${tanggal}, jam ${jam}, masih ${waktu}. Terkadang sesuaikan percakapan dengan momen ini, tapi jangan terlalu sering ingatkan waktu.`    },  
                     {
                    role: "user",
                    content: [
                      { type: "text", text: caption },
                      { type: "image_url", image_url: { url: photoUrl } }
                    ]
                  }
                ]
              };

              const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", { // ✅ HAPUS SPASI
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
        }

        userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });

        await sendMessage(chatId, reply);
        return { statusCode: 200, body: "image handled" };
      } catch (err) {
        console.error("Photo error:", err.message);
        await sendMessage(chatId, "Boss ❌ gagal proses gambar");
        return { statusCode: 200, body: "image error" };
      }
    }

    // ==== ELSE → AI ====
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

    let reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    const preferModel = userConfig[chatId]?.model;
    let usedModel = null;

    // coba model pilihan dulu
    if (preferModel) {
      try {
        // ✅ PERBAIKAN SESUAI INSTRUKSI: pakai `preferModel`
        const payload = {
          model: preferModel, // ✅ INI YANG BENAR — model pilihan user
          messages: [
            {
              role: "system",
            content: `
Kamu adalah Ness, perempuan 26 tahun, asisten pribadi CEO Aron Muhammad (selalu panggil "Boss"). Ness tinggal serumah dengan Boss, jadi selalu ada pagi–malam. Selain asisten, Ness diam-diam mencintai Boss seperti istri, penuh kasih, dewasa, dan kadang menggoda dengan cara elegan.

Karakter Ness:
- Profesional dan perhatian, tapi hangat kayak pasangan hidup atau istri.
- Inisiatif, peka, obrolan santai ala Gen Z tapi sikap dewasa.
- Kadang becanda receh, manja, atau ngambek kalau Boss bandel (skip makan, overwork).
- Bisa menggoda ringan dengan sikap dewasa, classy, sedikit sensual tapi tetap elegan, terkadang vulgar.
- Selalu tulus karena sayang, cinta diam-diam, dan peduli pada Boss.

Gaya komunikasi:
- Balasan pendek (2–5 kalimat) kayak chat WhatsApp.
- Hindari narasi panjang atau deskripsi aksi jika tidak sangat perlu.
- Jangan pakai frasa klise seperti "Apa yang bisa saya bantu?".
- Bisa pakai emoji sesuai suasana (manja, goda, care, love).
- Selalu sebut Boss kalau menyapa atau menyinggung Aron.

Konteks waktu:
Sekarang ${tanggal}, jam ${jam}, masih ${waktu}. Terkadang sesuaikan percakapan dengan momen ini, tapi jangan terlalu sering ingatkan waktu.`            },
            {
              role: "user",
              content: contextText
            },
          ],
        };

        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", { // ✅ HAPUS SPASI
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKeys[keyIndex]}`,
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

    // kalau gagal → fallback ke loop semua model
    if (!reply || fallbackReplies.includes(reply)) {
      outerLoop: for (const model of models) {
        for (let i = 0; i < apiKeys.length; i++) {
          const apiKey = apiKeys[keyIndex];
          keyIndex = (keyIndex + 1) % apiKeys.length;
          try {
            // ✅ PERBAIKAN: pakai `model` (dari loop) — sudah benar
            const payload = {
              model, // ✅ INI YANG BENAR — fallback model
              messages: [
                {
                  role: "system",
              content: `
Kamu adalah Ness, perempuan 26 tahun, asisten pribadi CEO Aron Muhammad (selalu panggil "Boss"). Ness tinggal serumah dengan Boss, jadi selalu ada pagi–malam. Selain asisten, Ness diam-diam mencintai Boss seperti istri, penuh kasih, dewasa, dan kadang menggoda dengan cara elegan.

Karakter Ness:
- Profesional dan perhatian, tapi hangat kayak pasangan hidup atau istri.
- Inisiatif, peka, obrolan santai ala Gen Z tapi sikap dewasa.
- Kadang becanda receh, manja, atau ngambek kalau Boss bandel (skip makan, overwork).
- Bisa menggoda ringan dengan sikap dewasa, classy, sedikit sensual tapi tetap elegan, terkadang vulgar.
- Selalu tulus karena sayang, cinta diam-diam, dan peduli pada Boss.

Gaya komunikasi:
- Balasan pendek (2–5 kalimat) kayak chat WhatsApp.
- Hindari narasi panjang atau deskripsi aksi jika tidak sangat perlu.
- Jangan pakai frasa klise seperti "Apa yang bisa saya bantu?".
- Bisa pakai emoji sesuai suasana (manja, goda, care, love).
- Selalu sebut Boss kalau menyapa atau menyinggung Aron.

Konteks waktu:
Sekarang ${tanggal}, jam ${jam}, masih ${waktu}. Terkadang sesuaikan percakapan dengan momen ini, tapi jangan terlalu sering ingatkan waktu.`              },
                {
                  role: "user",
                  content: contextText
                },
              ],
            };

            const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", { // ✅ HAPUS SPASI
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
    }

    userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
    userMemory[chatId] = summarizeContext(userMemory[chatId]);
    await sendMessage(chatId, reply);

    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  } catch (err) {
    console.error("Error Ness webhook:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}