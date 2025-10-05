const GAS_URL = process.env.GAS_URL; // simpan di ENV, jangan hardcode

exports.handler = async (event) => {
  const { httpMethod, rawQuery, body } = event;

  if (!["GET", "POST"].includes(httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: "error", error: "Method Not Allowed" }),
    };
  }

  try {
    if (httpMethod === "GET") {
      const url = GAS_URL + (rawQuery ? `&${rawQuery}` : "");
      const response = await fetch(url);
      const text = await response.text();

      return {
        statusCode: response.ok ? 200 : 500,
        body: text,
      };
    }

    if (httpMethod === "POST") {
      // ✅ Validasi payload type
      if (body) {
        try {
          const jsonBody = JSON.parse(body);
          const validTypes = ["note", "schedule", "report"];
          if (jsonBody.type && !validTypes.includes(jsonBody.type)) {
            return {
              statusCode: 400,
              body: JSON.stringify({ status: "error", error: "Invalid type" }),
            };
          }
        } catch {
          // kalau bukan JSON valid, terusin ke GAS
        }
      }

      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body || "",
      });

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { status: response.ok ? "success" : "error", raw: text };
      }

      return {
        statusCode: response.ok ? 200 : 500,
        body: JSON.stringify(json),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", error: err.message }),
    };
  }
};
