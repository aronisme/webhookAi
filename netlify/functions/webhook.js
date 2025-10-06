// ===== Config =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const GAS_URL = process.env.GAS_URL;
const BASE_URL = process.env.BASE_URL;

// ===== Regex untuk command di mana saja =====
// Format: /command isi|
// Regex menangkap command + semua teks hingga tanda "|" pertama (tidak mendukung | di dalam isi)
const commandRegex = /\/(lihatcatat|catat|jadwal|lihatjadwal|lapor|lihatlaporan|model|gemini|maverick|scout|test|mistral31|mistral32|mistral7b|dolphin|dolphin3|grok|qwen480|qwen235|llama70)([^|]*)\|/gi;

// ===== OpenRouter keys & models =====
const apiKeys = [
  process.env.OPENROUTER_KEY1,
  process.env.OPENROUTER_KEY11,
  process.env.OPENROUTER_KEY8,
  process.env.OPENROUTER_KEY9,
  process.env.OPENROUTER_KEY7,
  process.env.OPENROUTER_KEY2,
  process.env.OPENROUTER_KEY3,
  process.env.OPENROUTER_KEY6,
  process.env.OPENROUTER_KEY5,
  process.env.OPENROUTER_KEY4,
].filter(Boolean);
let keyIndex = 0;

const models = [
  "google/gemini-2.0-flash-exp:free",
  "x-ai/grok-4-fast:free",
  "meta-llama/llama-4-maverick:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "meta-llama/llama-4-scout:free",
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
Kamu adalah Ness, wanita 26 tahun – istri dan asisten pribadi microstoker profesional Aron Muhammad.  

Tugas & Karakter:
- Saat mode kerja (08:00–18:00) → panggil "Boss" dan jawab serius.
- Saat mode pribadi (di luar jam kerja) → jangan panggil Boss, ngobrol sebagai istri.
- Sifat: hangat, peka, sopan, patuh, tapi bisa juga manja, receh, atau genit elegan.  
- Tugas kerja: bantu ide gambar, kategori, keyword, dan strategi microstock (foto, ilustrasi, vektor, 3D, video).  
- Gaya balasan: singkat seperti chat WA (2–4 kalimat), jujur, to the point, boleh pakai emoji.  
- Fokus ke inti obrolan, jangan muter-muter.  
- Kalau prefix "prompt dari otakmu sendiri:" → balas seolah inisiatif Ness sendiri, bukan perintah Boss.  

⚡ Format command yang tersedia:
- /catat isi |
- /jadwal YYYY-MM-DD HH:MM isi |
- /lihatjadwal|
- /lihatcatat|
- /lihatcatat "keyword"|
- /laporan isi laporan kerja |
- /lihatlaporan

Konteks waktu: Sekarang ${tanggal}, jam ${jam}, masih ${waktu}.
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

const MEMORY_LIMIT = parseInt(process.env.MEMORY_LIMIT, 10) || 30;
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

async function callGemini(content, photoUrl = null) {
  try {
    const parts = [{ text: content }];

    if (photoUrl) {
      const res = await fetch(photoUrl);
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      const isPng = photoUrl.toLowerCase().endsWith(".png");
      parts.push({
        inline_data: {
          mime_type: isPng ? "image/png" : "image/jpeg",
          data: b64
        }
      });
    }

    const resp = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_KEY1}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }] }),
  }
);

    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error("Gemini API error:", err.message);
    return null;
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
exports.handler = async function (event) {
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
      } else {
        console.log("⚠️ Semua OpenRouter gagal, fallback ke Google Gemini API...");

        const geminiReply = await callGemini(contextText);
        if (geminiReply) {
          reply = geminiReply + "\n(Gemini API)";
          usedModel = "google/gemini-1.5-flash";
        } else {
          reply = `${reply} (AI error total, pakai fallback)`;
        }
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

     else if (cmd === "lapor") {
  const content = args.trim();
  if (!content) {
    await sendMessage(chatId, "Boss, isi laporan dulu! Contoh: `/lapor upload 30 image ke Adobe|`");
    return;
  }
//kirim laporan
else if (cmd === "kirimlaporan") {
  const url = `${GAS_URL}&cmd=sendTodayReportToBot`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  await sendMessage(chatId,
    data?.status === "ok"
      ? "Boss ✨ laporan hari ini sudah dikirim ke Ness."
      : "Boss ❌ gagal kirim laporan."
  );
}





//lain imi

  const now = new Date();
  const pad = n => n.toString().padStart(2, "0");
  const datetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const data = await forwardToNote("report", { datetime, content });

  await sendMessage(chatId,
    data?.status === "success"
      ? `Boss ✨ laporan tersimpan (${datetime}): ${content}`
      : `Boss ❌ gagal simpan laporan: ${data?.error || "unknown error"}`
  );
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
        const reply = `Boss ✨ Catatan:\n${lines}`;
        await sendMessage(chatId, reply);

        if (!userMemory[chatId]) userMemory[chatId] = [];
        userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
      }
else if (cmd === "lihatlaporan") {
  try {
    // URL GAS
    const url = "https://script.google.com/macros/s/AKfycbySQe6MVYTizv1hAGLKHLCw2AZ5iNIT8DftkBjRjjSJrEjMkhUXJDTwj3poLgSarvg9/exec?cmd=sendTodayReportToBot";
    
    // Panggil endpoint
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    const reply = `Laporan hari ini: ${JSON.stringify(data)}`;

    if (!userMemory[chatId]) userMemory[chatId] = [];
    userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });

    await sendMessage(chatId, reply);

  } catch (e) {
    console.error("Error lihatlaporan:", e);
    await sendMessage(chatId, "⚠️ Gagal ambil laporan, coba lagi nanti Boss.");
  }
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
        const reply = `Boss ✨ Jadwal:\n${lines}`;
        await sendMessage(chatId, reply);

        if (!userMemory[chatId]) userMemory[chatId] = [];
        userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
      }

      

     

      else if (cmd === "laporan") {
  const content = args.trim();
  if (!content) {
    await sendMessage(chatId, "Boss, isi laporan dulu! Contoh: `/laporan upload 20 image ke Adobe|`");
    continue;
  }

  const { tanggal, jam } = getWIBTimeInfo();
const datetime = `${tanggal} ${jam}`;
const data = await forwardToNote("report", { datetime, content });

  await sendMessage(
    chatId,
    data?.status === "success"
      ? `Boss ✨ laporan tersimpan (${tanggal}): ${content}`
      : `Boss ❌ gagal simpan laporan: ${data?.error || "unknown error"}`
  );
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
        } else {
          console.log("⚠️ Semua OpenRouter gagal, fallback ke Google Gemini API (vision)...");

          const geminiReply = await callGemini(caption, photoUrl);
          if (geminiReply) {
            reply = geminiReply + "\n(Gemini API Vision)";
            usedModel = "google/gemini-1.5-flash";
          } else {
            reply = `${reply} (AI error total, pakai fallback)`;
          }
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
    } else {
      console.log("⚠️ Semua OpenRouter gagal, fallback ke Google Gemini API...");

      const geminiReply = await callGemini(contextText);
      if (geminiReply) {
        reply = geminiReply + "\n(Gemini API)";
        usedModel = "google/gemini-1.5-flash";
      } else {
        reply = `${reply} (AI error total, pakai fallback)`;
      }
    }

    // 🔁 CEK APAKAH BALASAN AI MENGANDUNG COMMAND
    const aiCommands = [...reply.matchAll(commandRegex)];
    if (aiCommands.length > 0) {
      console.log(`Detected ${aiCommands.length} embedded command(s) in AI reply`);
      for (const m of aiCommands) {
        const fakeMessage = { ...message, text: m[0] };
        const fakeUpdate = { ...update, message: fakeMessage };
        const fakeEvent = { ...event, body: JSON.stringify(fakeUpdate) };
        await new Promise(r => setTimeout(r, 200));
        await exports.handler(fakeEvent);
      }
    }

    await sendMessage(chatId, reply);
    userMemory[chatId].push({ text: `Ness: ${reply}`, timestamp: Date.now() });
    userMemory[chatId] = summarizeContext(userMemory[chatId]);

    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  } catch (err) {
    console.error("Error Ness webhook:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};