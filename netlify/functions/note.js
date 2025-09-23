// netlify/functions/note.js
const fetch = require("node-fetch");

const gasUrl =
  "https://script.google.com/macros/s/AKfycbxD_VyFL0GCC2gVFmpa4ckjh7wweEnx6-Ry3MLgMXiQOofyDdSgzuV-lqeOTHWHJA3s/exec";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ status: "error", error: "Method Not Allowed" }),
    };
  }

  try {
    // Forward body langsung ke GAS (tetap form-urlencoded)
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: event.body,
    });

    const text = await response.text();

    // Pastikan respon bisa JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: "error", error: "Invalid response from GAS", raw: text };
    }

    return {
      statusCode: response.ok ? 200 : 500,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", error: err.message }),
    };
  }
};
