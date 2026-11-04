// API Client & Service PMB Universitas Pignatelli Triputra
// Contract-First Architecture

export interface ApiError {
  kode: string;
  pesan: string;
  detail: string[];
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : endpoint;
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      // Balasan bukan JSON = bukan dari API PMB (mis. hosting tanpa backend)
      const server = response.status === 404 || response.status >= 500;
      errorData = {
        kode: server ? "LAYANAN_TIDAK_TERSEDIA" : "KESALAHAN_HTTP",
        pesan: server
          ? `Layanan server PMB belum dapat dihubungi (HTTP ${response.status}). Silakan coba lagi nanti atau hubungi panitia PMB.`
          : `Permintaan gagal dengan status ${response.status}`,
        detail: [response.statusText],
      };
    }
    throw errorData;
  }

  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw {
      kode: "LAYANAN_TIDAK_TERSEDIA",
      pesan:
        "Layanan server PMB memberikan respons tidak valid. Silakan coba lagi nanti.",
      detail: [],
    } satisfies ApiError;
  }
}
