"use client";

import Image from "next/image";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { getImageOptimizationProps } from "@/lib/image-path";
import type { Product, ProductContentBlock } from "@/lib/products";
import type { ProductDetailSection } from "@/lib/product-detail-sections";
import { cn } from "@/lib/utils";

export function ProductDetailSectionsRenderer({ product }: { product: Product }) {
  return (
    <section className="container grid gap-12 py-12">
      {product.detailSections.length > 0 ? (
        <>
          <SupplementalProductSections product={product} />
          {product.detailSections.map((section) => (
            <CanonicalSection key={section.id} section={section} product={product} />
          ))}
        </>
      ) : (
        <LegacyDetailSections product={product} />
      )}
    </section>
  );
}

function CanonicalSection({
  section,
  product
}: {
  section: ProductDetailSection;
  product: Product;
}) {
  if (section.sectionType === "heading") {
    const Heading = section.level === "h3" ? "h3" : "h2";
    return (
      <div className={cn("max-w-4xl", getAlignClass(section.align))}>
        <Heading
          className={cn(
            "shipk-heading leading-tight",
            getHeadingFontSizeClass(section.fontSize, section.level),
            getTextColorClass(section.textColor, "default")
          )}
        >
          {section.text}
        </Heading>
      </div>
    );
  }

  if (section.sectionType === "text") {
    return (
      <div className={cn("max-w-3xl", getAlignClass(section.align))}>
        <p
          className={cn(
            "whitespace-pre-line",
            getBodyFontSizeClass(section.fontSize, "large"),
            getTextColorClass(section.textColor, "muted"),
            getFontWeightClass(section.fontWeight)
          )}
        >
          {section.body}
        </p>
      </div>
    );
  }

  if (section.sectionType === "image") {
    return <ImageSection section={section} product={product} />;
  }

  if (section.sectionType === "long_detail_image") {
    return (
      <figure className={cn("mx-auto grid gap-3", getLongImageWidthClass(section.maxWidth))}>
        <Image
          src={section.src}
          alt={section.alt}
          width={1200}
          height={2600}
          {...getImageOptimizationProps(section.src)}
          sizes="(min-width: 1180px) 1080px, 100vw"
          className="h-auto w-full rounded-md border-2 border-black bg-white object-contain"
        />
        {section.caption ? (
          <figcaption className="text-center text-sm text-muted-foreground">
            {section.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (section.sectionType === "image_text") {
    return (
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div
          className={cn(
            "relative aspect-square overflow-hidden rounded-md border-2 border-black bg-white",
            section.imagePosition === "right" && "md:order-2"
          )}
        >
          <Image
            src={section.src}
            alt={section.alt}
            fill
            {...getImageOptimizationProps(section.src)}
            className="object-contain p-6"
          />
        </div>
        <div>
          {section.eyebrow ? (
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              {section.eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              "mt-2 shipk-heading",
              getHeadingFontSizeClass(section.titleSize, "h2"),
              getTextColorClass(section.titleColor, "default")
            )}
          >
            {section.title}
          </h2>
          <p
            className={cn(
              "mt-4 whitespace-pre-line",
              getBodyFontSizeClass(section.bodySize, "large"),
              getTextColorClass(section.bodyColor, "muted")
            )}
          >
            {section.body}
          </p>
        </div>
      </div>
    );
  }

  if (section.sectionType === "image_group") {
    return (
      <div className="grid gap-5">
        {section.title ? (
          <h2
            className={cn(
              "shipk-heading",
              getHeadingFontSizeClass(section.titleSize, "h2"),
              getTextColorClass(section.titleColor, "default")
            )}
          >
            {section.title}
          </h2>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {section.images.map((image, index) => (
            <figure key={`${image.src}-${index}`} className="grid gap-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md border-2 border-black bg-white">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  {...getImageOptimizationProps(image.src)}
                  className="object-contain p-4"
                />
              </div>
              {image.caption ? (
                <figcaption className="text-sm text-muted-foreground">{image.caption}</figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    );
  }

  if (section.sectionType === "video") {
    return (
      <div className="grid gap-4">
        {section.title ? <h2 className="shipk-heading text-4xl">{section.title}</h2> : null}
        <div className="overflow-hidden rounded-md border-2 border-black bg-foreground">
          <div className="aspect-video">
            <iframe
              src={section.url}
              title={section.title ?? `${product.name} detail video`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation"
            />
          </div>
        </div>
      </div>
    );
  }

  if (section.sectionType === "comparison") {
    return (
      <div className="grid gap-5">
        <h2
          className={cn(
            "shipk-heading",
            getHeadingFontSizeClass(section.titleSize, "h2"),
            getTextColorClass(section.titleColor, "default")
          )}
        >
          {section.title}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {section.items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="rounded-md border-2 border-black bg-white p-4">
              <p className="font-black">{item.label}</p>
              <p
                className={cn(
                  "mt-2",
                  getBodyFontSizeClass(section.bodySize, "small"),
                  getTextColorClass(section.bodyColor, "muted")
                )}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.sectionType === "steps") {
    return <StepsSection section={section} />;
  }

  return (
    <div className={cn("rounded-md border-2 border-black p-5", getNoticeToneClass(section.tone))}>
      <h2
        className={cn(
          "shipk-heading",
          getHeadingFontSizeClass(section.titleSize, "h3"),
          getTextColorClass(section.titleColor, "default")
        )}
      >
        {section.title}
      </h2>
      <p
        className={cn(
          "mt-3 whitespace-pre-line",
          getBodyFontSizeClass(section.bodySize, "small"),
          getTextColorClass(section.bodyColor, "muted")
        )}
      >
        {section.body}
      </p>
    </div>
  );
}

function ImageSection({
  section,
  product
}: {
  section: Extract<ProductDetailSection, { sectionType: "image" }>;
  product: Product;
}) {
  if (section.aspectRatio === "square" || section.aspectRatio === "video") {
    return (
      <figure className="grid gap-3">
        <div
          className={cn(
            "relative overflow-hidden rounded-md border-2 border-black bg-white",
            section.aspectRatio === "square" ? "aspect-square" : "aspect-video"
          )}
        >
          <Image
            src={section.src}
            alt={section.alt}
            fill
            {...getImageOptimizationProps(section.src)}
            className="object-contain p-6"
          />
        </div>
        {section.caption ? (
          <figcaption className="text-sm text-muted-foreground">{section.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="mx-auto grid max-w-5xl gap-3">
      <Image
        src={section.src}
        alt={section.alt || product.name}
        width={1200}
        height={900}
        {...getImageOptimizationProps(section.src)}
        sizes="(min-width: 1180px) 1080px, 100vw"
        className="h-auto w-full rounded-md border-2 border-black bg-white object-contain p-4"
      />
      {section.caption ? (
        <figcaption className="text-sm text-muted-foreground">{section.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function StepsSection({ section }: { section: Extract<ProductDetailSection, { sectionType: "steps" }> }) {
  const layout = section.layout ?? "split_cards";

  if (layout === "full_cards") {
    return (
      <div className="grid gap-5">
        <StepsHeading section={section} />
        <StepCards section={section} className="md:grid-cols-2 xl:grid-cols-4" />
      </div>
    );
  }

  if (layout === "timeline") {
    return (
      <div className="grid gap-5">
        <StepsHeading section={section} />
        <StepTimeline section={section} />
      </div>
    );
  }

  if (layout === "simple_list") {
    return (
      <div className="grid gap-5">
        <StepsHeading section={section} />
        <ol className="divide-y-2 divide-black border-y-2 border-black">
          {section.items.map((step, index) => (
            <li key={`${step.title}-${index}`} className="grid gap-3 py-4 sm:grid-cols-[4rem_1fr]">
              <span className="font-brand-round text-3xl leading-none text-[#ff3d7f]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block font-black">{step.title}</span>
                <span
                  className={cn(
                    "mt-1 block",
                    getBodyFontSizeClass(section.bodySize, "small"),
                    getTextColorClass(section.bodyColor, "muted")
                  )}
                >
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <StepsHeading section={section} />
      <StepCards section={section} className="md:grid-cols-2 xl:grid-cols-3" />
    </div>
  );
}

function StepsHeading({ section }: { section: Extract<ProductDetailSection, { sectionType: "steps" }> }) {
  return (
    <div>
      <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">Steps</p>
      {section.title ? (
        <h2
          className={cn(
            "mt-2 shipk-heading",
            getHeadingFontSizeClass(section.titleSize, "h2"),
            getTextColorClass(section.titleColor, "default")
          )}
        >
          {section.title}
        </h2>
      ) : null}
    </div>
  );
}

function StepTimeline({ section }: { section: Extract<ProductDetailSection, { sectionType: "steps" }> }) {
  const lastIndex = section.items.length - 1;

  return (
    <ol className="grid max-w-4xl">
      {section.items.map((step, index) => (
        <li
          key={`${step.title}-${index}`}
          className={cn(
            "grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4",
            index !== lastIndex && "pb-4"
          )}
        >
          <div className="relative flex justify-center">
            {index !== lastIndex ? (
              <span
                className="absolute bottom-0 top-11 w-0.5 rounded-full bg-black"
                aria-hidden="true"
              />
            ) : null}
            <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-md border-2 border-black bg-[#ff3d7f] font-brand-round text-2xl leading-none text-white">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <div className="rounded-md border-2 border-black bg-white p-4 sm:p-5">
            <span className="block text-lg font-black leading-snug">{step.title}</span>
            <span
              className={cn(
                "mt-2 block leading-7",
                getBodyFontSizeClass(section.bodySize, "small"),
                getTextColorClass(section.bodyColor, "muted")
              )}
            >
              {step.body}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepCards({
  section,
  className
}: {
  section: Extract<ProductDetailSection, { sectionType: "steps" }>;
  className: string;
}) {
  return (
    <ol className={cn("grid gap-3", className)}>
      {section.items.map((step, index) => (
        <li key={`${step.title}-${index}`} className="rounded-md border-2 border-black bg-white p-4">
          <span className="font-brand-round text-4xl leading-none text-[#ff3d7f]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="mt-3 block font-black">{step.title}</span>
          <span
            className={cn(
              "mt-1 block",
              getBodyFontSizeClass(section.bodySize, "small"),
              getTextColorClass(section.bodyColor, "muted")
            )}
          >
            {step.body}
          </span>
        </li>
      ))}
    </ol>
  );
}

function LegacyDetailSections({ product }: { product: Product }) {
  return (
    <>
      <IncludedItemsSection product={product} showEmptyState />
      <RoutineStepsSection product={product} showEmptyState />
      <TutorialRoutinePanel />
      {product.contentBlocks.map((block) => (
        <LegacyContentBlock key={block.id} block={block} />
      ))}
    </>
  );
}

function SupplementalProductSections({ product }: { product: Product }) {
  const showIncludedItems =
    product.includedItems.length > 0 && !hasIncludedItemsCoverage(product);
  const showRoutineSteps =
    product.routineSteps.length > 0 && !hasRoutineStepsCoverage(product);
  const uncoveredContentBlocks = product.contentBlocks.filter(
    (block) => !hasContentBlockCoverage(product, block)
  );

  if (!showIncludedItems && !showRoutineSteps && uncoveredContentBlocks.length === 0) {
    return null;
  }

  return (
    <>
      {showIncludedItems ? <IncludedItemsSection product={product} /> : null}
      {showRoutineSteps ? <RoutineStepsSection product={product} /> : null}
      {uncoveredContentBlocks.map((block) => (
        <LegacyContentBlock key={block.id} block={block} />
      ))}
    </>
  );
}

function IncludedItemsSection({
  product,
  showEmptyState = false
}: {
  product: Product;
  showEmptyState?: boolean;
}) {
  if (!showEmptyState && product.includedItems.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">Included items</p>
        <h2 className="mt-2 shipk-heading text-4xl">Everything in the set</h2>
        <p className="mt-4 text-muted-foreground">
          Each item is presented as part of a guided look so shoppers know what they are getting before checkout.
        </p>
      </div>
      <div className="grid gap-3">
        {product.includedItems.length ? (
          product.includedItems.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-md border-2 border-black bg-white p-4 sm:grid-cols-[3rem_1fr_auto]"
            >
              <span className="font-brand-round text-3xl leading-none text-[#ff3d7f]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block text-sm font-bold text-muted-foreground">{item.category}</span>
                <h3 className="mt-1 text-lg font-black">{item.name}</h3>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                  {item.description}
                </span>
              </span>
              <span className="h-fit rounded-full border-2 border-black bg-[#fff8f0] px-3 py-1 text-xs font-black text-muted-foreground">
                {product.brandName}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-md border-2 border-black bg-white p-4 text-sm text-muted-foreground">
            Included items will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

function RoutineStepsSection({
  product,
  showEmptyState = false
}: {
  product: Product;
  showEmptyState?: boolean;
}) {
  if (!showEmptyState && product.routineSteps.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">Use steps</p>
        <h2 className="mt-2 shipk-heading text-4xl">Follow the look in order</h2>
        {product.bestFor ? <p className="mt-4 text-muted-foreground">{product.bestFor}</p> : null}
      </div>
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {product.routineSteps.length ? (
          product.routineSteps.map((step, index) => (
            <li key={step.id} className="rounded-md border-2 border-black bg-white p-4">
              <span className="font-brand-round text-4xl leading-none text-[#ff3d7f]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mt-3 block font-black">{step.title}</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">{step.body}</span>
            </li>
          ))
        ) : (
          <li className="rounded-md border-2 border-black bg-white p-4 text-sm text-muted-foreground">
            Use steps will appear here.
          </li>
        )}
      </ol>
    </div>
  );
}

function TutorialRoutinePanel() {
  return (
    <div className="grid gap-5 rounded-md border-2 border-black bg-[#c8f26c] p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-black bg-white">
        <PlayCircle className="h-8 w-8" aria-hidden="true" />
      </div>
      <div>
        <h2 className="shipk-heading text-2xl">Tutorial-first product detail</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Product detail keeps the use order close to the purchase CTA, so a customer can understand the set before moving to checkout.
        </p>
      </div>
      <Link href="/promoter" className="shipk-chip bg-white hover:bg-[#ffd6e3]">
        Share as promoter
      </Link>
    </div>
  );
}

function LegacyContentBlock({ block }: { block: ProductContentBlock }) {
  if (block.type === "image") {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-md border-2 border-black bg-white">
        <Image
          src={block.imagePath}
          alt={block.alt}
          fill
          {...getImageOptimizationProps(block.imagePath)}
          className="object-contain p-6"
        />
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="max-w-3xl">
        {block.eyebrow ? (
          <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">{block.eyebrow}</p>
        ) : null}
        <h2 className="mt-2 shipk-heading text-4xl">{block.title}</h2>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">{block.body}</p>
      </div>
    );
  }

  return (
    <div className="grid items-center gap-6 md:grid-cols-2">
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-md border-2 border-black bg-white",
          block.imagePosition === "right" && "md:order-2"
        )}
      >
        <Image
          src={block.imagePath}
          alt={block.alt}
          fill
          {...getImageOptimizationProps(block.imagePath)}
          className="object-contain p-6"
        />
      </div>
      <div>
        {block.eyebrow ? (
          <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">{block.eyebrow}</p>
        ) : null}
        <h2 className="mt-2 shipk-heading text-4xl">{block.title}</h2>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">{block.body}</p>
      </div>
    </div>
  );
}

function hasIncludedItemsCoverage(product: Product) {
  const includedItemNames = product.includedItems
    .map((item) => normalizeSearchText(item.name))
    .filter(Boolean);

  if (includedItemNames.length === 0) {
    return false;
  }

  return product.detailSections.some((section) => {
    if (section.sectionType !== "comparison") {
      return false;
    }

    return includedItemNames.some((name) =>
      section.items.some((item) => normalizeSearchText(`${item.label} ${item.body}`).includes(name))
    );
  });
}

function hasRoutineStepsCoverage(product: Product) {
  const routineStepTitles = product.routineSteps
    .map((step) => normalizeSearchText(step.title))
    .filter(Boolean);

  if (routineStepTitles.length === 0) {
    return false;
  }

  return product.detailSections.some((section) => {
    if (section.sectionType !== "steps") {
      return false;
    }

    return routineStepTitles.some((title) =>
      section.items.some((item) => {
        const sectionTitle = normalizeSearchText(item.title);
        return sectionTitle.includes(title) || title.includes(sectionTitle);
      })
    );
  });
}

function hasContentBlockCoverage(product: Product, block: ProductContentBlock) {
  return product.detailSections.some((section) => {
    if (block.type === "image") {
      return sectionHasImageSource(section, block.imagePath);
    }

    if (block.type === "image_text") {
      return (
        section.sectionType === "image_text" &&
        (section.src === block.imagePath || normalizeSearchText(section.title).includes(normalizeSearchText(block.title)))
      );
    }

    if (block.type === "text") {
      const title = normalizeSearchText(block.title);
      return sectionHasText(section, title);
    }

    return false;
  });
}

function sectionHasImageSource(section: ProductDetailSection, src: string) {
  if (section.sectionType === "image" || section.sectionType === "long_detail_image" || section.sectionType === "image_text") {
    return section.src === src;
  }

  if (section.sectionType === "image_group") {
    return section.images.some((image) => image.src === src);
  }

  return false;
}

function sectionHasText(section: ProductDetailSection, text: string) {
  if (!text) {
    return false;
  }

  if (section.sectionType === "heading") {
    return normalizeSearchText(section.text).includes(text);
  }

  if (section.sectionType === "text") {
    return normalizeSearchText(section.body).includes(text);
  }

  if (
    section.sectionType === "image_text" ||
    section.sectionType === "comparison" ||
    section.sectionType === "steps" ||
    section.sectionType === "notice"
  ) {
    return normalizeSearchText(JSON.stringify(section)).includes(text);
  }

  return false;
}

function normalizeSearchText(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getAlignClass(align: "left" | "center" | "right") {
  if (align === "center") {
    return "mx-auto text-center";
  }

  if (align === "right") {
    return "ml-auto text-right";
  }

  return "";
}

function getLongImageWidthClass(maxWidth: "default" | "wide" | "full") {
  if (maxWidth === "full") {
    return "max-w-none";
  }

  if (maxWidth === "wide") {
    return "max-w-6xl";
  }

  return "max-w-4xl";
}

function getNoticeToneClass(tone: "info" | "tip" | "warning") {
  if (tone === "warning") {
    return "bg-[#ffe25a]";
  }

  if (tone === "tip") {
    return "bg-[#c8f26c]";
  }

  return "bg-[#b4f0dc]";
}

function getHeadingFontSizeClass(fontSize: string | undefined, fallbackLevel: "h2" | "h3") {
  const resolved = fontSize ?? (fallbackLevel === "h3" ? "medium" : "large");

  if (resolved === "hero") {
    return "text-5xl md:text-7xl";
  }

  if (resolved === "display") {
    return "text-5xl md:text-6xl";
  }

  if (resolved === "medium") {
    return "text-3xl md:text-4xl";
  }

  return "text-4xl md:text-5xl";
}

function getBodyFontSizeClass(fontSize: string | undefined, fallback: "small" | "base" | "large" | "xlarge") {
  const resolved = fontSize ?? fallback;

  if (resolved === "xlarge") {
    return "text-xl leading-9";
  }

  if (resolved === "large") {
    return "text-lg leading-8";
  }

  if (resolved === "small") {
    return "text-sm leading-6";
  }

  return "text-base leading-7";
}

function getTextColorClass(color: string | undefined, fallback: "default" | "muted") {
  const resolved = color ?? fallback;

  if (resolved === "muted") {
    return "text-muted-foreground";
  }

  if (resolved === "pink") {
    return "text-[#ff3d7f]";
  }

  if (resolved === "blue") {
    return "text-[#246bfe]";
  }

  if (resolved === "mint") {
    return "text-[#0f766e]";
  }

  if (resolved === "coral") {
    return "text-[#f97316]";
  }

  return "text-foreground";
}

function getFontWeightClass(weight: string | undefined) {
  if (weight === "black") {
    return "font-black";
  }

  if (weight === "bold") {
    return "font-bold";
  }

  if (weight === "medium") {
    return "font-medium";
  }

  return "";
}
