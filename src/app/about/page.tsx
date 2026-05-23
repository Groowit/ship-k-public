import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Box, HeartHandshake, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About shipK | K-beauty routines from Korea",
  description:
    "shipK curates Korean beauty kits, makes routines easy to follow, and lets creators earn commission by sharing product links."
};

const heroImages = [
  {
    src: "/demo-assets/sets/daily-k-glow-set.png",
    alt: "Daily K-Glow Set routine kit",
    className: "left-0 top-6 w-[58%] rotate-[-4deg]"
  },
  {
    src: "/demo-assets/sets/y2k-cute-bomb.png",
    alt: "Y2K Cute Bomb routine kit",
    className: "right-0 top-24 w-[52%] rotate-[5deg]"
  },
  {
    src: "/demo-assets/sets/glass-skin-starter.png",
    alt: "Glass Skin Starter routine kit",
    className: "bottom-0 left-[22%] w-[54%] rotate-[1deg]"
  }
];

const routineSteps = [
  {
    eyebrow: "01",
    title: "Pick the vibe",
    body: "Glow, cute, clean, drama. Start with the look, not the ingredient list."
  },
  {
    eyebrow: "02",
    title: "Follow the recipe",
    body: "Each kit comes with the order of use, so the routine makes sense on day one."
  },
  {
    eyebrow: "03",
    title: "Wait for the box",
    body: "Track it from paid to delivered, then put the whole look on your shelf."
  }
];

const servicePoints = [
  {
    icon: Sparkles,
    title: "One kit, one routine",
    body: "Products that belong together, packed as a complete Korean beauty look."
  },
  {
    icon: Box,
    title: "No mystery after checkout",
    body: "Paid, preparing, shipped, delivered. Customers can follow the order from My Page."
  },
  {
    icon: HeartHandshake,
    title: "Creators can sell it",
    body: "Share the kit, bring your people, and earn commission when real orders land."
  }
];

const railImages = [
  "/demo-assets/sets/cool-tone-drama.png",
  "/demo-assets/sets/warm-honey-look.png",
  "/demo-assets/sets/k-pop-idol-look.png",
  "/demo-assets/sets/glass-skin-starter.png",
  "/demo-assets/sets/y2k-cute-bomb.png",
  "/demo-assets/sets/daily-k-glow-set.png"
];

export default function AboutPage() {
  return (
    <div className="overflow-hidden bg-white">
      <section className="relative border-b-2 border-black">
        <div className="container grid min-h-[calc(100vh-11rem)] gap-12 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.95fr)] lg:items-center lg:py-14 xl:grid-cols-[minmax(0,0.95fr)_minmax(500px,1fr)]">
          <div className="min-w-0 max-w-[34rem]">
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              Seoul looks, no overthinking.
            </p>
            <h1 className="mt-4 max-w-full shipk-heading text-[clamp(3.15rem,12.3vw,4.3rem)] leading-[0.88] md:text-[clamp(4.2rem,7.2vw,5.1rem)] lg:text-[clamp(3.8rem,4.7vw,5.15rem)] xl:text-[clamp(4.15rem,4.4vw,5.15rem)]">
              <span className="block whitespace-nowrap">K-beauty kits.</span>
              <span className="block whitespace-nowrap">Easy makeup.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-muted-foreground">
              We pack the look, show the steps, and ship it from Korea. Less
              guessing. More getting ready.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop")}>
                Shop the kits
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/promoter"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-full border-2 border-black bg-white font-black shadow-none"
                )}
              >
                Sell with shipK
              </Link>
            </div>
          </div>

          <div className="about-hero-stage relative mx-auto aspect-[5/4] w-full max-w-[34.5rem] min-w-0 xl:translate-x-4">
            <div className="absolute inset-x-8 bottom-8 h-10 rounded-[50%] bg-black/10 blur-sm" />
            {heroImages.map((image, index) => (
              <div
                key={image.src}
                className={cn(
                  "about-float-card absolute rounded-md border-2 border-black bg-[#fff8f0] p-4",
                  image.className
                )}
                style={{ animationDelay: `${index * 600}ms` }}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={520}
                  height={520}
                  priority={index === 0}
                  className="h-auto w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="shipk-marquee">
        <div className="shipk-marquee-track" aria-hidden="true">
          <span>★ ROUTINES FROM KOREA</span>
          <span>♥ LOOKS WITH A LITTLE RECIPE</span>
          <span>★ SHARE A KIT, EARN A CUT</span>
          <span>★ ROUTINES FROM KOREA</span>
          <span>♥ LOOKS WITH A LITTLE RECIPE</span>
          <span>★ SHARE A KIT, EARN A CUT</span>
        </div>
      </div>

      <section className="border-b-2 border-black bg-[#fff8f0]">
        <div className="container grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              What we do
            </p>
            <h2 className="mt-3 shipk-heading text-5xl leading-none md:text-6xl">
              We pack the whole look.
            </h2>
          </div>
          <div className="grid gap-4">
            {servicePoints.map((point) => {
              const Icon = point.icon;
              return (
                <article
                  key={point.title}
                  className="grid gap-4 rounded-md border-2 border-black bg-white p-5 sm:grid-cols-[auto_1fr] sm:items-start"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-black bg-[#c8f26c]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <h3 className="text-xl font-black">{point.title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">{point.body}</p>
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-white">
        <div className="container py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              How it feels
            </p>
            <h2 className="mt-3 shipk-heading text-5xl leading-none md:text-6xl">
              No beauty homework.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Pick the look. Read the steps. Put it on in the right order.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {routineSteps.map((step) => (
              <article
                key={step.title}
                className="about-step-card rounded-md border-2 border-black bg-white p-6"
              >
                <p className="font-brand-heavy text-4xl text-[#ff3d7f]">{step.eyebrow}</p>
                <h3 className="mt-8 text-2xl font-black">{step.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-[#b4f0dc] py-16">
        <div className="container mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              The shelf moves fast
            </p>
            <h2 className="mt-3 shipk-heading text-5xl leading-none">
              <span className="block">Trendy,</span>
              <span className="block">but tidy.</span>
            </h2>
          </div>
          <p className="max-w-xl text-base font-semibold leading-7 text-muted-foreground">
            Kits stay visual, easy to compare, and calm enough to browse without
            making your screen feel like a 40-page menu.
          </p>
        </div>

        <div className="about-product-rail overflow-hidden border-y-2 border-black bg-white py-6">
          <div className="about-product-rail-track">
            {[...railImages, ...railImages].map((src, index) => (
              <div
                key={`${src}-${index}`}
                className="relative aspect-square w-[220px] shrink-0 rounded-md border-2 border-black bg-[#fff8f0] p-4 sm:w-[280px]"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="280px"
                  className="object-contain p-5"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-[#0a0a0a] text-white">
        <div className="container grid gap-12 py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#c8f26c]">
              For promoters
            </p>
            <h2 className="mt-3 shipk-heading text-5xl leading-none md:text-6xl">
              <span className="block">Got taste?</span>
              <span className="block">Make it pay.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              Approved promoters can create product links, share kits with their
              audience, and track clicks, orders, sales, and reviewed commissions
              from a dedicated portal.
            </p>
            <Link
              href="/promoter"
              className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop mt-8")}
            >
              Open promoter portal
              <BadgeDollarSign className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-3">
            {[
              ["Pick a kit", "Choose the routines you actually want to recommend."],
              ["Share your link", "Customers shop through your link with the same shipK checkout."],
              ["Track commission", "Eligible purchases connect to commission records for payout review."]
            ].map(([title, body], index) => (
              <article
                key={title}
                className="about-promoter-row grid grid-cols-[auto_1fr] gap-4 rounded-md border-2 border-white bg-white/10 p-5"
              >
                <span className="font-brand-heavy text-3xl text-[#c8f26c]">
                  {index + 1}
                </span>
                <span>
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-2 leading-7 text-white/70">{body}</p>
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container grid gap-6 py-20 text-center">
          <p className="mx-auto max-w-3xl shipk-heading text-5xl leading-none md:text-6xl">
            <span className="block">Pretty simple.</span>
            <span className="block">Find a kit.</span>
            <span className="block">Share a kit.</span>
            <span className="block">Repeat.</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop")}>
              Find your routine
            </Link>
            <Link
              href="/promoter"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full border-2 border-black bg-white font-black shadow-none"
              )}
            >
              Promoter portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
