const GAS_URL = process.env.GAS_URL || "https://script.google.com/macros/s/AKfycbwhOrxpe9Q7Iov5pwFyndAI-xv6_R8qXAJbdzgNM8NEFNKyN2J8NkPnFw0bEU5W1Z6c/exec?auth=MYSECRET123";

exports.handler = async (event) => {
  const { httpMethod, rawQuery, body } = event;

  if (!["GET", "POST"].includes(httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: "error", error: "Method Not Allowed" }),
    };
  }

  try {
    // === GET ===
    if (httpMethod === "GET") {
      // teruskan semua query, termasuk type, date, search, cmd
      const url = GAS_URL + (rawQuery ? `&${rawQuery}` : "");
      const response = await fetch(url);
      const ct = response.headers.get("content-type") || "";
      const txt = await response.text();

      return {
        statusCode: response.ok ? 200 : 500,
        body: ct.includes("application/json") ? txt : JSON.stringify({ status: "ok", data: txt }),
      };
    }

    // === POST ===
    if (httpMethod === "POST") {
      let jsonBody = null;
      if (body) {
        try {
          jsonBody = JSON.parse(body);
          const validTypes = ["note", "schedule", "report"];
          if (jsonBody.type && !validTypes.includes(jsonBody.type)) {
            return {
              statusCode: 400,
              body: JSON.stringify({ status: "error", error: "Invalid type" }),
            };
          }
        } catch {
          // kalau bukan JSON, lanjut saja (biar GAS yang handle)
        }
      }

      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body || "",
      });

      const ct = response.headers.get("content-type") || "";
      const txt = await response.text();

      return {
        statusCode: response.ok ? 200 : 500,
        body: ct.includes("application/json") ? txt : JSON.stringify({ status: "ok", data: txt }),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", error: err.message }),
    };
  }
};
