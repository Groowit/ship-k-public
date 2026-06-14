import Image from "next/image";
import Link from "next/link";
import { getImageOptimizationProps } from "@/lib/image-path";
import { Product, getProductPriceLabel } from "@/lib/products";

export function HomePopularProductCard({ product }: { product: Product }) {
  const priceLabel = getProductPriceLabel(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block h-full rounded-lg focus-ring"
      aria-label={`${product.name} ${priceLabel}`}
    >
      <article className="grid h-full overflow-hidden rounded-lg border border-zinc-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300">
        <div className="relative aspect-square overflow-hidden bg-[#f7f7f2]">
          <Image
            src={product.heroImagePath}
            alt={`${product.name} product`}
            fill
            {...getImageOptimizationProps(product.heroImagePath)}
            sizes="(min-width: 768px) 25vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <div className="grid gap-1.5 p-2.5 sm:p-3">
          <p className="line-clamp-1 font-brand-heavy text-[10px] uppercase tracking-normal text-[#ff3d7f] sm:text-xs">
            {product.brandName}
          </p>
          <h3 className="line-clamp-2 text-xs font-black leading-tight text-foreground sm:text-sm">
            {product.name}
          </h3>
          <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-muted-foreground sm:text-xs sm:leading-5">
            {product.shortDescription}
          </p>
          <p className="pt-0.5 font-brand-heavy text-xs text-foreground sm:text-sm">
            {priceLabel}
          </p>
        </div>
      </article>
    </Link>
  );
}
