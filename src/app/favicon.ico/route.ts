const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#ffffff"/>
  <text x="9" y="42" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900" fill="#111111">ship</text>
  <text x="43" y="42" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900" fill="#ff3d7f">K</text>
</svg>`;

export const dynamic = "force-static";

export function GET() {
  return new Response(faviconSvg, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/svg+xml"
    }
  });
}
