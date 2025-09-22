export async function handler(event, context) {
  try {
    const GAS_URL = process.env.GAS_URL; // pastikan ada di env Netlify
    const payload = {
      type: "test",
      note: "Coba simpan catatan dari halaman utama",
      schedule: "Besok jam 9 meeting",
    };

    // relay ke GAS
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        sent: payload,
        received: data,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        message: err.message,
        stack: err.stack,
      }),
    };
  }
}
