const GAS_URL = "https://script.google.com/macros/s/AKfycbySQe6MVYTizv1hAGLKHLCw2AZ5iNIT8DftkBjRjjSJrEjMkhUXJDTwj3poLgSarvg9/exec?auth=MYSECRET123";

exports.handler = async (event) => {
  const { httpMethod, rawQuery, body } = event;

  // ✅ Hanya izinkan metode GET dan POST
  if (!["GET", "POST"].includes(httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: "error", error: "Method Not Allowed" }),
    };
  }

  try {
    if (httpMethod === "GET") {
      // 🔁 Teruskan query string ke Google Apps Script (GAS)
      const url = GAS_URL + (rawQuery ? `&${rawQuery}` : "");
      const response = await fetch(url);
      const text = await response.text();

      return {
        statusCode: response.ok ? 200 : 500,
        body: text,
      };
    }

    if (httpMethod === "POST") {
      // 🔍 Validasi payload (opsional, hanya jika berupa JSON valid)
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
          // Jika bukan JSON valid, tetap lanjutkan — biarkan GAS menangani
        }
      }

      // 🔁 Teruskan body asli ke GAS
      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body || "",
      });

      const text = await response.text();

      return {
        statusCode: response.ok ? 200 : 500,
        body: text,
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", error: err.message }),
    };
  }
};