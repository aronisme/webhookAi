// netlify/functions/note.js

const gasUrl =
  "https://script.google.com/macros/s/AKfycbw3ip8m4J1OfOckfsVp4jwIOi6pKF36o27Y1OGuwtJ2BIqdCmtYI6bcExzalh7mMzo/exec";
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ status: "error", error: "Method Not Allowed" }) };
  }

  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: event.body,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: "error", error: "Invalid response from GAS", raw: text };
    }

    return { statusCode: response.ok ? 200 : 500, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ status: "error", error: err.message }) };
  }
};