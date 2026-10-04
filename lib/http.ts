/** Client-side JSON fetch with a hard timeout. Throws on network error, timeout or non-2xx. */
export async function fetchJSON<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 12_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (rest.signal) rest.signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function postJSON<T>(url: string, body: unknown, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  return fetchJSON<T>(url, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    body: JSON.stringify(body),
  });
}
