import { getAppUrl } from "./env";

export class UnsafeRequestOriginError extends Error {
  status = 403;

  constructor() {
    super("Request origin is not allowed");
  }
}

export function assertSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }

  const allowedOrigins = new Set<string>();
  allowedOrigins.add(new URL(request.url).origin);

  try {
    allowedOrigins.add(new URL(getAppUrl()).origin);
  } catch {
    // A malformed app URL should not make an otherwise same-origin request fail.
  }

  try {
    if (!allowedOrigins.has(new URL(origin).origin)) {
      throw new UnsafeRequestOriginError();
    }
  } catch (error) {
    if (error instanceof UnsafeRequestOriginError) {
      throw error;
    }
    throw new UnsafeRequestOriginError();
  }
}
