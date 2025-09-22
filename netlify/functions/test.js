// netlify/functions/test.js
const GAS_URL = process.env.GAS_URL; // set di Netlify dashboard

exports.handler = async (event) => {
  try {
    if (!GAS_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: "GAS_URL not set in environment" }),
      };
    }

    const query = event.queryStringParameters || {};
    const mode = query.mode || "ping";
    const text = query.text || "";
    const limit = query.limit || "5";
    const id = query.id || "";

    let payload = { command: mode };

    // Mode → payload
    if (mode === "addnote") payload.text = text || "Catatan test dari Netlify";
    if (mode === "listnotes") payload.limit = limit;
    if (mode === "addschedule") payload.text = text || "Meeting penting | 2025-09-23T09:00";
    if (mode === "listschedule") payload.limit = limit;
    if (mode === "completeschedule") payload.id = id || text;
    if (mode === "ping") payload.text = text || "halo dari Netlify";

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
