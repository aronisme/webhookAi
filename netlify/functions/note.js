const gasUrl = "https://script.google.com/macros/s/AKfycbzH2e5az5nly_TrmT2vy29lrb_nAh7Zb3fQjk5g_HNj6WZe8qjNBtPTifgesiBCmxwx/exec?auth=MYSECRET123";

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
