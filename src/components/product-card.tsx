import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getProductRank, getProductVisual } from "@/lib/brand-visuals";
import { Product, getProductPriceLabel } from "@/lib/products";
import { cn } from "@/lib/utils";

export function ProductCard({ product, rank = 0 }: { product: Product; rank?: number }) {
  const visual = getProductVisual(product);
  const primaryTag = product.tags[0] ?? visual.themeWord;
  const itemCountLabel = product.itemCount ? `${product.itemCount} items` : product.category;
  const supportingTags = product.tags
    .slice(1)
    .filter((tag) => tag.toLowerCase() !== itemCountLabel.toLowerCase())
    .slice(0, 2);
  const metadata = [
    ...supportingTags,
    itemCountLabel,
    product.difficulty
  ].filter(Boolean);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block focus-ring rounded-md"
      aria-label={`${product.name} ${getProductPriceLabel(product)} ${
        product.itemCount ? `${product.itemCount} items` : product.category
      } ${product.difficulty ?? ""}`}
    >
      <article className="shipk-lift grid h-full overflow-hidden rounded-md bg-white">
        <div className={cn("relative aspect-[0.93] overflow-hidden border border-black", visual.bgClass)}>
          <span className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2.5 py-1 font-brand-heavy text-xs">
            {getProductRank(rank)}
          </span>
          {product.badges[0] ? (
            <Badge className="absolute right-3 top-3 z-10 rounded-md border-0 bg-[#793de1] px-3 py-1.5 font-brand-heavy text-xs text-[#fff75f]">
              {product.badges[0]}
            </Badge>
          ) : null}
          <span className="absolute bottom-3 left-3 z-10 max-w-[8rem] rounded-md bg-black px-3 py-2 text-xs font-black uppercase leading-tight text-white">
            {primaryTag}
          </span>
          <Image
            src={product.heroImagePath}
            alt={`${product.name} ${product.productType === "set" ? "set" : "product"}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="grid gap-3 px-1 pt-4">
          <p className={cn("font-brand-heavy text-xs uppercase", visual.accentClass)}>
            {visual.productType}
          </p>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <p className="text-sm font-bold text-muted-foreground">
                {product.category} / {product.brandName}
              </p>
              <h2 className="mt-1 text-lg font-black leading-tight text-[#3c3c3c]">
                {product.name}
              </h2>
            </div>
            <p className="font-brand-heavy text-lg text-foreground">
              {getProductPriceLabel(product)}
            </p>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {product.shortDescription}
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-black uppercase text-muted-foreground">
            {metadata.map((item) => (
              <span key={item} className="rounded-md bg-muted px-2.5 py-1">
                {item}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}
