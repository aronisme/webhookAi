// netlify/functions/note.js
exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed, gunakan POST" }),
    };
  }

  try {
    // Parse data dari form-urlencoded atau JSON
    let note = "";
    const contentType = event.headers["content-type"] || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(event.body);
      note = params.get("note");
    } else if (contentType.includes("application/json")) {
      const body = JSON.parse(event.body);
      note = body.note;
    }

    if (!note) {
      return {
        statusCode: 400,
        body: JSON.stringify({ status: "error", error: "Note kosong" }),
      };
    }

    // Simulasi penyimpanan (nanti bisa diganti DB/Firestore/dll)
    console.log("Note diterima:", note);

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "success", note }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", error: err.message }),
    };
  }
};
