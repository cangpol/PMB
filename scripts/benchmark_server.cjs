const http = require("http");

const PORT = 8080;

// Rate limiting sliding window in-memory
const rateLimitWindow = 60000; // 1 menit
const maxRequestsPerMinute = 120;
const ipRequests = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = ipRequests.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < rateLimitWindow);
  if (validTimestamps.length >= maxRequestsPerMinute) {
    return false;
  }
  validTimestamps.push(now);
  ipRequests.set(ip, validTimestamps);
  return true;
}

const server = http.createServer((req, res) => {
  const ip = req.socket.remoteAddress || "127.0.0.1";

  // Rate Limiting check
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        kode: "TERLALU_BANYAK_PERMINTAAN",
        pesan: "Batas frekuensi permintaan terlampaui.",
      })
    );
  }

  // Security Headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Type", "application/json");

  const url = req.url.split("?")[0];

  if (req.method === "GET" && (url === "/api/health/live" || url === "/health/live")) {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
  }

  if (req.method === "GET" && (url === "/api/health/ready" || url === "/health/ready")) {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ready", database: "connected", redis: "connected" }));
  }

  if (req.method === "GET" && url === "/api/cms/posts") {
    const posts = [
      {
        id: "1",
        judul: "Pendaftaran Mahasiswa Baru UPITRA 2026/2027 Resmi Dibuka",
        slug: "pendaftaran-pmb-2026-dibuka",
        kategori: "PENGUMUMAN",
        ringkasan: "Universitas Pignatelli Triputra membuka 4 jalur seleksi.",
        is_published: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        judul: "Program Beasiswa Penuh Triputra Group 2026",
        slug: "program-beasiswa-triputra-2026",
        kategori: "BEASISWA",
        ringkasan: "Kesempatan kuliah bebas biaya 100% dan ikatan kerja.",
        is_published: true,
        created_at: new Date().toISOString(),
      },
    ];
    res.writeHead(200);
    return res.end(JSON.stringify(posts));
  }

  if (req.method === "POST" && url === "/api/pembayaran/webhook/mock") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        if (!payload.order_id) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Missing order_id" }));
        }
        res.writeHead(200);
        return res.end(
          JSON.stringify({
            status: "success",
            order_id: payload.order_id,
            transaksi_status: "settlement",
            pesan: "Pembayaran terverifikasi dan langkah pendaftaran diperbarui.",
          })
        );
      } catch {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[BENCHMARK SERVER] Aktif mendengarkan di http://127.0.0.1:${PORT}`);
});

