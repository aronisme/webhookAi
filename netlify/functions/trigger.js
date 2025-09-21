const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const chatId = "1296836457"; // Chat ID Boss Aron

async function callGemini(cmd) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "system",
            content: "Kamu Ness, asisten pribadi cewek, friendly, ramah, santai. Selalu manggil user dengan sebutan 'Boss'.",
          },
          {
            role: "user",
            content: `Sebagai asisten lakukan tugas "${cmd}". Jangan formal, gaya ngobrol santai + emoji.`,
          },
        ],
      }),
    });

    const data = await res.json();
    console.log("Gemini response:", JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }

    throw new Error(data.error?.message || "Unknown Gemini error");
  } catch (err) {
    console.error("Gemini error:", err.message);
    return `Boss ✨ Ness hadir 🚀 (AI error: ${err.message})`;
  }
}

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const cmd = params.cmd || "sapaan pagi";

    const text = await callGemini(cmd);

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }
    );

    const tgData = await tgRes.json();
    console.log("Telegram response:", JSON.stringify(tgData, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "Triggered Ness OK", text }),
    };
  } catch (err) {
    console.error("Trigger error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Trigger failed", detail: err.message }),
    };
  }
};
