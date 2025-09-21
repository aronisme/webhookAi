// webhook.js
// Netlify Function: Telegram ⇄ Ness ⇄ GAS (single-sheet)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const GAS_URL = process.env.GAS_URL; // wajib di-set ke WebApp GAS lo

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

// ===== In-memory chat crumbs =====
const userMemory = {}; // { chatId: [ "Boss: ...", "Ness: ..." ] }

// ===== Fallback replies =====
const fallbackReplies = [
  "Boss, Ness lagi error mikir nih 😅",
  "Sepertinya server lagi ngambek 🤖💤",
  "Boss, coba tanya lagi bentar ya ✨",
  "Ness bingung, tapi Ness tetap standby buat Boss 😉",
];

// ===== Little helpers =====
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
  if (!m) return def;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

// “jadwal …” → coba sisipkan delimiter " | " kalau user lupa
function coerceScheduleText(raw) {
  // kalau user sudah pakai “|”, langsung balikin
  if (raw.includes("|")) return raw;

  // cari pola waktu sederhana: “besok xx:yy”, “lusa xx:yy”, “hari ini xx:yy”, atau “hh:mm”
  const tRe = /\b((besok|lusa|hari ini)\s+\d{1,2}:\d{2}|\d{1,2}:\d{2})\b/i;
  const m = raw.match(tRe);
  if (m) {
    const timePart = m[1].trim();
    const eventPart = raw.replace(tRe, "").replace(/\b(jadwal(?:kan)?|ingatkan|remind)\b/i, "").trim();
    const eventClean = eventPart.replace(/^[,:-]\s*/, "").trim();
    if (eventClean) return `${eventClean} | ${timePart}`;
  }

  // fallback: biarin, parser GAS bakal auto +5 menit kalau kosong
  return raw;
}

async function callGAS(payload) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  // GAS kadang return HTML saat error; handle itu
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const txt = await res.text();
    throw new Error(`GAS non-JSON (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json && json.ok === false && json.error) {
    throw new Error(json.error);
  }
  return json;
}

// ===== Main handler =====
export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    if (!TELEGRAM_BOT_TOKEN) {
      return { statusCode: 500, body: "Missing TELEGRAM_BOT_TOKEN" };
    }
    if (!GAS_URL) {
      return { statusCode: 500, body: "Missing GAS_URL" };
    }

    const update = JSON.parse(event.body || "{}");
    const message = update?.message;
    if (!message) return { statusCode: 200, body: "no message" };

    const chatId = message.chat.id;
    const text = (message.text || "").trim();
    const lower = text.toLowerCase();

    await typing(chatId);

    // ===== COMMANDS → GAS =====

    // 1) CATAT
    // pola: "catat beliin kopi", "tolong catat ...", "note ..."
    if (/\b(catat|note)\b/i.test(lower)) {
      // ambil isi setelah kata "catat" / "note"
      const content = text.replace(/\b(catat|note)\b/i, "").trim() || text;
      try {
        const data = await callGAS({ command: "addNote", text: content });
        const msg = data.message || `Catatan tersimpan: ${content}`;
        await sendMessage(chatId, `Boss ✨ ${msg}`);
      } catch (e) {
        await sendMessage(chatId, `Boss, gagal nyimpen catatan: ${e.message}`);
      }
      return { statusCode: 200, body: "note route" };
    }

    // 2) LIHAT CATATAN (opsional angka: “lihat catatan 5”)
    if (lower.includes("lihat catatan")) {
      const limit = extractNumber(lower, 10);
      try {
        const data = await callGAS({ command: "listNotes", limit });
        const notes = Array.isArray(data.notes) ? data.notes : [];
        let lines;
        if (notes.length === 0) {
          lines = "(kosong)";
        } else if (typeof notes[0] === "string") {
          lines = notes.join("\n");
        } else {
          // objek dari GAS single-sheet (punya human/content)
          lines = notes
            .map(n => n.human || `${n.content} • ${new Date(n.createdAt).toLocaleString("id-ID")}`)
            .join("\n");
        }
        await sendMessage(chatId, `Boss ✨ Catatan:\n${lines}`);
      } catch (e) {
        await sendMessage(chatId, `Boss, gagal ambil catatan: ${e.message}`);
      }
      return { statusCode: 200, body: "list notes route" };
    }

    // 3) JADWAL / INGATKAN
    // pola: “jadwal standup besok 08:00”, “ingatkan minum 15:30”, “jadwalkan …”
    if (/\b(jadwal(?:kan)?|ingatkan|remind)\b/i.test(lower)) {
      const coerced = coerceScheduleText(text);
      try {
        const data = await callGAS({ command: "addSchedule", text: coerced });
        const msg = data.message || "Jadwal berhasil disimpan";
        await sendMessage(chatId, `Boss ✨ ${msg}`);
      } catch (e) {
        await sendMessage(chatId, `Boss, gagal bikin jadwal: ${e.message}`);
      }
      return { statusCode: 200, body: "schedule route" };
    }

    // 4) LIHAT JADWAL (opsional angka)
    if (lower.includes("lihat jadwal")) {
      const limit = extractNumber(lower, 10);
      try {
        const data = await callGAS({ command: "listSchedule", limit });
        const arr = Array.isArray(data.schedules) ? data.schedules : [];
        let lines;
        if (arr.length === 0) {
          lines = "(kosong)";
        } else if (typeof arr[0] === "string") {
          lines = arr.join("\n");
        } else {
          lines = arr
            .map(s => s.human || `${new Date(s.execTime).toLocaleString("id-ID")} • ${s.content} (${s.status})`)
            .join("\n");
        }
        await sendMessage(chatId, `Boss ✨ Jadwal:\n${lines}`);
      } catch (e) {
        await sendMessage(chatId, `Boss, gagal ambil jadwal: ${e.message}`);
      }
      return { statusCode: 200, body: "list schedule route" };
    }

    // ===== ELSE → AI CHAT =====

    if (!userMemory[chatId]) userMemory[chatId] = [];
    userMemory[chatId].push(`Boss: ${text || "[kirim gambar]"}`);
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
          console.error(`OpenRouter error [${model}] keyIdx=${i}:`, err.message);
        }
      }
    }

    userMemory[chatId].push(`Ness: ${reply}`);
    if (userMemory[chatId].length > 5) userMemory[chatId].shift();

    await sendMessage(chatId, reply);
    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  } catch (err) {
    console.error("Error Ness webhook:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}
