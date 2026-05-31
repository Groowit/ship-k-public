import { getAppUrl } from "./env";

const localLoopbackHosts = ["localhost", "127.0.0.1", "[::1]"];

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
  addAllowedOrigin(allowedOrigins, request.url);

  try {
    addAllowedOrigin(allowedOrigins, getAppUrl());
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

function addAllowedOrigin(allowedOrigins: Set<string>, rawUrl: string) {
  const url = new URL(rawUrl);
  allowedOrigins.add(url.origin);

  if (process.env.NODE_ENV === "production" || !isLoopbackHost(url.hostname)) {
    return;
  }

  const port = url.port ? `:${url.port}` : "";
  for (const host of localLoopbackHosts) {
    allowedOrigins.add(`${url.protocol}//${host}${port}`);
  }
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
