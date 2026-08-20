const API_TIMEOUT_MS = 5000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Named so callers can distinguish a slow-response timeout from a real
      // failure (e.g. event registration treats a timeout as an optimistic
      // success, since the Odoo record is usually already created).
      const timeoutError = new Error("Request timed out — Odoo took too long to respond.");
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
