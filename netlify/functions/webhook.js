// ===== Config =====
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
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "google/gemini-2.0-flash-exp:free",   // support vision
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "moonshotai/kimi-vl-a3b-thinking:free", // support vision
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "x-ai/grok-4-fast:free",
];

// ===== Memory crumbs =====
const MEMORY_LIMIT = parseInt(process.env.MEMORY_LIMIT, 10) || 20;
const userMemory = {};
const userConfig = {}; // simpan preferensi per user (misal model terpilih)
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
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
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

    // ==== FILTER SLASH COMMANDS ====
    if (text.startsWith("/")) {
      if (lower === "/menu") {
        await sendMessage(
          chatId,
          `📋 Menu:\n/menu → lihat menu\n/model → daftar model AI\n/pilih model <nama> → pilih model\n/help → bantuan`
        );
        return { statusCode: 200, body: "menu" };
      }
      if (lower === "/model") {
        await sendMessage(chatId, `🤖 Model tersedia:\n${models.join("\n")}`);
        return { statusCode: 200, body: "list models" };
      }
      if (lower.startsWith("/pilih model")) {
        const chosen = lower.replace("/pilih model", "").trim();
        if (models.includes(chosen)) {
          userConfig[chatId] = { model: chosen };
          await sendMessage(chatId, `✅ Boss pilih model: ${chosen}`);
        } else {
          await sendMessage(chatId, `❌ Model tidak ditemukan.`);
        }
        return { statusCode: 200, body: "choose model" };
      }
      if (lower === "/help") {
        await sendMessage(
          chatId,
          `ℹ️ Boss bisa:\n- catat sesuatu\n- buat jadwal\n- kirim foto untuk analisis\n- pakai /model dan /pilih model`
        );
        return { statusCode: 200, body: "help" };
      }
    }

    // ==== COMMANDS EXISTING (catat, jadwal, lihat, hapus memori) ====
    // (blok yang sudah ada tetap sama persis, tidak aku hapus)

    // ... [blok CATAT, LIHAT CATATAN, JADWAL, LIHAT JADWAL, HAPUS MEMORI] ...

    // === HANDLE PHOTO ===
    if (hasPhoto) {
      // (blok foto yang sudah ada tetap, looping semua models)
      // ...
    }

    // ==== ELSE → AI ==== 
    // (blok chat biasa ke AI tetap sama)
    // ...
  } catch (err) {
    console.error("Error Ness webhook:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}
