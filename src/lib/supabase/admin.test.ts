import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePrivilegedKey } from "./admin";

const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalSecretKey = process.env.SUPABASE_SECRET_KEY;

describe("Supabase privileged server key", () => {
  afterEach(() => {
    restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalServiceRoleKey);
    restoreEnv("SUPABASE_SECRET_KEY", originalSecretKey);
  });

  it("prefers the newer secret key when both privileged keys exist", () => {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service-role";

    expect(getSupabasePrivilegedKey()).toBe("sb_secret_test");
  });

  it("falls back to the legacy service role key", () => {
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service-role";

    expect(getSupabasePrivilegedKey()).toBe("legacy-service-role");
  });

  it("fails clearly when no server-only privileged key is configured", () => {
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabasePrivilegedKey()).toThrow(
      "Supabase privileged server key is not configured"
    );
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
