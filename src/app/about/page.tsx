import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  WandSparkles
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About shipK | Korean beauty sets shipped from Korea",
  description:
    "shipK curates Korean beauty products for US shoppers with easy product guidance, clear shipping details, and order tracking from Korea."
};

const heroImages = [
  {
    src: "/catalog-assets/sets/daily-k-glow-set.png",
    alt: "Skincare Starter Set",
    className: "left-1 top-2 w-[43%] rotate-[-4deg] sm:left-0 sm:top-5 sm:w-[55%]"
  },
  {
    src: "/catalog-assets/sets/glass-skin-starter.png",
    alt: "Hydration Skincare Set",
    className: "right-1 top-8 w-[40%] rotate-[5deg] sm:right-0 sm:top-20 sm:w-[51%]"
  },
  {
    src: "/catalog-assets/sets/k-pop-idol-look.png",
    alt: "Makeup Starter Set",
    className: "bottom-1 left-[30%] w-[40%] rotate-[1deg] sm:bottom-2 sm:left-[23%] sm:w-[52%]"
  }
];

const promiseCards = [
  {
    icon: Sparkles,
    title: "Curated Korean cosmetics",
    body: "We build around products that make sense together, so shoppers do not have to turn one purchase into a research project."
  },
  {
    icon: WandSparkles,
    title: "Looks you can follow",
    body: "Each product page explains the finish, the steps, and the order of use in plain language before you buy."
  },
  {
    icon: ShieldCheck,
    title: "Confidence after checkout",
    body: "Shipping, returns, payment, and order updates stay visible, because beauty shopping should not feel mysterious."
  }
];

const buyingSteps = [
  {
    eyebrow: "01",
    title: "Start with the result",
    body: "Choose the glow, tone, or makeup mood you want first. The product list comes after the look makes sense."
  },
  {
    eyebrow: "02",
    title: "See what is inside",
    body: "Product pages keep the category, included items, and key use notes together so you can compare products quickly."
  },
  {
    eyebrow: "03",
    title: "Use it in order",
    body: "Cleanse, prep, layer, finish. The steps are written for real mornings, not for people who read ingredient lists for fun."
  },
  {
    eyebrow: "04",
    title: "Track the trip",
    body: "After checkout, order updates help you follow the box from Korea to your shelf."
  }
];

const qualityNotes = [
  "Clear sets and single products for skin prep, everyday glow, cute makeup, and polished finish looks.",
  "Product imagery and included-item details stay close to the buying decision.",
  "Clear price, item count, difficulty, and shipping context help shoppers compare fast.",
  "Content avoids overpromising. We focus on look, texture, order of use, and purchase clarity."
];

const trustSteps = [
  {
    icon: ClipboardList,
    title: "Before you buy",
    body: "Browse by category, check what is included, and read the steps before committing to a product."
  },
  {
    icon: ShieldCheck,
    title: "At checkout",
    body: "PayPal checkout and clear policy links keep the purchase flow familiar for US shoppers."
  },
  {
    icon: PackageCheck,
    title: "While it ships",
    body: "Order status labels help you understand when a purchase is paid, preparing, shipped, or delivered."
  }
];

const policyLinks = [
  {
    href: "/policies/shipping",
    icon: Truck,
    title: "Shipping",
    body: "See how shipK explains delivery expectations for orders from Korea."
  },
  {
    href: "/policies/returns",
    icon: RotateCcw,
    title: "Returns",
    body: "Review the return policy before you place an order."
  },
  {
    href: "/account/orders",
    icon: Box,
    title: "Orders",
    body: "Sign in to review order history and delivery updates in My Page."
  }
];

const railImages = [
  "/catalog-assets/sets/cool-tone-drama.png",
  "/catalog-assets/sets/warm-honey-look.png",
  "/catalog-assets/sets/k-pop-idol-look.png",
  "/catalog-assets/sets/glass-skin-starter.png",
  "/catalog-assets/sets/y2k-cute-bomb.png",
  "/catalog-assets/sets/daily-k-glow-set.png"
];

export default function AboutPage() {
  return (
    <div className="overflow-hidden bg-white">
      <section className="relative border-b-2 border-black bg-[#fff8f0]">
        <div className="container grid gap-6 py-8 md:py-12 lg:min-h-[560px] lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.84fr)] lg:items-center lg:gap-10 lg:py-12 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.86fr)]">
          <div className="min-w-0 max-w-[42rem]">
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              Good Korean cosmetics, easier to choose.
            </p>
            <h1 className="mt-4 max-w-full shipk-heading text-4xl leading-none sm:text-6xl lg:text-6xl xl:text-7xl">
              Korean beauty sets, packed for real life.
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              shipK helps US shoppers buy Korean cosmetics with less guessing:
              beauty sets, clear product guidance, and order confidence
              from checkout to delivery.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop")}>
                Shop Korean sets
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/policies/shipping"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-full border-2 border-black bg-white font-black shadow-none"
                )}
              >
                Shipping and returns
              </Link>
            </div>
            <div className="mt-5 grid max-w-xl grid-cols-3 gap-2 text-[0.68rem] font-black uppercase sm:gap-3 sm:text-sm">
              <span className="whitespace-nowrap rounded-full border-2 border-black bg-white px-2 py-2 text-center sm:px-4 sm:py-2.5">
                Ships from Korea
              </span>
              <span className="whitespace-nowrap rounded-full border-2 border-black bg-[#c8f26c] px-2 py-2 text-center sm:px-4 sm:py-2.5">
                Use steps
              </span>
              <span className="whitespace-nowrap rounded-full border-2 border-black bg-white px-2 py-2 text-center sm:px-4 sm:py-2.5">
                Order updates
              </span>
            </div>
          </div>

          <div className="about-hero-stage relative mx-auto aspect-[16/7] w-full max-w-[22rem] min-w-0 sm:aspect-[5/4] sm:max-w-[30rem] lg:max-w-[32rem] xl:translate-x-2">
            <div className="absolute inset-x-8 bottom-8 h-10 rounded-[50%] bg-black/10 blur-sm" />
            {heroImages.map((image, index) => (
              <div
                key={image.src}
                className={cn(
                  "about-float-card absolute rounded-md border-2 border-black bg-white p-2 sm:p-4",
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
          <span>* KOREAN BEAUTY FROM KOREA</span>
          <span>+ ROUTINES THAT MAKE SENSE</span>
          <span>* CLEAR SHIPPING AND RETURNS</span>
          <span>* KOREAN BEAUTY FROM KOREA</span>
          <span>+ ROUTINES THAT MAKE SENSE</span>
          <span>* CLEAR SHIPPING AND RETURNS</span>
        </div>
      </div>

      <section className="border-b-2 border-black bg-white">
        <div className="container grid gap-12 py-20 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              What shipK does
            </p>
            <h2 className="mt-3 shipk-heading text-5xl leading-none md:text-6xl">
              We make K-beauty feel shoppable.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">
              The best product is the one you understand before it arrives. Our
              job is to connect good Korean cosmetics with the reason, order,
              and shopping details that make them easier to use.
            </p>
          </div>
          <div className="grid gap-4">
            {promiseCards.map((point) => {
              const Icon = point.icon;
              return (
                <article
                  key={point.title}
                  className="grid gap-4 rounded-md border-2 border-black bg-[#fff8f0] p-5 sm:grid-cols-[auto_1fr] sm:items-start"
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

      <section className="border-b-2 border-black bg-[#b4f0dc]">
        <div className="container grid gap-10 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="grid gap-5">
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              How we curate
            </p>
            <h2 className="shipk-heading text-5xl leading-none md:text-6xl">
              A clear use case first. Products second.
            </h2>
            <p className="max-w-2xl text-lg font-semibold leading-8 text-muted-foreground">
              Korean beauty has a lot of choice. shipK narrows the shelf into
              sets and single products with a visible purpose: soft glow, skin prep, cute color,
              clean everyday makeup, or a finish you can actually picture.
            </p>
            <ul className="grid gap-3">
              {qualityNotes.map((note) => (
                <li key={note} className="grid grid-cols-[auto_1fr] gap-3 rounded-md border-2 border-black bg-white p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#ff3d7f]" aria-hidden="true" />
                  <span className="font-semibold leading-7 text-muted-foreground">{note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-[28rem] rounded-md border-2 border-black bg-white p-5">
            <Image
              src="/catalog-assets/detail/daily-k-glow-lifestyle.png"
              alt="Korean beauty products arranged for an everyday glow look"
              fill
              sizes="(min-width: 1024px) 38vw, 90vw"
              className="object-cover p-5"
            />
            <div className="absolute bottom-5 left-5 right-5 rounded-md border-2 border-black bg-white p-4">
              <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
                Product pages should answer:
              </p>
              <p className="mt-2 text-2xl font-black leading-tight">
                What is this look, what is included, and how do I use it?
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-white">
        <div className="container py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              From browse to bathroom shelf
            </p>
            <h2 className="mt-3 shipk-heading text-5xl leading-none md:text-6xl">
              No beauty homework.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Every product page is written so a shopper can understand the look,
              compare the set, and use the products without opening twenty tabs.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {buyingSteps.map((step) => (
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

      <section className="border-b-2 border-black bg-[#ffe25a] py-16">
        <div className="container mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              Browse the shelf
            </p>
            <h2 className="mt-3 shipk-heading text-5xl leading-none">
              <span className="block">Trendy,</span>
              <span className="block">but clear.</span>
            </h2>
          </div>
          <p className="max-w-xl text-base font-semibold leading-7 text-muted-foreground">
            shipK keeps the fun part of Korean beauty while making the shopping
            part easier: images, product details, use steps, and policy links
            stay close to the decision.
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
        <div className="container grid gap-12 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#c8f26c]">
              Purchase confidence
            </p>
            <h2 className="mt-3 shipk-heading text-5xl leading-none md:text-6xl">
              Beauty from Korea, with the details up front.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              International beauty shopping needs more than pretty product
              photos. We keep shipping, return, payment, and order information
              close enough that shoppers can buy with a clear head.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border-2 border-white bg-white/10 p-4">
                <p className="font-brand-heavy text-3xl text-[#c8f26c]">US</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
                  Built for US shoppers buying Korean beauty products.
                </p>
              </div>
              <div className="rounded-md border-2 border-white bg-white/10 p-4">
                <p className="font-brand-heavy text-3xl text-[#c8f26c]">KR</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
                  Korean beauty products shipped from Korea.
                </p>
              </div>
              <div className="rounded-md border-2 border-white bg-white/10 p-4">
                <p className="font-brand-heavy text-3xl text-[#c8f26c]">4</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
                  Simple order states from paid to delivered.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {trustSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="about-trust-row grid grid-cols-[auto_1fr] gap-4 rounded-md border-2 border-white bg-white/10 p-5"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-[#c8f26c] text-black">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <p className="font-brand-heavy text-sm text-[#c8f26c]">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 text-xl font-black">{step.title}</h3>
                    <p className="mt-2 leading-7 text-white/70">{step.body}</p>
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-white">
        <div className="container py-20">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
                Trust links
              </p>
              <h2 className="mt-3 shipk-heading text-5xl leading-none md:text-6xl">
                Check the details before you check out.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
                Good shopping pages answer practical questions. These links keep
                shipping, returns, and order follow-up within reach.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {policyLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group grid gap-5 rounded-md border-2 border-black bg-[#fff8f0] p-5 transition hover:-translate-y-1 hover:bg-white focus-ring"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-black bg-[#bde0fe]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="flex items-center justify-between gap-3 text-xl font-black">
                        {link.title}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                      <span className="mt-3 block leading-7 text-muted-foreground">
                        {link.body}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8f0]">
        <div className="container grid gap-8 py-20 text-center">
          <div className="mx-auto grid max-w-4xl gap-5">
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              Ready when your shelf is
            </p>
            <p className="shipk-heading text-5xl leading-none md:text-7xl">
              Find Korean beauty that already knows what it is doing.
            </p>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-muted-foreground">
              Browse beauty sets, compare the category, and choose the Korean
              cosmetics that fit your next shelf.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop")}>
              Shop the sets
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/policies/returns"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full border-2 border-black bg-white font-black shadow-none"
              )}
            >
              Read return policy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
