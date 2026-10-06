import { sessionVersion } from "./session-boundary";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const version = sessionVersion();
  const headers = new Headers(init.headers);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "same-origin",
      headers,
    });
  } catch (error) {
    if (init.signal?.aborted) {
      throw error;
    }
    throw new ApiError(
      "Could not connect. Check your connection and try again.",
      0,
    );
  }
  const body = await response.json().catch(() => null);
  if (version !== sessionVersion()) {
    throw new DOMException("Session changed.", "AbortError");
  }
  if (!response.ok) {
    if (response.status === 401 && !url.endsWith("/login")) {
      window.dispatchEvent(new Event("session-expired"));
    }
    throw new ApiError(
      Array.isArray(body?.message)
        ? body.message.join(" · ")
        : body?.message || "The request failed. Please try again.",
      response.status,
      body?.fieldErrors || {},
    );
  }

  return body as T;
}

export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
