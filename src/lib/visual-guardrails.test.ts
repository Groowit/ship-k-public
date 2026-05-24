import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");
const sourceExtensions = new Set([".css", ".ts", ".tsx"]);

describe("visual effect guardrails", () => {
  it("does not reintroduce pink bottom-right pop shadows", () => {
    const matches = collectSourceFiles(sourceRoot)
      .flatMap((filePath) => findForbiddenPinkPopShadows(filePath))
      .map((match) => `${match.filePath}:${match.lineNumber}: ${match.line.trim()}`);

    expect(matches).toEqual([]);
  });

  it("declares global smooth scrolling to the Next.js router", () => {
    const layoutSource = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

    expect(layoutSource).toContain('data-scroll-behavior="smooth"');
  });

  it("keeps account auth forms free of pop-shadow button styles", () => {
    const authFormSource = readFileSync(
      join(process.cwd(), "src/components/auth-form.tsx"),
      "utf8"
    );

    expect(authFormSource).not.toContain("shipk-btn-pop");
    expect(authFormSource).not.toMatch(/shadow-\[[^\]]*_[^\]]*_0_/u);
  });

  it("keeps the client Button component out of server component imports", () => {
    const matches = collectSourceFiles(sourceRoot)
      .flatMap((filePath) => findServerButtonImports(filePath))
      .map((match) => `${match.filePath}:${match.lineNumber}: ${match.line.trim()}`);

    expect(matches).toEqual([]);
  });
});

function findForbiddenPinkPopShadows(filePath: string) {
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  return lines.flatMap((line, index) =>
    /shadow-\[[^\]]*#(?:ffd6e3|ff3d7f)[^\]]*\]/i.test(line)
      ? [{ filePath, lineNumber: index + 1, line }]
      : []
  );
}

function findServerButtonImports(filePath: string) {
  if (filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx")) {
    return [];
  }

  const source = readFileSync(filePath, "utf8");
  if (/^\s*["']use client["'];/u.test(source)) {
    return [];
  }

  const lines = source.split(/\r?\n/);
  return lines.flatMap((line, index) =>
    /from ["']@\/components\/ui\/button["']/u.test(line)
      ? [{ filePath, lineNumber: index + 1, line }]
      : []
  );
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return collectSourceFiles(path);
    }

    return sourceExtensions.has(getExtension(path)) ? [path] : [];
  });
}

function getExtension(path: string) {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex === -1 ? "" : path.slice(dotIndex);
}
