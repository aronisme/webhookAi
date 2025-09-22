export async function handler() {
  try {
    const GAS_URL = process.env.GAS_URL;

    const payload = { command: "catat", text: "Coba simpan catatan dari halaman utama" };

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
      body: JSON.stringify({ status: "error", message: err.message }),
    };
  }
}
