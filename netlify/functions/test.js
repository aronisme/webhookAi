const GAS_URL = process.env.GAS_URL;

exports.handler = async (event) => {
  try {
    const mode = (event.queryStringParameters.mode || "addnote").toLowerCase();

    let params = new URLSearchParams();

    if (mode === "addnote") {
      params.append("command", "addnote");
      params.append("text", "Catatan dari tombol test");
    } else if (mode === "listnotes") {
      params.append("command", "listnotes");
      params.append("limit", "5");
    } else if (mode === "addschedule") {
      params.append("command", "addschedule");
      params.append("text", "Meeting Project | 2025-09-23T09:00");
    } else if (mode === "listschedule") {
      params.append("command", "listschedule");
      params.append("limit", "5");
    } else if (mode === "completeschedule") {
      params.append("command", "completeschedule");
      params.append("id", "ISI_ID_JADWAL");
    }

    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        mode,
        sent: Object.fromEntries(params),
        received: data,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
