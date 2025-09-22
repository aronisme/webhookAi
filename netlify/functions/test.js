const GAS_URL = process.env.GAS_URL; // WebApp URL GAS

exports.handler = async (event) => {
  try {
    const query = event.queryStringParameters || {};
    const mode = query.mode || "ping";
    const text = query.text || "";
    const limit = query.limit || "5";
    const id = query.id || "";

    let payload = { command: mode };

    // Sesuaikan payload berdasarkan mode
    if (mode === "addnote") {
      payload.text = text || "Catatan test dari Ness";
    }

    if (mode === "listnotes") {
      payload.limit = limit;
    }

    if (mode === "addschedule") {
      payload.text = text || "Meeting penting | 2025-09-23T09:00";
    }

    if (mode === "listschedule") {
      payload.limit = limit;
    }

    if (mode === "completeschedule") {
      payload.id = id || text; // bisa isi di kolom input
    }

    if (mode === "ping") {
      payload.text = text || "halo dari Netlify";
    }

    // Kirim ke GAS
    const params = new URLSearchParams(payload);
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          ok: true,
          mode,
          sent: payload,
          received: data,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
