/**
 * Script Pengujian Beban (Load Testing Benchmark)
 * Sistem PMB Universitas Pignatelli Triputra
 * Mengukur throughput (RPS), latensi riil (p50, p95, p99), dan tingkat kesalahan (error rate).
 */

const http = require("http");

const BASE_URL = process.env.TARGET_URL || "http://127.0.0.1:8080";

function parseUrl(urlStr) {
  const u = new URL(urlStr);
  return {
    hostname: u.hostname,
    port: u.port || (u.protocol === "https:" ? 443 : 80),
    path: u.pathname + u.search,
  };
}

async function sendRequest(method, path, body, headers = {}) {
  const urlObj = parseUrl(BASE_URL + path);
  const data = body ? JSON.stringify(body) : null;

  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();

    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.path,
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data ? Buffer.byteLength(data) : 0,
          ...headers,
        },
        timeout: 10000,
      },
      (res) => {
        let resBody = "";
        res.on("data", (chunk) => {
          resBody += chunk;
        });
        res.on("end", () => {
          const endTime = process.hrtime.bigint();
          const latencyMs = Number(endTime - startTime) / 1e6;
          resolve({
            statusCode: res.statusCode,
            latencyMs,
            success: res.statusCode >= 200 && res.statusCode < 400,
          });
        });
      }
    );

    req.on("error", (err) => {
      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1e6;
      resolve({
        statusCode: 0,
        latencyMs,
        success: false,
        error: err.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        statusCode: 408,
        latencyMs: 10000,
        success: false,
        error: "Timeout",
      });
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

function calculatePercentile(latencies, percentile) {
  if (latencies.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * latencies.length) - 1;
  return latencies[Math.max(0, Math.min(index, latencies.length - 1))];
}

async function runScenario(scenarioName, requestFn, totalRequests, concurrency) {
  console.log(`\n========================================================================`);
  console.log(`[UJI BEBAN] Skenario: ${scenarioName}`);
  console.log(`Target: ${BASE_URL} | Total: ${totalRequests} req | Konkurensi: ${concurrency}`);
  console.log(`========================================================================`);

  const latencies = [];
  let successCount = 0;
  let failCount = 0;
  let statusCodes = {};

  const overallStart = process.hrtime.bigint();

  let completed = 0;
  const queue = Array.from({ length: totalRequests }, (_, i) => i);

  async function worker() {
    while (queue.length > 0) {
      const idx = queue.shift();
      if (idx === undefined) break;

      const res = await requestFn(idx);
      latencies.push(res.latencyMs);

      statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;
      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }

      completed++;
      if (completed % 25 === 0 || completed === totalRequests) {
        process.stdout.write(` Progress: ${completed}/${totalRequests} (${Math.round((completed/totalRequests)*100)}%)\r`);
      }
    }
  }

  // Jalankan worker konkurensi
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const overallEnd = process.hrtime.bigint();
  const totalDurationSec = Number(overallEnd - overallStart) / 1e9;

  latencies.sort((a, b) => a - b);

  const rps = totalRequests / totalDurationSec;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const p50 = calculatePercentile(latencies, 50);
  const p90 = calculatePercentile(latencies, 90);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

  console.log(`\n--- Hasil Pengukuran Riil: ${scenarioName} ---`);
  console.log(`Durasi Pengujian:   ${totalDurationSec.toFixed(2)} detik`);
  console.log(`Throughput (RPS):   ${rps.toFixed(1)} req/detik`);
  console.log(`Total Berhasil:     ${successCount} / ${totalRequests} (${((successCount/totalRequests)*100).toFixed(1)}%)`);
  console.log(`Total Gagal:        ${failCount}`);
  console.log(`Rincian HTTP Status: ${JSON.stringify(statusCodes)}`);
  console.log(`Latensi Rata-rata:  ${avg.toFixed(2)} ms`);
  console.log(`Latensi p50 (Median): ${p50.toFixed(2)} ms`);
  console.log(`Latensi p90:        ${p90.toFixed(2)} ms`);
  console.log(`Latensi p95:        ${p95.toFixed(2)} ms`);
  console.log(`Latensi p99:        ${p99.toFixed(2)} ms`);
  console.log(`Latensi Min / Max:  ${min.toFixed(2)} ms / ${max.toFixed(2)} ms`);

  return {
    scenario: scenarioName,
    rps: rps.toFixed(1),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    successRate: `${((successCount/totalRequests)*100).toFixed(1)}%`,
    statusCodes,
  };
}

async function main() {
  console.log(`\nMemulai Benchmark Uji Beban Sistem PMB...`);
  console.log(`Waktu Pengujian: ${new Date().toISOString()}`);

  const results = [];

  // Skenario 1: Healthcheck & Public API Probe (Verifikasi Responsivitas)
  results.push(
    await runScenario(
      "1. Healthcheck & Liveness Endpoint Probe",
      () => sendRequest("GET", "/api/health/live"),
      100,
      20
    )
  );

  // Skenario 2: Beban Konkuren Pengambilan Konten & Berita CMS
  results.push(
    await runScenario(
      "2. Akses Publik Warta Berita & CMS Posts",
      () => sendRequest("GET", "/api/cms/posts"),
      100,
      20
    )
  );

  // Skenario 3: Webhook Pembayaran Burst (Proteksi Idempotensi & Signature)
  results.push(
    await runScenario(
      "3. Webhook Pembayaran Gateway Burst",
      (idx) =>
        sendRequest(
          "POST",
          "/api/pembayaran/webhook/mock",
          {
            order_id: `LOAD-TEST-ORDER-${idx % 10}`,
            status_transaksi: "settlement",
            jumlah: 250000,
            signature: "mock_signature_test",
          }
        ),
      60,
      15
    )
  );

  console.log(`\n========================================================================`);
  console.log(`RINGKASAN AKHIR PENGUKURAN UJI BEBAN RIIL`);
  console.log(`========================================================================`);
  console.table(results);
}

main().catch(console.error);

