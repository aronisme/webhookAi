const GAS_URL = process.env.GAS_URL;   // simpan full URL tanpa auth
const AUTH_SECRET = process.env.AUTH_SECRET; // taruh "MYSECRET123" di sini

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
      console.log("[NOTE] GET → Forward to GAS:", rawQuery || "(no query)");

      let url = GAS_URL;
      if (rawQuery) {
        url += rawQuery.startsWith("?") ? rawQuery : `?${rawQuery}`;
      }
      // tambahin auth secret di query
      url += (url.includes("?") ? "&" : "?") + `auth=${AUTH_SECRET}`;

      const response = await fetch(url);
      const text = await response.text();

      return { statusCode: response.ok ? 200 : 500, body: text };
    }

    if (httpMethod === "POST") {
      console.log("[NOTE] POST → Forward to GAS:", body ? "JSON body" : "empty");

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
          // biarkan GAS handle kalau bukan JSON valid
        }
      }

      const url = `${GAS_URL}?auth=${AUTH_SECRET}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body || "",
      });

      const text = await response.text();
      return { statusCode: response.ok ? 200 : 500, body: text };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", error: err.message }),
    };
  }
};
