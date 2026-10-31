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
      errorData = {
        kode: "KESALAHAN_HTTP",
        pesan: `Permintaan gagal dengan status ${response.status}`,
        detail: [response.statusText],
      };
    }
    throw errorData;
  }

  return response.json();
}
