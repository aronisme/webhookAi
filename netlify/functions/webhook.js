// netlify/functions/webhook.js


const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const GAS_URL = process.env.GAS_URL; // Google Apps Script WebApp

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
  "meta-llama/llama-3.2-70b-instruct:free",
];

// === Memory (tanpa DB, sliding + summary) ===
const memory = {}; // { chatId: [ {role, content, ts} ] }
const MAX_HISTORY = 8; // jumlah pesan detail
const MAX_TOTAL = 20;  // kalau lebih → ringkas

function addToMemory(chatId, role, content) {
  if (!memory[chatId]) memory[chatId] = [];
  memory[chatId].push({ role, content, ts: Date.now() });

  // kalau history terlalu panjang → ringkas
  if (memory[chatId].length > MAX_TOTAL) {
    const summary = summarize(memory[chatId]);
    memory[chatId] = [
      { role: "system", content: `Summary so far: ${summary}` },
    ];
  }

  // kalau masih panjang tapi melebihi MAX_HISTORY → buang yang paling lama
  if (memory[chatId].length > MAX_HISTORY) {
    memory[chatId].shift();
  }
}

function getMemory(chatId) {
  return memory[chatId] || [];
}

// === Summarizer sederhana (rule-based, bisa diganti AI) ===
function summarize(history) {
  return history
    .map((m) => `${m.role}: ${m.content}`)
    .slice(-10)
    .join(" | ")
    .slice(0, 300); // ringkas 300 char max
}

// === Fallback ===
const fallbackReplies = [
  "Hehe, Ness lagi bengong, coba ulang deh 🙈",
  "Server AI lagi baper, Ness standby dulu 😎",
  "Ups, Ness gagal mikir. Coba ketik lagi ya.",
];
function randomFallback() {
  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
}

// === Kirim pesan ke Telegram ===
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// === Status typing ===
async function typing(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

// === Rotasi API key & model ===
function nextKey() {
  const key = apiKeys[keyIndex];
  keyIndex = (keyIndex + 1) % apiKeys.length;
  return key;
}
function nextModel() {
  const idx = Math.floor(Math.random() * models.length);
  return models[idx];
}

// === Panggil AI (OpenRouter) ===
async function callAI(chatId, userMessage) {
  const key = nextKey();
  const model = nextModel();
  const messages = [...getMemory(chatId), { role: "user", content: userMessage }];

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 400,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim();
  } catch (e) {
    console.error("AI Error:", e);
    return null;
  }
}

// === Handler utama ===
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const update = JSON.parse(event.body);
  const message = update.message;
  if (!message || !message.text) {
    return { statusCode: 200, body: "No message" };
  }

  const chatId = message.chat.id;
  const text = message.text.trim().toLowerCase();

  // status mengetik
  typing(chatId);

  // Perintah khusus (catat/jadwal → relay ke GAS)
  if (text.startsWith("catat") || text.startsWith("jadwal")) {
    try {
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, text }),
      });
      await sendMessage(chatId, "✅ Data sudah dikirim ke Google Apps Script!");
    } catch (e) {
      await sendMessage(chatId, "⚠️ Gagal kirim ke GAS.");
    }
    return { statusCode: 200, body: "OK" };
  }

  // Tambah ke memory & kirim ke AI
  addToMemory(chatId, "user", text);
  let reply = await callAI(chatId, text);

  if (!reply) {
    reply = randomFallback();
  } else {
    addToMemory(chatId, "assistant", reply);
  }

  await sendMessage(chatId, reply);

  return { statusCode: 200, body: "OK" };
}
