const gasUrl = "https://script.google.com/macros/s/AKfycbwIQnuu0r1FzTldR6D8tkWh9q_9xJMtlqrepLWhw6ln5h3wiHT97jZDUBV06omqnPrR/exec?auth=MYSECRET123";

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    try {
      const url = gasUrl + (event.rawQuery ? "&" + event.rawQuery : "");
      const response = await fetch(url);
      const text = await response.text();
      return { statusCode: response.ok ? 200 : 500, body: text };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ status: "error", error: err.message }) };
    }
  }

  if (event.httpMethod === "POST") {
    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body,
      });
      const text = await response.text();
      return { statusCode: response.ok ? 200 : 500, body: text };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ status: "error", error: err.message }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ status: "error", error: "Method Not Allowed" }) };
};
