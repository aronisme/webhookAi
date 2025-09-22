export async function handler(event) {
  try {
    const GAS_URL = process.env.GAS_URL;

    // mode bisa dikirim lewat query param, default: addnote
    const params = new URLSearchParams(event.queryStringParameters);
    const mode = (params.get("mode") || "addnote").toLowerCase();

    let payload = {};

    switch (mode) {
      case "addnote":
        payload = { command: "addnote", text: "Catatan dari tombol test" };
        break;
      case "listnotes":
        payload = { command: "listnotes", limit: 5 };
        break;
      case "addschedule":
        payload = { command: "addschedule", text: "Meeting Tim | besok 09:00" };
        break;
      case "listschedule":
        payload = { command: "listschedule", limit: 5 };
        break;
      case "completeschedule":
        payload = { command: "completeschedule", id: "ISI_ID_JADWAL" };
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: "Mode tidak dikenal: " + mode })
        };
    }

    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.text();

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        mode,
        sent: payload,
        received: data,
        timestamp: new Date().toISOString()
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
}
