const gasUrl = "https://script.google.com/macros/s/AKfycby6RDmsMaNlz1RYGi0MMRtIAJYc4pUw6rGtqJIhz8yxpslHwAl2ZmdiIKgL2EMiX-9c/exec?auth=MYSECRET123";

exports.handler = async (event) => {
  // Hanya izinkan metode GET & POST
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: "error", error: "Method Not Allowed" }),
    };
  }

  try {
    if (event.httpMethod === "GET") {
      // forward query string ke GAS
      const url = gasUrl + (event.rawQuery ? "&" + event.rawQuery : "");
      const response = await fetch(url);
      const text = await response.text();
      return { statusCode: response.ok ? 200 : 500, body: text };
    }

    if (event.httpMethod === "POST") {
      // Validasi tipe data (opsional)
      try {
        const body = JSON.parse(event.body);
        if (
          body.type &&
          !["note", "schedule", "event"].includes(body.type)
        ) {
          return {
            statusCode: 400,
            body: JSON.stringify({ status: "error", error: "Invalid type" }),
          };
        }
      } catch {
        // kalau bukan JSON, biarin diterusin apa adanya
      }

      // forward ke GAS
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body,
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
