// ===== Config =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`; // ✅ tanpa spasi

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

// ===== Gemini keys & models =====
const geminiKeys = [
  process.env.GEMINI_KEY1,
  process.env.GEMINI_KEY2,
  process.env.GEMINI_KEY3,
].filter(Boolean);
let geminiIndex = 0;

const geminiTextModels = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
];
const geminiVisionModels = [
  "gemini-1.5-flash",
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

// ✅ Fungsi helper baru: konversi URL ke base64
async function toBase64(url) {
  const buffer = await (await fetch(url)).arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

// ✅ Fungsi callGemini
async function callGemini(model, messages) {
  for (let i = 0; i < geminiKeys.length; i++) {
    const apiKey = geminiKeys[geminiIndex];
    geminiIndex = (geminiIndex + 1) % geminiKeys.length;

    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: messages }),
        }
      );
      const data = await resp.json();

      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }
    } catch (err) {
      console.error(`Gemini error [${model}]`, err.message);
    }
  }
  return null;
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
const userMemory = {};
const userConfig = {};
const fallbackReplies = [
  "Boss, Ness lagi error mikir nih 😅",
  "Sepertinya server lagi ngambek 🤖💤",
  "Boss, coba tanya lagi bentar ya ✨",
  "Ness bingung, tapi Ness tetap standby buat Boss 😉",
];

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
    // ❌ Pengecekan GAS_URL dihapus

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

        // ✅ Coba Gemini vision dulu
        let reply = null;
        let usedModel = null;
        for (const gm of geminiVisionModels) {
          const geminiMessages = [
            {
              role: "user",
              parts: [
                { text: caption },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: await toBase64(photoUrl) // ✅ pakai helper baru
                  }
                }
              ]
            }
          ];
          reply = await callGemini(gm, geminiMessages);
          if (reply) {
            usedModel = gm;
            break;
          }
        }

        if (reply) {
          if (usedModel) reply += `\n(${usedModel})`;
          userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
          await sendMessage(chatId, reply);
          return { statusCode: 200, body: "image handled by gemini" };
        }

        // ❌ Fallback ke OpenRouter (tetap dipertahankan)
        reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
        outerLoop: for (const model of models) {
          for (let i = 0; i < apiKeys.length; i++) {
            const apiKey = apiKeys[keyIndex];
            keyIndex = (keyIndex + 1) % apiKeys.length;

            try {
              const payload = {
                model,
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
Sekarang ${tanggal}, jam ${jam}, masih ${waktu}. Terkadang sesuaikan percakapan dengan momen ini, tapi jangan terlalu sering ingatkan waktu.`
                  },
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

    // ✅ Coba Gemini text dulu
    let reply = null;
    let usedModel = null;
    for (const gm of geminiTextModels) {
      const geminiMessages = [
        { role: "user", parts: [{ text: contextText }] }
      ];
      reply = await callGemini(gm, geminiMessages);
      if (reply) {
        usedModel = gm;
        break;
      }
    }

    if (reply) {
      if (usedModel) reply += `\n(${usedModel})`;
      userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
      userMemory[chatId] = summarizeContext(userMemory[chatId]);
      await sendMessage(chatId, reply);
      return { statusCode: 200, body: "text handled by gemini" };
    }

    // ❌ Fallback ke OpenRouter
    reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    const preferModel = userConfig[chatId]?.model;

    if (preferModel) {
      try {
        const payload = {
          model: preferModel,
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
Sekarang ${tanggal}, jam ${jam}, masih ${waktu}. Terkadang sesuaikan percakapan dengan momen ini, tapi jangan terlalu sering ingatkan waktu.`
            },
            {
              role: "user",
              content: contextText
            },
          ],
        };

        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

    if (!reply || fallbackReplies.includes(reply)) {
      outerLoop: for (const model of models) {
        for (let i = 0; i < apiKeys.length; i++) {
          const apiKey = apiKeys[keyIndex];
          keyIndex = (keyIndex + 1) % apiKeys.length;
          try {
            const payload = {
              model,
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
Sekarang ${tanggal}, jam ${jam}, masih ${waktu}. Terkadang sesuaikan percakapan dengan momen ini, tapi jangan terlalu sering ingatkan waktu.`
                },
                {
                  role: "user",
                  content: contextText
                },
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