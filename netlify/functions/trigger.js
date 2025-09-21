const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const chatId = "1296836457"; // chat ID Boss Aron

exports.handler = async (event) => {
  try {
    // teks bisa dikirim manual dari GAS (query param) atau default
    const params = event.queryStringParameters || {};
    const text = params.text || "Halo Boss Aron, Ness hadir 🚀";

    // kirim ke Telegram
    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      }
    );
    const data = await tgRes.json();
    console.log("Telegram response:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "Triggered Ness OK" }),
    };
  } catch (err) {
    console.error("Trigger error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Trigger failed" }),
    };
  }
};
