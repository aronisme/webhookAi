const GAS_URL = "https://script.google.com/macros/s/AKfycbxp1UkOKsWr0QGcmktmK2WPMrpSkVubA4Xr-QJtevMLt-6ejZPfBKMDUiOycwuzuc7n/exec?auth=MYSECRET123";


// Update 2025-10: mendukung type=report (laporan harian dari webhook Ness)

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
      console.log("[NOTE] GET → Forward to GAS:", rawQuery || "(no query)");

      // Pastikan tanda tanya di URL benar
      let url = GAS_URL;
      if (rawQuery) {
        url += rawQuery.startsWith("?") ? rawQuery : `?${rawQuery}`;
      }

      const response = await fetch(url);
      const text = await response.text();

      return {
        statusCode: response.ok ? 200 : 500,
        body: text,
      };
    }

    if (httpMethod === "POST") {
      console.log("[NOTE] POST → Forward to GAS:", body ? "JSON body" : "empty");

      // 🔍 Validasi payload (opsional, hanya jika berupa JSON valid)
      if (body) {
        try {
          const jsonBody = JSON.parse(body);
          const validTypes = ["note", "schedule", "event", "report"]; // ✅ report ditambahkan
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

      // 🔁 Teruskan body asli ke GAS (jangan diubah)
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