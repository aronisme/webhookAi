const GAS_URL = "https://script.google.com/macros/s/AKfycbxyxYRrleVS8BA3pnt09QNpLCiZtLjdShnTvdTCLboJz0mDjTePFqcUl72oimJJxYgh/exec?auth=MYSECRET123";

exports.handler = async (event) => {
  const { httpMethod, rawQuery, body } = event;

  // ✅ Hanya izinkan metode GET dan POST
  if (!["GET", "POST"].includes(httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: "error", error: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" }
    };
  }

  try {
    if (httpMethod === "GET") {
      // 🔁 Teruskan query string ke Google Apps Script (GAS)
      const url = GAS_URL + (rawQuery ? `&${rawQuery}` : "");
      const response = await fetch(url);
      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { status: response.ok ? "success" : "error", raw: text };
      }

      return {
        statusCode: response.ok ? 200 : 500,
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
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
              headers: { "Content-Type": "application/json" }
            };
          }
        } catch {
          // Jika bukan JSON valid, tetap lanjutkan — biarkan GAS yang handle
        }
      }

      // 🔁 Teruskan body asli ke GAS
      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body || "",
      });

      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { status: response.ok ? "success" : "error", raw: text };
      }

      return {
        statusCode: response.ok ? 200 : 500,
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", error: err.message }),
      headers: { "Content-Type": "application/json" }
    };
  }
};
