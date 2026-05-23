import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("local dev server port policy", () => {
  it("runs the app through the fixed port 3000 dev wrapper", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as { scripts: Record<string, string> };
    const devServerSource = readFileSync(
      join(process.cwd(), "scripts/dev-server.mjs"),
      "utf8"
    );

    expect(packageJson.scripts.dev).toBe("node scripts/dev-server.mjs");
    expect(devServerSource).toContain('const DEV_PORT = "3000"');
    expect(devServerSource).toContain("closePort(DEV_PORT)");
    expect(devServerSource).toContain('"--port", DEV_PORT');
  });

  it("keeps Playwright attached to port 3000", () => {
    const playwrightConfig = readFileSync(
      join(process.cwd(), "playwright.config.ts"),
      "utf8"
    );

    expect(playwrightConfig).toContain('"http://127.0.0.1:3000"');
    expect(playwrightConfig).not.toMatch(/30(?:01|02|03)/u);
  });
});
