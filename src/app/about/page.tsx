import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  HeartHandshake,
  PackageCheck,
  RotateCcw,
  Truck,
  WandSparkles
} from "lucide-react";
import { AboutScrollExperience } from "@/components/about-scroll-experience";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About shipK | Guided K-beauty sets from Korea",
  description:
    "shipK curates Korean skincare and makeup into guided sets, helping shoppers use good K-beauty with clear routine guidance, shipping details, and order support."
};

const storySteps = [
  {
    number: "01",
    label: "Set",
    title: "A set, not a pile of products.",
    body:
      "Skincare and makeup are grouped to work together, so your first try feels like a routine instead of more research.",
    image: "/catalog-assets/generated/about-story-curated-set-photo.png",
    alt: "A curated K-beauty set arranged inside one open shipK box"
  },
  {
    number: "02",
    label: "Use",
    title: "The order is built in.",
    body:
      "Use notes show what comes first, what layers next, and what the final texture should feel like in daily life.",
    image: "/catalog-assets/generated/about-story-use-order-photo.png",
    alt: "K-beauty products arranged in a clear routine order on a mint shelf"
  },
  {
    number: "03",
    label: "Care",
    title: "Care notes keep it doable.",
    body:
      "Short care notes cover pace, storage, and tiny adjustments, so the set stays useful after the first day.",
    image: "/catalog-assets/generated/about-story-care-notes-photo.png",
    alt: "Care notes, checkmarks, and K-beauty products arranged for routine care"
  },
  {
    number: "04",
    label: "Discover",
    title: "Good Korean brands get a better stage.",
    body:
      "Thoughtful Korean makers get room for context, so shoppers can understand the product, not just its name.",
    image: "/catalog-assets/generated/about-story-korean-brands-photo.png",
    alt: "Korean beauty products on a small discovery stage with spotlights"
  }
];

const trustLinks = [
  {
    href: "/policies/shipping",
    icon: Truck,
    title: "Shipping",
    body: "Clear expectations for orders shipped from Korea."
  },
  {
    href: "/policies/returns",
    icon: RotateCcw,
    title: "Returns",
    body: "A practical policy link before you commit."
  },
  {
    href: "/account/orders",
    icon: PackageCheck,
    title: "Orders",
    body: "Order follow-up stays close in My Page."
  }
];

const valueNotes = [
  {
    icon: WandSparkles,
    title: "Guided sets",
    body: "Skincare and makeup products selected around a usable routine, not just a product list."
  },
  {
    icon: BookOpenCheck,
    title: "Use and care",
    body: "Short, practical guidance helps you start, layer, and keep the routine manageable."
  },
  {
    icon: HeartHandshake,
    title: "Korean brand discovery",
    body: "Thoughtful Korean brands get introduced with the context shoppers need to try them well."
  }
];

const heroTitle = "Good K-beauty, easier to use.";

export default function AboutPage() {
  return (
    <AboutScrollExperience>
      <div className="about-redesign-page bg-white">
        <section className="about-redesign-hero relative isolate overflow-hidden border-b-2 border-black bg-[#fff8f0]">
          <Image
            src="/catalog-assets/generated/about-kbeauty-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="about-redesign-hero-backdrop object-cover"
          />
          <div className="about-redesign-hero-wash" aria-hidden="true" />

          <div className="container relative z-10 grid min-h-[720px] content-end py-10 md:min-h-[760px] md:py-14 lg:min-h-[calc(100vh-10rem)] lg:py-16">
            <div className="about-redesign-hero-copy max-w-4xl pb-8 md:pb-12">
              <p className="about-redesign-eyebrow font-brand-heavy text-xs uppercase text-[#ff3d7f] md:text-sm">
                Guided K-beauty sets from Korea
              </p>
              <h1
                aria-label={heroTitle}
                className="mt-4 max-w-4xl shipk-heading text-5xl leading-none text-[#0a0a0a] sm:text-6xl lg:text-7xl xl:text-8xl"
              >
                Good <span className="whitespace-nowrap">K-beauty,</span> easier to use.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-[#414141] sm:text-lg sm:leading-8">
                shipK curates Korean skincare and makeup into guided sets, so
                better products arrive with a clear way to start, layer, and
                keep going.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop")}>
                  Shop sets
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#guided-story"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "rounded-full border-2 border-black bg-white font-black shadow-none"
                  )}
                >
                  See how it works
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="guided-story" className="about-redesign-story border-b-2 border-black bg-white">
          <div className="container grid gap-8 py-16 lg:grid-cols-[0.47fr_0.53fr] lg:gap-14 lg:py-24">
            <div className="about-redesign-story-sticky about-redesign-reveal">
              <p className="font-brand-heavy text-xs uppercase text-[#ff3d7f] md:text-sm">
                From set to routine
              </p>
              <h2 className="mt-3 shipk-heading text-4xl leading-none sm:text-5xl">
                Open the box. Know the next step.
              </h2>
              <p className="mt-5 text-base font-semibold leading-7 text-muted-foreground sm:text-lg">
                Each shipK set arrives as a simple path: what to try first, how
                to layer it, how to care for it, and why the Korean brand is
                worth knowing.
              </p>
              <div className="about-redesign-routine-panel mt-7">
                <Image
                  src="/catalog-assets/generated/about-routine-guide.png"
                  alt="K-beauty products arranged with a simple routine guide card"
                  fill
                  sizes="(min-width: 1024px) 42vw, 90vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="grid gap-5">
              {storySteps.map((step) => (
                <article
                  key={step.number}
                  className="about-redesign-story-card grid gap-5 rounded-md border-2 border-black bg-white p-4 sm:grid-cols-[11rem_1fr] sm:p-5"
                >
                  <div className="about-redesign-story-art relative aspect-square overflow-hidden rounded-md border-2 border-black bg-[#fff8f0]">
                    <Image
                      src={step.image}
                      alt={step.alt}
                      fill
                      sizes="(min-width: 640px) 176px, 90vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
                      {step.number} / {step.label}
                    </p>
                    <h3 className="mt-2 text-2xl font-black leading-tight">{step.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground sm:text-base sm:leading-7">
                      {step.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-[#f7fbf2]">
          <div className="container grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-20">
            <div className="about-redesign-reveal">
              <p className="font-brand-heavy text-xs uppercase text-[#ff3d7f] md:text-sm">
                Why shipK exists
              </p>
              <h2 className="mt-3 shipk-heading text-4xl leading-none sm:text-5xl">
                Better products need better context.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-muted-foreground sm:text-lg">
                Korean beauty has more depth than the few names shoppers already
                know. shipK helps good Korean brands meet shoppers through sets
                that explain how the products fit into real routines.
              </p>
            </div>
            <div className="grid gap-4">
              {valueNotes.map((note) => {
                const Icon = note.icon;

                return (
                  <article
                    key={note.title}
                    className="about-redesign-reveal about-redesign-value-card grid gap-4 rounded-md border-2 border-black bg-white p-5 sm:grid-cols-[auto_1fr]"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-black bg-[#c8f26c]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <h3 className="text-xl font-black leading-tight">{note.title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground sm:text-base sm:leading-7">
                        {note.body}
                      </p>
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b-2 border-black bg-[#0a0a0a] text-white">
          <div className="container grid gap-8 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="about-redesign-reveal">
              <p className="font-brand-heavy text-xs uppercase text-[#c8f26c] md:text-sm">
                Purchase confidence
              </p>
              <h2 className="mt-3 shipk-heading text-4xl leading-none sm:text-5xl">
                The practical details stay close.
              </h2>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/70">
                International beauty shopping should still feel clear. Shipping,
                returns, and order follow-up stay visible before and after checkout.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {trustLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="about-redesign-reveal about-redesign-trust-card group grid min-h-44 gap-5 rounded-md border-2 border-white bg-white/10 p-5 transition hover:bg-white hover:text-[#0a0a0a] focus-ring"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-[#c8f26c] text-[#0a0a0a] group-hover:border-black">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="flex items-center justify-between gap-3 text-xl font-black leading-tight">
                        {link.title}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                      <span className="mt-2 block text-sm font-semibold leading-6 text-white/70 group-hover:text-[#4f4f4f]">
                        {link.body}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#fff8f0]">
          <div className="container grid gap-6 py-16 text-center lg:py-20">
            <div className="about-redesign-reveal mx-auto max-w-4xl">
              <p className="font-brand-heavy text-xs uppercase text-[#ff3d7f] md:text-sm">
                Ready when your routine is
              </p>
              <h2 className="mt-3 shipk-heading text-4xl leading-none sm:text-6xl">
                Start with a set that already knows where it is going.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-muted-foreground sm:text-lg">
                Browse guided K-beauty sets for skincare, makeup, and daily
                routines that feel easier from the first step.
              </p>
            </div>
            <div className="about-redesign-reveal flex flex-wrap justify-center gap-3">
              <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop")}>
                Shop guided sets
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/policies/shipping"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-full border-2 border-black bg-white font-black shadow-none"
                )}
              >
                Check shipping
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AboutScrollExperience>
  );
}
