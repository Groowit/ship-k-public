import { calculateOrderTotals, formatUsd } from "./commerce";

export type ProductType = "single" | "curated_set";
export type ProductDifficulty = "Beginner" | "Intermediate";

export const productCollectionSlugs = [
  "daily-glow",
  "k-pop-idol",
  "glass-skin",
  "y2k-cute",
  "cool-tone",
  "warm-tone",
  "date-night"
] as const;

export type ProductCollectionSlug = (typeof productCollectionSlugs)[number];

export type ProductCollection = {
  slug: ProductCollectionSlug;
  name: string;
  themeLabel: string;
  sortOrder: number;
};

export const productCollections: ProductCollection[] = [
  { slug: "daily-glow", name: "Daily Glow", themeLabel: "DAILY", sortOrder: 10 },
  { slug: "k-pop-idol", name: "K-Pop Idol", themeLabel: "IDOL", sortOrder: 20 },
  { slug: "glass-skin", name: "Glass Skin", themeLabel: "GLASS", sortOrder: 30 },
  { slug: "y2k-cute", name: "Y2K Cute", themeLabel: "Y2K", sortOrder: 40 },
  { slug: "cool-tone", name: "Cool Tone", themeLabel: "COOL", sortOrder: 50 },
  { slug: "warm-tone", name: "Warm Tone", themeLabel: "WARM", sortOrder: 60 },
  { slug: "date-night", name: "Date Night", themeLabel: "DATE", sortOrder: 70 }
];

export const categories = ["Routine Kit", "Skincare", "Makeup", "Sun Care", "Cleansing", "Masks"];

export type ProductIncludedItem = {
  id: string;
  name: string;
  category: string;
  description: string;
};

export type ProductRoutineStep = {
  id: string;
  title: string;
  body: string;
};

export type ProductGalleryImage = {
  id: string;
  imagePath: string;
  altText: string;
};

export type ProductContentBlock =
  | {
      id: string;
      type: "image";
      imagePath: string;
      alt: string;
    }
  | {
      id: string;
      type: "text";
      eyebrow?: string;
      title: string;
      body: string;
    }
  | {
      id: string;
      type: "image_text";
      imagePath: string;
      alt: string;
      eyebrow?: string;
      title: string;
      body: string;
      imagePosition: "left" | "right";
    };

export type ProductOption = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  stockQuantity: number;
};

export type ProductStatus = "active" | "draft" | "archived";

export type Product = {
  id: string;
  slug: string;
  productType: ProductType;
  brandName: string;
  name: string;
  category: string;
  collectionSlug?: ProductCollectionSlug;
  collectionName?: string;
  difficulty?: ProductDifficulty;
  itemCount?: number;
  themeLabel?: string;
  shortDescription: string;
  description: string;
  bestFor?: string;
  result?: string;
  heroImagePath: string;
  introVideoUrl?: string;
  badges: string[];
  status: ProductStatus;
  updatedAt?: string;
  option: ProductOption;
  galleryImages: ProductGalleryImage[];
  includedItems: ProductIncludedItem[];
  routineSteps: ProductRoutineStep[];
  contentBlocks: ProductContentBlock[];
};

type CuratedSetSeed = {
  slug: string;
  collectionSlug: ProductCollectionSlug;
  name: string;
  priceCents: number;
  difficulty: ProductDifficulty;
  itemCount: number;
  shortDescription: string;
  description: string;
  bestFor: string;
  result: string;
  badge: string;
  imagePath: string;
  items: Array<Omit<ProductIncludedItem, "id">>;
  steps: Array<Omit<ProductRoutineStep, "id">>;
};

const curatedSetSeeds: CuratedSetSeed[] = [
  {
    slug: "daily-k-glow-set",
    collectionSlug: "daily-glow",
    name: "Daily K-Glow Set",
    priceCents: 4900,
    difficulty: "Beginner",
    itemCount: 5,
    shortDescription: "A low-friction morning routine for a natural everyday glow.",
    description:
      "A fictional shipK routine kit for customers who want a simple, dewy K-beauty starting point without choosing every product one by one.",
    bestFor: "First-time K-beauty buyers, daily routines, and soft natural glow.",
    result: "Fresh, hydrated-looking skin with a comfortable daytime finish.",
    badge: "BEST",
    imagePath: "/catalog-assets/sets/daily-k-glow-set.png",
    items: [
      {
        name: "Cloud Rice Foam Cleanser",
        category: "Cleanser",
        description: "A fictional gentle cleanse step for a soft morning start."
      },
      {
        name: "Dewdrop Toner Pads",
        category: "Toner",
        description: "Pre-soaked fictional pads for easy skin prep."
      },
      {
        name: "Barrier Glow Serum",
        category: "Serum",
        description: "A lightweight fictional serum positioned around barrier comfort."
      },
      {
        name: "Soft Veil Cream",
        category: "Cream",
        description: "A fictional moisturizer for a cushioned finish."
      },
      {
        name: "Everyday Dew Sunscreen",
        category: "Sun Care",
        description: "A fictional final daytime step for a fresh look."
      }
    ],
    steps: [
      { title: "Cleanse lightly", body: "Use the foam cleanser to start with a clean base." },
      { title: "Prep with pads", body: "Sweep one toner pad across the face before serum." },
      { title: "Layer glow serum", body: "Apply a thin layer and let it settle." },
      { title: "Seal with cream", body: "Use a small amount of cream for comfort." },
      { title: "Finish daytime routines", body: "Apply sunscreen as the final morning step." }
    ]
  },
  {
    slug: "k-pop-idol-look",
    collectionSlug: "k-pop-idol",
    name: "K-Pop Idol Look",
    priceCents: 6900,
    difficulty: "Intermediate",
    itemCount: 7,
    shortDescription: "A stage-inspired makeup kit for glossy color and bright definition.",
    description:
      "A fictional color routine for customers who want to recreate a polished idol-inspired look with clear step-by-step guidance.",
    bestFor: "Creator tutorials, event makeup, and customers comfortable with color steps.",
    result: "Bright eyes, soft shimmer, and a glossy point lip.",
    badge: "NEW",
    imagePath: "/catalog-assets/sets/k-pop-idol-look.png",
    items: [
      { name: "Tone-Up Primer Veil", category: "Base", description: "A fictional base-prep item." },
      { name: "Soft Cushion Tint", category: "Base", description: "A fictional cushion-style tint." },
      { name: "Peach Beam Blush", category: "Cheek", description: "A fictional brightening blush." },
      { name: "Stage Light Glitter", category: "Eye", description: "A fictional shimmer topper." },
      { name: "Soft Brown Liner", category: "Eye", description: "A fictional definition step." },
      { name: "Jelly Lip Tint", category: "Lip", description: "A fictional glossy lip color." },
      { name: "Fixing Glow Mist", category: "Finish", description: "A fictional finish spray." }
    ],
    steps: [
      { title: "Prep the base", body: "Smooth primer over the center of the face." },
      { title: "Tap on cushion tint", body: "Apply a thin layer and build only where needed." },
      { title: "Add cheek color", body: "Place blush high on the cheeks for brightness." },
      { title: "Define the eyes", body: "Use liner close to the lash line." },
      { title: "Place shimmer", body: "Tap glitter at the center of the lid." },
      { title: "Finish with lip tint", body: "Apply a glossy point lip and mist lightly." }
    ]
  },
  {
    slug: "glass-skin-starter",
    collectionSlug: "glass-skin",
    name: "Glass Skin Starter",
    priceCents: 5500,
    difficulty: "Beginner",
    itemCount: 6,
    shortDescription: "A simple hydrating path toward a polished glass-skin look.",
    description:
      "A fictional starter set focused on layering light hydration and glow without advanced tools or complicated routines.",
    bestFor: "Hydration-first routines, beginners, and customers who want a guided glow.",
    result: "Smooth, reflective-looking skin with a calm hydrated finish.",
    badge: "HOT",
    imagePath: "/catalog-assets/sets/glass-skin-starter.png",
    items: [
      { name: "Milk Gel Cleanser", category: "Cleanser", description: "A fictional soft cleanse step." },
      { name: "Hydro Essence Mist", category: "Essence", description: "A fictional hydrating mist." },
      { name: "Pearl Drop Ampoule", category: "Ampoule", description: "A fictional glow layer." },
      { name: "Water Cream Capsule", category: "Cream", description: "A fictional moisture seal." },
      { name: "Gel Glow Mask", category: "Mask", description: "A fictional weekly mask." },
      { name: "Mirror Finish Sunscreen", category: "Sun Care", description: "A fictional daytime finish." }
    ],
    steps: [
      { title: "Cleanse gently", body: "Start with a soft cleanse and pat dry." },
      { title: "Mist in layers", body: "Use two light layers of essence mist." },
      { title: "Apply ampoule", body: "Press ampoule into high points of the face." },
      { title: "Seal hydration", body: "Finish with water cream." },
      { title: "Use mask weekly", body: "Add the gel mask when skin feels dull." }
    ]
  },
  {
    slug: "y2k-cute-bomb",
    collectionSlug: "y2k-cute",
    name: "Y2K Cute Bomb",
    priceCents: 5900,
    difficulty: "Beginner",
    itemCount: 6,
    shortDescription: "A playful glossy kit for bright cheeks, shimmer, and candy lips.",
    description:
      "A fictional playful look kit designed around easy color placement, glossy texture, and a nostalgic cute mood.",
    bestFor: "Casual makeup, playful content, and customers who want low-risk color.",
    result: "Glossy lips, bright cheeks, and a cheerful pop finish.",
    badge: "PLAY",
    imagePath: "/catalog-assets/sets/y2k-cute-bomb.png",
    items: [
      { name: "Puff Skin Tint", category: "Base", description: "A fictional soft base tint." },
      { name: "Bubblegum Cream Blush", category: "Cheek", description: "A fictional bright cheek color." },
      { name: "Tiny Star Eye Stick", category: "Eye", description: "A fictional shimmer stick." },
      { name: "Clear Brow Jelly", category: "Brow", description: "A fictional quick brow step." },
      { name: "Candy Drop Gloss", category: "Lip", description: "A fictional high-shine gloss." },
      { name: "Mini Heart Puff", category: "Tool", description: "A fictional application tool." }
    ],
    steps: [
      { title: "Tap on tint", body: "Apply a thin tint layer where you want coverage." },
      { title: "Bounce blush", body: "Add cream blush to the apples of the cheeks." },
      { title: "Swipe shimmer", body: "Use the eye stick along the center of the lid." },
      { title: "Set brows lightly", body: "Comb brow jelly through the brows." },
      { title: "Gloss the lips", body: "Finish with a full layer of gloss." }
    ]
  },
  {
    slug: "cool-tone-drama",
    collectionSlug: "cool-tone",
    name: "Cool Tone Drama",
    priceCents: 6500,
    difficulty: "Intermediate",
    itemCount: 7,
    shortDescription: "A chic cool-tone makeup set with mauve, taupe, and clear shine.",
    description:
      "A fictional set for customers who prefer cool undertones and want more definition than a daily routine.",
    bestFor: "Cool undertones, sharper eye definition, and polished evening looks.",
    result: "Mauve cheeks, taupe eyes, and a clean dramatic finish.",
    badge: "COOL",
    imagePath: "/catalog-assets/sets/cool-tone-drama.png",
    items: [
      { name: "Porcelain Skin Veil", category: "Base", description: "A fictional soft-matte base." },
      { name: "Mauve Cloud Blush", category: "Cheek", description: "A fictional cool cheek color." },
      { name: "Taupe Quad Palette", category: "Eye", description: "A fictional cool eye palette." },
      { name: "Graphite Gel Liner", category: "Eye", description: "A fictional liner step." },
      { name: "Clear Lash Fixer", category: "Lash", description: "A fictional lash finish." },
      { name: "Plum Glass Tint", category: "Lip", description: "A fictional cool lip tint." },
      { name: "Soft Focus Powder", category: "Finish", description: "A fictional finishing powder." }
    ],
    steps: [
      { title: "Create a soft base", body: "Use a light veil and powder only the center." },
      { title: "Shape with mauve", body: "Blend blush slightly upward." },
      { title: "Build taupe depth", body: "Layer the palette from light to dark." },
      { title: "Add liner", body: "Keep liner close to the lash line." },
      { title: "Finish lips", body: "Apply plum tint and soften the edge." }
    ]
  },
  {
    slug: "warm-honey-look",
    collectionSlug: "warm-tone",
    name: "Warm Honey Look",
    priceCents: 5900,
    difficulty: "Beginner",
    itemCount: 6,
    shortDescription: "A warm-tone signature kit with honey cheeks and soft brown eyes.",
    description:
      "A fictional warm color kit for customers who want an approachable, golden everyday makeup routine.",
    bestFor: "Warm undertones, soft daily makeup, and easy creator tutorials.",
    result: "Honey-toned cheeks, warm eyes, and a comfortable glossy lip.",
    badge: "WARM",
    imagePath: "/catalog-assets/sets/warm-honey-look.png",
    items: [
      { name: "Honey Base Cushion", category: "Base", description: "A fictional warm base step." },
      { name: "Apricot Cream Blush", category: "Cheek", description: "A fictional warm cheek color." },
      { name: "Caramel Eye Duo", category: "Eye", description: "A fictional two-shade eye set." },
      { name: "Brown Soft Liner", category: "Eye", description: "A fictional gentle liner." },
      { name: "Honey Balm Gloss", category: "Lip", description: "A fictional balm-gloss hybrid." },
      { name: "Glow Fix Powder", category: "Finish", description: "A fictional targeted powder." }
    ],
    steps: [
      { title: "Warm the base", body: "Tap cushion over the center of the face." },
      { title: "Blend apricot blush", body: "Keep blush soft and warm." },
      { title: "Add caramel eyes", body: "Use the deeper shade close to the lash line." },
      { title: "Soften with liner", body: "Smudge brown liner slightly." },
      { title: "Finish with gloss", body: "Apply balm gloss for a warm shine." }
    ]
  }
];

export const launchCatalogProducts: Product[] = curatedSetSeeds.map((seed) => {
  const collection = getCollectionBySlug(seed.collectionSlug);
  const id = `prod_${seed.slug.replace(/-/g, "_")}`;

  return {
    id,
    slug: seed.slug,
    productType: "curated_set",
    brandName: "shipK Curated",
    name: seed.name,
    category: "Routine Kit",
    collectionSlug: seed.collectionSlug,
    collectionName: collection.name,
    difficulty: seed.difficulty,
    itemCount: seed.itemCount,
    themeLabel: collection.themeLabel,
    shortDescription: seed.shortDescription,
    description: seed.description,
    bestFor: seed.bestFor,
    result: seed.result,
    heroImagePath: seed.imagePath,
    badges: [seed.badge, collection.name],
    status: "active",
    option: {
      id: `opt_${seed.slug.replace(/-/g, "_")}`,
      name: `${seed.itemCount}-item routine kit`,
      sku: `SK-${seed.slug.toUpperCase().replace(/-/g, "-").slice(0, 20)}`,
      priceCents: seed.priceCents,
      stockQuantity: 100
    },
    galleryImages: [
      {
        id: `${seed.slug}_gallery_1`,
        imagePath: seed.imagePath,
        altText: `${seed.name} curated set`
      }
    ],
    includedItems: seed.items.map((item, index) => ({
      id: `${seed.slug}_item_${index + 1}`,
      ...item
    })),
    routineSteps: seed.steps.map((step, index) => ({
      id: `${seed.slug}_step_${index + 1}`,
      ...step
    })),
    contentBlocks: [
      {
        id: `${id}_image`,
        type: "image",
        imagePath: seed.imagePath,
        alt: `${seed.name} curated routine kit`
      },
      {
        id: `${id}_story`,
        type: "text",
        eyebrow: collection.name,
        title: seed.result,
        body: seed.bestFor
      },
      {
        id: `${id}_routine`,
        type: "image_text",
        imagePath: seed.imagePath,
        alt: `${seed.name} routine steps`,
        eyebrow: "How to use",
        title: "Follow the routine in order",
        body:
          "The web detail highlights the sequence so customers can understand the set before checkout.",
        imagePosition: "left"
      }
    ]
  };
});

export function getCollectionBySlug(slug: ProductCollectionSlug) {
  return productCollections.find((collection) => collection.slug === slug) ?? productCollections[0];
}

export function getActiveProducts(products = launchCatalogProducts) {
  return products.filter((product) => product.status === "active");
}

export function getProductBySlug(slug: string, products = launchCatalogProducts) {
  return products.find((product) => product.slug === slug && product.status === "active");
}

export function getActiveCollections(products = launchCatalogProducts) {
  const activeSlugs = new Set(
    getActiveProducts(products)
      .map((product) => product.collectionSlug)
      .filter(Boolean)
  );

  return productCollections.filter((collection) => activeSlugs.has(collection.slug));
}

export function filterProductsByCollection(
  products: Product[],
  collectionSlug: string | undefined
) {
  if (!collectionSlug || collectionSlug === "all") {
    return products;
  }
  return products.filter((product) => product.collectionSlug === collectionSlug);
}

export function getProductPriceLabel(product: Product) {
  return formatUsd(product.option.priceCents);
}

export function getProductCheckoutSummary(product: Product, quantity: number) {
  return calculateOrderTotals([
    {
      unitPriceCents: product.option.priceCents,
      quantity
    }
  ]);
}
