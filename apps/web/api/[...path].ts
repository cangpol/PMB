/**
 * Proxy Vercel -> Backend Rust (Axum).
 *
 * Vercel hanya menyajikan frontend statis; backend API berjalan di server
 * terpisah (Render/Railway/Fly/VPS). Set Environment Variable di Vercel:
 *
 *   BACKEND_URL = https://alamat-backend-anda.example.com
 *
 * Seluruh permintaan /api/* diteruskan apa adanya (termasuk cookie sesi),
 * sehingga browser tetap berbicara ke satu origin (tanpa masalah CORS/cookie).
 */
export const config = { runtime: "edge" };

const HOP_BY_HOP = [
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-length",
];

function jsonError(status: number, kode: string, pesan: string): Response {
  return new Response(JSON.stringify({ kode, pesan, detail: [] }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const backend = (
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.BACKEND_URL ?? ""
  ).replace(/\/+$/, "");

  if (!backend) {
    return jsonError(
      503,
      "BACKEND_BELUM_DIKONFIGURASI",
      "Server API PMB belum dikonfigurasi. Hubungi administrator (BACKEND_URL belum diatur di Vercel).",
    );
  }

  const url = new URL(req.url);
  const headers = new Headers(req.headers);
  for (const h of HOP_BY_HOP) headers.delete(h);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", "https");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  try {
    const upstream = await fetch(`${backend}${url.pathname}${url.search}`, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      redirect: "manual",
      // @ts-expect-error: diperlukan runtime untuk streaming body
      duplex: "half",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  } catch {
    return jsonError(
      502,
      "BACKEND_TIDAK_TERJANGKAU",
      "Server API PMB tidak dapat dihubungi. Silakan coba beberapa saat lagi.",
    );
  }
}
