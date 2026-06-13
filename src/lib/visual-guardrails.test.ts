import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

  it("keeps the homepage marquee as duplicated full-width editorial sequences", () => {
    const homeSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    const globalsSource = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const editorialHooks = [
      "THE GOOD K-BEAUTY EDIT",
      "PICKS WITH A POINT OF VIEW",
      "NO OVERTHINKING, JUST GOOD BEAUTY",
      "KOREAN BRANDS, BETTER CONTEXT",
      "YOUR NEXT BEAUTY FIND",
      "CURATED TO FEEL EASY",
      "LESS GUESSWORK, MORE GLOW",
      "FROM KOREA, EDITED FOR YOU"
    ];

    const missingHooks = editorialHooks.filter((hook) => !homeSource.includes(hook));

    expect(missingHooks).toEqual([]);
    expect(homeSource).toContain("marqueeMessages");
    expect(homeSource).toContain("shipk-marquee-sequence");
    expect(homeSource).toContain("Array.from({ length: 2 })");
    expect(globalsSource).toContain(".shipk-marquee-sequence");
    expect(globalsSource).toContain("border-top: 3px solid var(--shipk-black);");
    expect(globalsSource).toContain("border-bottom: 3px solid var(--shipk-black);");
    expect(globalsSource).toContain("flex-shrink: 0");
    expect(globalsSource).toContain("min-width: 100vw");
    expect(globalsSource).toContain("width: max-content");
    expect(globalsSource).toContain("animation: shipk-marquee-scroll 38s linear infinite;");
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

  it("keeps About page body, metadata, and footer buyer-facing", () => {
    const aboutSource = readFileSync(join(process.cwd(), "src/app/about/page.tsx"), "utf8");
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
      .filter((pattern) => pattern.test(`${aboutSource}\n${footerSource}`))
      .map((pattern) => pattern.toString());

    expect(matches).toEqual([]);
  });

  it("keeps the redesigned About page focused on guided K-beauty sets", () => {
    const aboutSource = readFileSync(join(process.cwd(), "src/app/about/page.tsx"), "utf8");
    const aboutScrollPath = join(process.cwd(), "src/components/about-scroll-experience.tsx");
    const oldAboutPatterns = [
      "shipk-marquee",
      "about-step-card",
      "about-product-rail",
      "about-product-rail-track",
      "about-trust-row",
      "about-redesign-hero-collage",
      "about-redesign-hero-orbit",
      "about-redesign-hero-proof",
      "Curated sets",
      "Use guidance"
    ];
    const unexpectedPatterns = oldAboutPatterns.filter((pattern) =>
      aboutSource.includes(pattern)
    );
    const aboutClassMatches = collectClassNameTokens(aboutSource).filter((token) =>
      /^about-(?!redesign-)/u.test(token)
    );

    expect(existsSync(aboutScrollPath)).toBe(true);
    expect(unexpectedPatterns).toEqual([]);
    expect(aboutClassMatches).toEqual([]);
    expect(aboutSource).toContain("Good K-beauty, easier to use.");
    expect(aboutSource).toContain("guided sets");
    expect(aboutSource).toContain("Korean skincare and makeup");
    expect(aboutSource).toContain("Korean brands");
    expect(aboutSource).toContain('href="#guided-story"');
    expect(aboutSource).toContain("/catalog-assets/generated/about-kbeauty-hero.png");
    expect(aboutSource).toContain("/catalog-assets/generated/about-routine-guide.png");
  });

  it("keeps Lenis scoped to the About scroll experience", () => {
    const aboutScrollPath = join(process.cwd(), "src/components/about-scroll-experience.tsx");
    const lenisImports = collectSourceFiles(sourceRoot)
      .flatMap((filePath) => findLenisImports(filePath))
      .map((match) => `${match.filePath}:${match.lineNumber}: ${match.line.trim()}`);

    expect(existsSync(aboutScrollPath)).toBe(true);
    expect(lenisImports).toEqual([
      `${aboutScrollPath}:3: import Lenis from "lenis";`
    ]);

    const scrollSource = readFileSync(aboutScrollPath, "utf8");

    expect(scrollSource).toContain("prefers-reduced-motion: reduce");
    expect(scrollSource).toContain("anchors: true");
    expect(scrollSource).toContain("cancelAnimationFrame");
    expect(scrollSource).toContain(".destroy()");
    expect(scrollSource).toContain("cleanupLenisAttributes");
    expect(scrollSource).toContain("rootElement.classList.remove");
    expect(scrollSource).toContain('rootElement.removeAttribute("style")');
    expect(scrollSource).toContain('bodyElement.removeAttribute("style")');
    expect(scrollSource).not.toMatch(/document\.body\.(classList|style|dataset)/u);
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

function findLenisImports(filePath: string) {
  if (filePath.endsWith("visual-guardrails.test.ts")) {
    return [];
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  return lines.flatMap((line, index) =>
    /from ["']lenis(?:\/react)?["']/u.test(line)
      ? [{ filePath, lineNumber: index + 1, line }]
      : []
  );
}

function collectClassNameTokens(source: string) {
  const directClassNames = [...source.matchAll(/className=["']([^"']+)["']/gu)].flatMap(
    (match) => match[1].split(/\s+/)
  );

  return directClassNames.filter(Boolean);
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
