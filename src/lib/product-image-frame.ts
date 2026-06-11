const catalogAspectRules = [
  { match: "/detail/", className: "aspect-video" },
  { match: "/sets/", className: "aspect-[3/2]" },
  { match: "/singles/", className: "aspect-[4/5]" },
  { match: "/single-products/", className: "aspect-[4/5]" },
  { match: "/brand-samples/", className: "aspect-square" }
] as const;

export function getProductImageFrameAspectClass(imagePath: string) {
  const normalizedPath = imagePath.toLowerCase();

  for (const rule of catalogAspectRules) {
    if (normalizedPath.includes(rule.match)) {
      return rule.className;
    }
  }

  if (normalizedPath.includes("/catalog-assets/") && normalizedPath.endsWith(".jpg")) {
    return "aspect-[4/5]";
  }

  return "aspect-[3/2]";
}
