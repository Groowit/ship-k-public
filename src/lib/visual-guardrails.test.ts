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

  it("keeps authored product UI surfaces shadow-free", () => {
    const matches = collectSourceFiles(sourceRoot)
      .flatMap((filePath) => findForbiddenSurfaceShadows(filePath))
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

  it("keeps About page body, metadata, header, and footer buyer-facing", () => {
    const aboutSource = readFileSync(join(process.cwd(), "src/app/about/page.tsx"), "utf8");
    const headerSource = readFileSync(
      join(process.cwd(), "src/components/site-header.tsx"),
      "utf8"
    );
    const footerSource = readFileSync(
      join(process.cwd(), "src/components/site-footer.tsx"),
      "utf8"
    );
    const forbiddenBuyerStoryPatterns = [
      /\/promoter\b/iu,
      /\bpromoter\b/iu,
      /\bcreator\b/iu,
      /\bcommission\b/iu,
      /\baffiliate\b/iu,
      /\bseller\b/iu,
      /\bsell with\b/iu,
      /\bbrand[- ]owner\b/iu
    ];

    const matches = forbiddenBuyerStoryPatterns
      .filter((pattern) => pattern.test(`${aboutSource}\n${headerSource}\n${footerSource}`))
      .map((pattern) => pattern.toString());

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

function findForbiddenSurfaceShadows(filePath: string) {
  if (filePath.endsWith("visual-guardrails.test.ts")) {
    return [];
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const forbiddenPatterns = [
    /shadow-\[/u,
    /\bshadow-(?:sm|md|lg|xl|2xl)\b/u,
    /\bdrop-shadow\b/u,
    /box-shadow\s*:/u
  ];

  return lines.flatMap((line, index) =>
    forbiddenPatterns.some((pattern) => pattern.test(line))
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
