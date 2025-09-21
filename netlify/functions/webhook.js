const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const GAS_URL = process.env.GAS_URL; // wajib ke WebApp GAS /exec

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

const models = [
  "google/gemini-2.0-flash-exp:free",
  "x-ai/grok-4-fast:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "moonshotai/kimi-vl-a3b-thinking:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
];

// ===== Memory crumbs =====
const MEMORY_LIMIT = parseInt(process.env.MEMORY_LIMIT, 10) || 20;
const userMemory = {};
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

function extractNumber(s, def = 10) {
  const m = s.match(/(\d{1,3})\b/);
  return m ? parseInt(m[1], 10) : def;
}

// catat → ambil isi
function extractNoteContent(raw) {
  const m = raw.match(/\b(catat|note)\b[:\s-]*(.+)/i);
  return m ? m[2].trim() : "";
}

// jadwal → tambahin delimiter kalau lupa
function coerceScheduleText(raw) {
  if (raw.includes("|")) return raw;
  const tRe = /\b((besok|lusa|hari ini)\s+\d{1,2}:\d{2}|\d{1,2}:\d{2})\b/i;
  const m = raw.match(tRe);
  if (m) {
    const timePart = m[1].trim();
    const eventPart = raw.replace(tRe, "").replace(/\b(jadwal(?:kan)?|ingatkan|remind)\b/i, "").trim();
    return `${eventPart} | ${timePart}`;
  }
  return raw;
}

async function callGAS(payload) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const txt = await res.text();
    throw new Error(`GAS non-JSON (${res.status}): ${txt.slice(0, 180)}`);
  }
  return res.json();
}

function summarizeContext(history) {
  if (history.length <= MEMORY_LIMIT / 2) return history;
  const summary = history.slice(0, MEMORY_LIMIT / 4).map(msg => ({
    text: msg.text.slice(0, 50) + "...",
    timestamp: msg.timestamp,
  }));
  return [...summary, ...history.slice(-MEMORY_LIMIT / 2)];
}

// ===== Main handler =====
export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    if (!TELEGRAM_BOT_TOKEN) return { statusCode: 500, body: "Missing TELEGRAM_BOT_TOKEN" };
    if (!GAS_URL) return { statusCode: 500, body: "Missing GAS_URL" };

    const update = JSON.parse(event.body || "{}");
    const message = update?.message;
    if (!message) return { statusCode: 200, body: "no message" };

    const chatId = message.chat.id;
    const text = (message.text || "").trim();
    const lower = text.toLowerCase();

    if (text.length > 1000) {
      await sendMessage(chatId, "Boss, pesan terlalu panjang 😅");
      return { statusCode: 200, body: "too long" };
    }

    await typing(chatId);

    // ==== COMMANDS ====

    // CATAT
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

    // LIHAT CATATAN
    if (lower.includes("lihat catatan")) {
      const limit = extractNumber(lower, 10);
      try {
        const data = await callGAS({ command: "listNotes", limit });
        const notes = Array.isArray(data.notes) ? data.notes : [];
        const lines = notes.length
          ? notes.map(n => n.human || n.content || JSON.stringify(n)).join("\n")
          : "(kosong)";
        await sendMessage(chatId, `Boss ✨ Catatan:\n${lines}`);
      } catch (e) {
        await sendMessage(chatId, `Boss ❌ gagal ambil catatan: ${e.message}`);
      }
      return { statusCode: 200, body: "list notes" };
    }

    // JADWAL
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

    // LIHAT JADWAL
    if (lower.includes("lihat jadwal")) {
      const limit = extractNumber(lower, 10);
      try {
        const data = await callGAS({ command: "listSchedule", limit });
        const arr = Array.isArray(data.schedules) ? data.schedules : [];
        const lines = arr.length
          ? arr.map(s => s.human || `${s.content} • ${new Date(s.execTime).toLocaleString("id-ID")} (${s.status})`).join("\n")
          : "(kosong)";
        await sendMessage(chatId, `Boss ✨ Jadwal:\n${lines}`);
      } catch (e) {
        await sendMessage(chatId, `Boss ❌ gagal ambil jadwal: ${e.message}`);
      }
      return { statusCode: 200, body: "list schedule" };
    }

    // HAPUS MEMORI
    if (lower === "hapus memori") {
      delete userMemory[chatId];
      await sendMessage(chatId, "Boss, memori Ness sudah dihapus! ✨");
      return { statusCode: 200, body: "clear mem" };
    }

    // ==== ELSE → AI ====
    if (!userMemory[chatId]) userMemory[chatId] = [];
    userMemory[chatId].push({ text: `Boss: ${text}`, timestamp: Date.now() });
    userMemory[chatId] = summarizeContext(userMemory[chatId]);

    const contextText = `
Kamu adalah Ness, asisten pribadi cewek. Selalu panggil user "Boss".
Riwayat percakapan:
${userMemory[chatId].map(m => `${m.text} (${new Date(m.timestamp).toLocaleString("id-ID")})`).join("\n")}
Pesan terbaru Boss: ${text}
    `.trim();

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
              { role: "system", content: "Kamu adalah Ness, asisten pribadi cewek." },
              { role: "user", content: [{ type: "text", text: contextText }] },
            ],
          };
          const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(payload),
          });
          const data = await resp.json();
          if (data?.choices?.[0]?.message?.content) {
            reply = data.choices[0].message.content.trim();
            break outerLoop;
          }
        } catch (err) {
          console.error(`OpenRouter error [${model}]`, err.message);
        }
      }
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
