const GAS_URL = process.env.GAS_URL; // URL WebApp GAS kamu

exports.handler = async () => {
  try {
    // payload sederhana untuk cek koneksi
    const params = new URLSearchParams();
    params.append("command", "ping");
    params.append("text", "halo dari Netlify");

    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Koneksi ke GAS berhasil",
        received: data,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
