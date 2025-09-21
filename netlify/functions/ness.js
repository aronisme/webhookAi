const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = "1296836457"; // Chat ID Boss

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const message = body.message?.text || "Boss, Ness standby 🚀";

    // === Kirim aksi typing biar natural ===
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, action: "typing" }),
    });

    // Delay 1,5 detik → kesan lagi ngetik
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // === Kirim balasan ===
    const reply = `Boss ✨ Ness catat pesan: "${message}"`;
    const tgRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: reply }),
    });

    const tgData = await tgRes.json();
    console.log("Telegram response:", JSON.stringify(tgData, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, sent: reply }),
    };

  } catch (err) {
    console.error("Ness.js error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
