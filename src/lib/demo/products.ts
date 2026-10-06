/**
 * Modular Frontend Demo Data & Discovery Abstraction
 * 
 * Strictly isolated for visual design and local development previews.
 * This data is NEVER inserted into PostgreSQL and NEVER mixed into production responses.
 */

export interface ProductSummary {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  productType: string;
  pricePaise: number;
  discountPricePaise?: number | null;
  isFree: boolean;
  ratingAvg: number;
  reviewsCount: number;
  salesCount: number;
  thumbnailUrl?: string | null;
  tags: string[];
  fileFormats?: string[];
  seller: {
    storeName: string;
    storeSlug: string;
    logoUrl?: string | null;
  };
  category: {
    name: string;
    slug: string;
  };
  badge?: string;
}

export const DEMO_PRODUCTS: ProductSummary[] = [
  {
    id: "demo-prod-01",
    title: "Editorial Design System & Typography Kit",
    slug: "editorial-design-system-typography-kit",
    shortDescription: "A comprehensive Figma design system tailored for digital editorial publications, magazines, and commerce.",
    productType: "DIGITAL_DOWNLOAD",
    pricePaise: 290000, // ₹2,900
    discountPricePaise: 390000,
    isFree: false,
    ratingAvg: 4.95,
    reviewsCount: 142,
    salesCount: 890,
    thumbnailUrl: null,
    tags: ["Figma", "Design System", "Editorial", "Typography"],
    fileFormats: ["FIG", "PDF"],
    seller: {
      storeName: "Studio Monolith",
      storeSlug: "studio-monolith",
      logoUrl: null,
    },
    category: {
      name: "Design",
      slug: "design",
    },
    badge: "Staff Pick",
  },
  {
    id: "demo-prod-02",
    title: "Next.js 14 Production SaaS Starter & Auth Boilerplate",
    slug: "nextjs-14-saas-starter-boilerplate",
    shortDescription: "Complete full-stack Next.js boilerplate with PostgreSQL, authentication, billing webhooks, and type safety.",
    productType: "SOFTWARE",
    pricePaise: 490000, // ₹4,900
    discountPricePaise: null,
    isFree: false,
    ratingAvg: 4.98,
    reviewsCount: 215,
    salesCount: 1420,
    thumbnailUrl: null,
    tags: ["Next.js", "React", "TypeScript", "Prisma"],
    fileFormats: ["ZIP", "TS"],
    seller: {
      storeName: "CraftCode Lab",
      storeSlug: "craftcode-lab",
      logoUrl: null,
    },
    category: {
      name: "Development",
      slug: "development",
    },
    badge: "Bestseller",
  },
  {
    id: "demo-prod-03",
    title: "Independent Creator Notion Operating System",
    slug: "creator-notion-operating-system",
    shortDescription: "Manage sponsorships, content pipelines, client projects, and product finances in one centralized workspace.",
    productType: "DIGITAL_DOWNLOAD",
    pricePaise: 150000, // ₹1,500
    discountPricePaise: 220000,
    isFree: false,
    ratingAvg: 4.88,
    reviewsCount: 94,
    salesCount: 650,
    thumbnailUrl: null,
    tags: ["Notion", "Productivity", "Templates", "Creators"],
    fileFormats: ["NOTION", "PDF"],
    seller: {
      storeName: "Paper & Pixels",
      storeSlug: "paper-and-pixels",
      logoUrl: null,
    },
    category: {
      name: "Templates",
      slug: "templates",
    },
  },
  {
    id: "demo-prod-04",
    title: "Modern Financial Modeling & Runway Kit",
    slug: "modern-financial-modeling-runway-kit",
    shortDescription: "Battle-tested Excel & Google Sheets financial models for bootstrapped startups and digital storefronts.",
    productType: "DIGITAL_DOWNLOAD",
    pricePaise: 199000, // ₹1,990
    discountPricePaise: null,
    isFree: false,
    ratingAvg: 4.92,
    reviewsCount: 78,
    salesCount: 420,
    thumbnailUrl: null,
    tags: ["Finance", "Spreadsheets", "Business", "Runway"],
    fileFormats: ["XLSX", "PDF"],
    seller: {
      storeName: "VentureCraft",
      storeSlug: "venturecraft",
      logoUrl: null,
    },
    category: {
      name: "Business",
      slug: "business",
    },
  },
  {
    id: "demo-prod-05",
    title: "Prompt Engineering & LLM Production Architecture Guide",
    slug: "prompt-engineering-llm-production-guide",
    shortDescription: "180+ tested prompt workflows, chain-of-thought architectures, and evaluated system prompts for builders.",
    productType: "DIGITAL_DOWNLOAD",
    pricePaise: 120000, // ₹1,200
    discountPricePaise: 180000,
    isFree: false,
    ratingAvg: 4.91,
    reviewsCount: 160,
    salesCount: 1100,
    thumbnailUrl: null,
    tags: ["AI", "Prompts", "LLM", "Guide"],
    fileFormats: ["PDF", "MD"],
    seller: {
      storeName: "Neural Works",
      storeSlug: "neural-works",
      logoUrl: null,
    },
    category: {
      name: "AI",
      slug: "ai",
    },
    badge: "Trending",
  },
  {
    id: "demo-prod-06",
    title: "Kinetic Brand Identity & Motion Assets",
    slug: "kinetic-brand-identity-motion-assets",
    shortDescription: "Curated collection of 120+ procedural vector motion loops, typographic animations, and brand badges.",
    productType: "DIGITAL_DOWNLOAD",
    pricePaise: 240000, // ₹2,400
    discountPricePaise: null,
    isFree: false,
    ratingAvg: 4.87,
    reviewsCount: 52,
    salesCount: 380,
    thumbnailUrl: null,
    tags: ["Motion", "Animation", "Branding", "AfterEffects"],
    fileFormats: ["AEP", "MP4", "JSON"],
    seller: {
      storeName: "Vellum Motion",
      storeSlug: "vellum-motion",
      logoUrl: null,
    },
    category: {
      name: "Creative",
      slug: "creative",
    },
  },
  {
    id: "demo-prod-07",
    title: "Full-Stack System Design Handbook",
    slug: "full-stack-system-design-handbook",
    shortDescription: "Real-world architectures, concurrency patterns, cache invalidation strategies, and distributed database designs.",
    productType: "DIGITAL_DOWNLOAD",
    pricePaise: 180000, // ₹1,800
    discountPricePaise: 250000,
    isFree: false,
    ratingAvg: 4.97,
    reviewsCount: 310,
    salesCount: 2200,
    thumbnailUrl: null,
    tags: ["System Design", "Architecture", "Engineering", "Book"],
    fileFormats: ["EPUB", "PDF"],
    seller: {
      storeName: "Architecture Press",
      storeSlug: "architecture-press",
      logoUrl: null,
    },
    category: {
      name: "Education",
      slug: "education",
    },
    badge: "Popular",
  },
  {
    id: "demo-prod-08",
    title: "Minimalist E-Commerce UI Kit & Components",
    slug: "minimalist-ecommerce-ui-kit-components",
    shortDescription: "Clean, high-converting digital storefront layout with product shelves, cart drawers, and checkout screens.",
    productType: "DIGITAL_DOWNLOAD",
    pricePaise: 220000, // ₹2,200
    discountPricePaise: null,
    isFree: false,
    ratingAvg: 4.89,
    reviewsCount: 88,
    salesCount: 510,
    thumbnailUrl: null,
    tags: ["Figma", "UI Kit", "E-Commerce", "Checkout"],
    fileFormats: ["FIG"],
    seller: {
      storeName: "Studio Monolith",
      storeSlug: "studio-monolith",
      logoUrl: null,
    },
    category: {
      name: "Design",
      slug: "design",
    },
  },
];

export interface GetProductsOptions {
  category?: string;
  query?: string;
  sort?: string;
  limit?: number;
  page?: number;
  allowDemoFallback?: boolean;
}

export interface GetProductsResult {
  products: ProductSummary[];
  total: number;
  isFallback: boolean;
}

/**
 * Clean data abstraction to fetch marketplace products.
 * Queries real backend API first.
 * Only falls back to demo data in non-production environments when explicitly requested.
 */
export async function getProducts(options: GetProductsOptions = {}): Promise<GetProductsResult> {
  const { category, query, sort = "newest", limit = 12, page = 1, allowDemoFallback = false } = options;

  try {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (page) params.set("page", String(page));
    if (category) params.set("category", category);
    if (query) params.set("query", query);
    if (sort) params.set("sort", sort);

    const baseUrl = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/v1/products?${params.toString()}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const rawProducts = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.products)
        ? json.data.products
        : [];

      if (rawProducts.length > 0) {
        return {
          products: rawProducts,
          total: json.meta?.total || rawProducts.length,
          isFallback: false,
        };
      }
    }
  } catch (err) {
    console.warn("[getProducts] Real catalog fetch returned empty or error, evaluating fallback:", err);
  }

  // Fallback ONLY when explicitly requested (e.g. preview development mode) and not production
  if (allowDemoFallback && process.env.NODE_ENV !== "production") {
    let filtered = [...DEMO_PRODUCTS];

    if (category) {
      const catLower = category.toLowerCase();
      filtered = filtered.filter(
        (p) => p.category.slug.toLowerCase() === catLower || p.category.name.toLowerCase() === catLower
      );
    }

    if (query) {
      const qLower = query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(qLower) ||
          p.shortDescription.toLowerCase().includes(qLower) ||
          p.tags.some((t) => t.toLowerCase().includes(qLower))
      );
    }

    return {
      products: filtered.slice(0, limit),
      total: filtered.length,
      isFallback: true,
    };
  }

  return {
    products: [],
    total: 0,
    isFallback: false,
  };
}
