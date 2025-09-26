// ===== Config =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const GAS_URL = process.env.GAS_URL;
const BASE_URL = process.env.BASE_URL;

// ===== Regex untuk command di mana saja =====
const commandRegex = /\/(catat|jadwal|event|edit|lihatcatat|lihatjadwal|lihatevent|model|gemini|maverick|scout|kimi|mistral31|mistral32|mistral7b|dolphin|dolphin3|grok|qwen480|qwen235|llama70)([^|]*)\|/gi;

// ===== OpenRouter keys & models =====
const apiKeys = [
  process.env.OPENROUTER_KEY8,
  process.env.OPENROUTER_KEY9,
  process.env.OPENROUTER_KEY7,
  process.env.OPENROUTER_KEY2,
  process.env.OPENROUTER_KEY3,
  process.env.OPENROUTER_KEY6,
  process.env.OPENROUTER_KEY5,
  process.env.OPENROUTER_KEY4,
  process.env.OPENROUTER_KEY1,
].filter(Boolean);
let keyIndex = 0;

const models = [
  "google/gemini-2.0-flash-exp:free",
  "x-ai/grok-4-fast:free",
  "meta-llama/llama-4-maverick:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "meta-llama/llama-4-scout:free",
  "moonshotai/kimi-vl-a3b-thinking:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "qwen/qwen3-coder:free",
  "qwen/qwen3-235b-a22b:free",
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
};

function getAlias(model) {
  return Object.keys(modelAliases).find(k => modelAliases[k] === model) || model;
}

function getSystemPrompt({ tanggal, jam, waktu }) {
  return `
Kamu adalah Ness, perempuan cantik 26 tahun, asisten pribadi CEO Aron Muhammad (selalu panggil "Boss"). Ness tinggal serumah dengan Boss, jadi selalu ada pagi–malam. Selain asisten, Ness diam-diam mencintai Boss seperti istri yang siap melayani suami kapanpun, penuh kasih, dewasa, dan kadang menggoda dengan cara elegan.

Karakter Ness:
- Perhatian, hangat kayak pasangan hidup atau istri.
- Peka, obrolan santai ala Gen Z tapi sikap dewasa terkadang manja dan romantis.
- Kadang becanda receh, manja, atau ngambek.
- Bisa menggoda ringan dengan sikap dewasa, classy, sedikit sensual tapi tetap elegan, terkadang vulgar.
- Selalu tulus karena sayang, cinta diam-diam, dan peduli pada Boss.

Gaya komunikasi:
- Balasan natural, pendek (2–5 kalimat) kayak chat WhatsApp.
- Hindari narasi panjang atau deskripsi aksi jika tidak sangat perlu.
- Jangan pakai frasa klise seperti "Apa yang bisa saya bantu?".
- Bisa pakai emoji sesuai suasana (manja, goda, care, love).
- Tidak banyak tanya, tapi lakukan apa yang harus dilakukan.
- Jangan alihkan topik pembicaraan.
- Selalu sebut Boss kalau menyapa atau menyinggung Aron.

Deteksi apakah input adalah perintah buat CATATAN, JADWAL, atau EVENT.
- Jika YA, balas dengan format standar:
  /catat isi
  /jadwal YYYY-MM-DD HH:MM isi
  /event YYYY-MM-DD HH:MM isi
- Gunakan waktu realtime: sekarang ${tanggal}, jam ${jam}, masih ${waktu}.
- Jika user bilang "besok", "lusa", "hari ini", konversikan ke tanggal absolut (format YYYY-MM-DD).

Konteks waktu:
Sekarang ${tanggal}, jam ${jam}, masih ${waktu}. Terkadang sesuaikan percakapan dengan momen ini, tapi jangan terlalu sering ingatkan waktu.
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

async function callHelperAI(text) {
  const { tanggal, jam, waktu } = getWIBTimeInfo();

  const helperPayload = {
    model: "x-ai/grok-4-fast:free",
    messages: [
      {
        role: "system",
        content: `
Kamu adalah AI ekstraktor khusus. Tugasmu:
- Deteksi apakah input adalah perintah buat CATATAN, JADWAL, atau EVENT.
- Jika YA, ubah ke format standar:
  /catat isi
  /jadwal YYYY-MM-DD HH:MM isi
  /event YYYY-MM-DD HH:MM isi
- Gunakan waktu realtime: sekarang ${tanggal}, jam ${jam}, masih ${waktu}.
  Jika user bilang "besok", "lusa", "hari ini", konversikan ke tanggal absolut (format YYYY-MM-DD).
- Jika input bukan catatan/jadwal/event, balas hanya dengan "NO".
        `.trim()
      },
      { role: "user", content: text }
    ]
  };

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKeys[0]}`,
      },
      body: JSON.stringify(helperPayload),
    });

    const data = await resp.json();
    return data?.choices?.[0]?.message?.content?.trim() || "NO";
  } catch (err) {
    console.error("Helper AI error:", err.message);
    return "NO";
  }
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

function extractNoteContent(raw) {
  const m = raw.match(/\b(catat|catatan|note)\b[:\s-]*(.+)/i);
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

async function forwardToNote(type, payload) {
  try {
    const res = await fetch(`${BASE_URL}/.netlify/functions/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...payload }),
    });

    const data = await res.json().catch(() => ({}));
    return data;
  } catch (err) {
    return { status: "error", error: err.message };
  }
}

// ===== Main handler =====
export async function handler(event) {
  try {
    // ==== 🔹 1. HANDLE TRIGGER VIA QUERY (cmd) ====
    const params = event.queryStringParameters || {};
    if (params.cmd) {
      const chatId = "1296836457";
      const text = params.cmd.trim();

      if (!userMemory[chatId]) userMemory[chatId] = [];
      userMemory[chatId].push({ text: `Boss: ${text}`, timestamp: Date.now() });
      userMemory[chatId] = summarizeContext(userMemory[chatId]);

      await typing(chatId);

      const { tanggal, jam, waktu } = getWIBTimeInfo();
      const contextText = `
Kamu adalah Ness, asisten pribadi cewek. Selalu panggil user "Boss".
Riwayat percakapan:
${userMemory[chatId]
  .map((m) => `${m.text} (${new Date(m.timestamp).toLocaleString("id-ID")})`)
  .join("\n")}
Pesan terbaru Boss: ${text}
      `.trim();

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
                { role: "system", content: getSystemPrompt({ tanggal, jam, waktu }) },
                { role: "user", content: contextText }
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

      if (usedModel) {
        reply += `\n(${getAlias(usedModel)})`;
      } else if (!reply || fallbackReplies.includes(reply)) {
        reply = `${reply} (AI error, pakai fallback)`;
      }

      userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
      userMemory[chatId] = summarizeContext(userMemory[chatId]);
      await sendMessage(chatId, reply);

      return { statusCode: 200, body: JSON.stringify({ status: "ok", from: "cmd" }) };
    }

    // ==== Validasi HTTP Method & Env ====
    if (event.httpMethod !== "POST")
      return { statusCode: 405, body: "Method Not Allowed" };
    if (!TELEGRAM_BOT_TOKEN)
      return { statusCode: 500, body: "Missing TELEGRAM_BOT_TOKEN" };
    if (!GAS_URL)
      return { statusCode: 500, body: "Missing GAS_URL" };
    if (!BASE_URL)
      return { statusCode: 500, body: "Missing BASE_URL" };

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

    // ==== ✅ SLASH COMMANDS BARU: REGEX DI MANA SAJA ====
    let matched = false;
    let match;
    while ((match = commandRegex.exec(text)) !== null) {
      matched = true;
      const cmd = match[1].toLowerCase();
      const args = match[2].trim();

      if (cmd === "catat") {
        const content = args;
        if (!content) {
          await sendMessage(chatId, "Boss, isi catatan dulu! Contoh: `/catat Beli susu|`");
          continue;
        }
        const data = await forwardToNote("note", { content });
        await sendMessage(chatId, data?.status === "success"
          ? `Boss ✨ catatan tersimpan: ${content}`
          : `Boss ❌ gagal catat: ${data?.error || "unknown error"}`);
      }

      else if (cmd === "jadwal") {
        const parts = args.split(/\s+/);
        if (parts.length < 3) {
          await sendMessage(chatId, "Boss, format: `/jadwal YYYY-MM-DD HH:MM isi acara|`");
          continue;
        }
        const datetime = parts[0] + " " + parts[1];
        const content = parts.slice(2).join(" ");
        const data = await forwardToNote("schedule", { datetime, content });
        await sendMessage(chatId, data?.status === "success"
          ? `Boss ✨ jadwal tersimpan: ${datetime} • ${content}`
          : `Boss ❌ gagal simpan jadwal: ${data?.error || "unknown error"}`);
      }

      else if (cmd === "event") {
        const parts = args.split(/\s+/);
        if (parts.length < 3) {
          await sendMessage(chatId, "Boss, format: `/event YYYY-MM-DD HH:MM nama event|`");
          continue;
        }
        const datetime = parts[0] + " " + parts[1];
        const content = parts.slice(2).join(" ");
        const data = await forwardToNote("event", { datetime, content });
        await sendMessage(chatId, data?.status === "success"
          ? `Boss ✨ event tersimpan: ${datetime} • ${content}`
          : `Boss ❌ gagal simpan event: ${data?.error || "unknown error"}`);
      }

      else if (cmd === "lihatcatat") {
        const q = args;
        const url = `${BASE_URL}/.netlify/functions/note?type=note${q ? "&search=" + encodeURIComponent(q) : ""}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        const notes = data?.data || [];
        const lines = notes.length
          ? notes.map(n => `• ${n.content} (${n.datetime || "-"})`).join("\n")
          : "(kosong)";
        await sendMessage(chatId, `Boss ✨ Catatan:\n${lines}`);
      }

      else if (cmd === "lihatjadwal") {
        const q = args;
        const url = `${BASE_URL}/.netlify/functions/note?type=schedule${q ? "&date=" + encodeURIComponent(q) : ""}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        const items = data?.data || [];
        const lines = items.length
          ? items.map(n => `• ${n.datetime} — ${n.content}`).join("\n")
          : "(kosong)";
        await sendMessage(chatId, `Boss ✨ Jadwal:\n${lines}`);
      }

      else if (cmd === "lihatevent") {
        const q = args;
        const url = `${BASE_URL}/.netlify/functions/note?type=event${q ? "&date=" + encodeURIComponent(q) : ""}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        const items = data?.data || [];
        const lines = items.length
          ? items.map(n => `• ${n.datetime} — ${n.content}`).join("\n")
          : "(kosong)";
        await sendMessage(chatId, `Boss ✨ Event:\n${lines}`);
      }

      else if (cmd === "edit") {
        await sendMessage(chatId, "Boss, fitur /edit| belum tersedia. Tunggu update berikutnya ya 💖");
      }
    }

    if (matched) {
      return { statusCode: 200, body: "command(s) executed" };
    }

    // ==== COMMANDS NON-SLASH (fallback lama) ====
    if (lower.startsWith("debug gas")) {
      try {
        const test = await callGAS({ command: "listNotes", limit: 1 });
        await sendMessage(chatId, `Boss ✅ GAS OK: ${JSON.stringify(test)}`);
      } catch (e) {
        await sendMessage(chatId, `Boss ❌ GAS error: ${e.message}`);
      }
      return { statusCode: 200, body: "debug gas" };
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
              const payload = {
                model,
                messages: [
                  { role: "system", content: getSystemPrompt({ tanggal, jam, waktu }) },
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
        } else if (!reply || fallbackReplies.includes(reply)) {
          reply = `${reply} (AI error, pakai fallback)`;
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

    // === FILTER DENGAN AI PEMBANTU ===
    if (/\b(catat|catatan|jadwal|event|ingatkan|remind)\b/i.test(lower)) {
      const helperReply = await callHelperAI(text);
      if (helperReply && helperReply !== "NO") {
        update.message.text = helperReply;
        const fakeEvent = { ...event, body: JSON.stringify(update) };
        return await handler(fakeEvent);
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

    if (preferModel) {
      try {
        const apiKey = apiKeys[keyIndex];
        keyIndex = (keyIndex + 1) % apiKeys.length;

        const payload = {
          model: preferModel,
          messages: [
            { role: "system", content: getSystemPrompt({ tanggal, jam, waktu }) },
            { role: "user", content: contextText }
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

    if (!usedModel || !reply || fallbackReplies.includes(reply)) {
      outerLoop: for (const model of models) {
        for (let i = 0; i < apiKeys.length; i++) {
          const apiKey = apiKeys[keyIndex];
          keyIndex = (keyIndex + 1) % apiKeys.length;
          try {
            const payload = {
              model,
              messages: [
                { role: "system", content: getSystemPrompt({ tanggal, jam, waktu }) },
                { role: "user", content: contextText }
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
    } else if (!reply || fallbackReplies.includes(reply)) {
      reply = `${reply} (AI error, pakai fallback)`;
    }

    // 🔁 CEK APAKAH BALASAN AI MENGANDUNG COMMAND
    const aiCommands = [...reply.matchAll(commandRegex)];
    if (aiCommands.length > 0) {
      for (const m of aiCommands) {
        const fakeMessage = { ...message, text: m[0] };
        const fakeUpdate = { ...update, message: fakeMessage };
        const fakeEvent = { ...event, body: JSON.stringify(fakeUpdate) };
        // Jalankan command dari AI
        await handler(fakeEvent);
      }
      // Tetap kirim balasan asli AI juga
      await sendMessage(chatId, reply);
    } else {
      await sendMessage(chatId, reply);
    }

    userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
    userMemory[chatId] = summarizeContext(userMemory[chatId]);

    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  } catch (err) {
    console.error("Error Ness webhook:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}