import { PrismaClient, ProductStatus, ProductType, LicenseType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Directory for local optimized product vector illustrations
const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const PRODUCTS_IMG_DIR = path.resolve(PUBLIC_DIR, "products");

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (!fs.existsSync(PRODUCTS_IMG_DIR)) {
  fs.mkdirSync(PRODUCTS_IMG_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERATE CRISP EDITORIAL PRODUCT ARTWORK (60 DISTINCT SVGs)
// ─────────────────────────────────────────────────────────────────────────────
function generateProductSvg(index: number, title: string, category: string, badge?: string): string {
  // Editorial Color Palette
  const bgStyles = [
    { bg: "#F2E7DB", fg: "#3B261C", accent: "#C46A4A", border: "#C8AA91" },
    { bg: "#3B261C", fg: "#F2E7DB", accent: "#C46A4A", border: "#684332" },
    { bg: "#FAF7F2", fg: "#151311", accent: "#A94432", border: "#C8AA91" },
    { bg: "#684332", fg: "#FAF7F2", accent: "#F2E7DB", border: "#8A6048" },
    { bg: "#211D1A", fg: "#F2E7DB", accent: "#C46A4A", border: "#3B261C" },
  ];
  const style = bgStyles[index % bgStyles.length];
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeCat = category.toUpperCase();

  // Distinct visual motif per category
  let visualMotif = "";
  if (category.toLowerCase().includes("dev")) {
    visualMotif = `
      <rect x="60" y="80" width="480" height="180" rx="12" fill="${style.fg}" opacity="0.08" stroke="${style.border}" stroke-width="1.5"/>
      <circle cx="85" cy="105" r="5" fill="${style.accent}"/>
      <circle cx="102" cy="105" r="5" fill="${style.fg}" opacity="0.3"/>
      <circle cx="119" cy="105" r="5" fill="${style.fg}" opacity="0.3"/>
      <rect x="85" y="130" width="140" height="10" rx="4" fill="${style.accent}" opacity="0.8"/>
      <rect x="85" y="152" width="280" height="8" rx="3" fill="${style.fg}" opacity="0.4"/>
      <rect x="85" y="172" width="220" height="8" rx="3" fill="${style.fg}" opacity="0.3"/>
      <rect x="85" y="192" width="190" height="8" rx="3" fill="${style.fg}" opacity="0.4"/>
      <rect x="85" y="212" width="110" height="8" rx="3" fill="${style.accent}" opacity="0.6"/>
    `;
  } else if (category.toLowerCase().includes("design") || category.toLowerCase().includes("ui")) {
    visualMotif = `
      <rect x="80" y="70" width="200" height="200" rx="16" fill="${style.fg}" opacity="0.06" stroke="${style.border}" stroke-width="1.5"/>
      <rect x="300" y="70" width="220" height="90" rx="12" fill="${style.accent}" opacity="0.15" stroke="${style.accent}" stroke-width="1"/>
      <rect x="300" y="180" width="220" height="90" rx="12" fill="${style.fg}" opacity="0.08" stroke="${style.border}" stroke-width="1"/>
      <circle cx="140" cy="130" r="32" fill="${style.accent}" opacity="0.8"/>
      <path d="M 120 220 L 240 220" stroke="${style.fg}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
      <path d="M 120 240 L 190 240" stroke="${style.accent}" stroke-width="4" stroke-linecap="round"/>
    `;
  } else if (category.toLowerCase().includes("music") || category.toLowerCase().includes("audio")) {
    visualMotif = `
      <circle cx="300" cy="160" r="85" fill="none" stroke="${style.border}" stroke-width="2"/>
      <circle cx="300" cy="160" r="60" fill="none" stroke="${style.accent}" stroke-width="2" opacity="0.6"/>
      <circle cx="300" cy="160" r="35" fill="none" stroke="${style.fg}" stroke-width="2" opacity="0.4"/>
      <circle cx="300" cy="160" r="16" fill="${style.accent}"/>
      <g opacity="0.7">
        <rect x="110" y="220" width="8" height="40" rx="4" fill="${style.fg}"/>
        <rect x="130" y="200" width="8" height="60" rx="4" fill="${style.accent}"/>
        <rect x="150" y="210" width="8" height="50" rx="4" fill="${style.fg}"/>
        <rect x="440" y="215" width="8" height="45" rx="4" fill="${style.fg}"/>
        <rect x="460" y="195" width="8" height="65" rx="4" fill="${style.accent}"/>
        <rect x="480" y="220" width="8" height="40" rx="4" fill="${style.fg}"/>
      </g>
    `;
  } else if (category.toLowerCase().includes("3d")) {
    visualMotif = `
      <g transform="translate(300, 155)">
        <polygon points="0,-70 65,-30 0,10 -65,-30" fill="${style.accent}" opacity="0.8"/>
        <polygon points="0,10 65,-30 65,45 0,85" fill="${style.fg}" opacity="0.6"/>
        <polygon points="0,10 -65,-30 -65,45 0,85" fill="${style.fg}" opacity="0.4"/>
        <circle cx="-110" cy="-20" r="14" fill="${style.accent}" opacity="0.5"/>
        <circle cx="120" cy="30" r="20" fill="none" stroke="${style.border}" stroke-width="2"/>
      </g>
    `;
  } else if (category.toLowerCase().includes("photo") || category.toLowerCase().includes("video")) {
    visualMotif = `
      <rect x="120" y="80" width="360" height="180" rx="14" fill="${style.fg}" opacity="0.08" stroke="${style.border}" stroke-width="1.5"/>
      <circle cx="300" cy="170" r="50" fill="none" stroke="${style.accent}" stroke-width="3"/>
      <circle cx="300" cy="170" r="28" fill="${style.fg}" opacity="0.5"/>
      <line x1="300" y1="95" x2="300" y2="105" stroke="${style.accent}" stroke-width="2"/>
      <line x1="300" y1="235" x2="300" y2="245" stroke="${style.accent}" stroke-width="2"/>
      <line x1="225" y1="170" x2="235" y2="170" stroke="${style.accent}" stroke-width="2"/>
      <line x1="365" y1="170" x2="375" y2="170" stroke="${style.accent}" stroke-width="2"/>
    `;
  } else if (category.toLowerCase().includes("book") || category.toLowerCase().includes("writing")) {
    visualMotif = `
      <g transform="translate(190, 80)">
        <rect x="0" y="0" width="220" height="175" rx="6" fill="${style.fg}" opacity="0.1" stroke="${style.border}" stroke-width="2"/>
        <rect x="15" y="0" width="8" height="175" fill="${style.accent}" opacity="0.9"/>
        <line x1="45" y1="40" x2="190" y2="40" stroke="${style.accent}" stroke-width="3" stroke-linecap="round"/>
        <line x1="45" y1="65" x2="180" y2="65" stroke="${style.fg}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <line x1="45" y1="85" x2="160" y2="85" stroke="${style.fg}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <line x1="45" y1="105" x2="190" y2="105" stroke="${style.fg}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <line x1="45" y1="125" x2="130" y2="125" stroke="${style.fg}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      </g>
    `;
  } else {
    // Default abstract geometry & editorial grid
    visualMotif = `
      <g transform="translate(300, 160)">
        <rect x="-140" y="-70" width="280" height="140" rx="16" fill="${style.fg}" opacity="0.06" stroke="${style.border}" stroke-width="1.5"/>
        <circle cx="-50" cy="0" r="35" fill="${style.accent}" opacity="0.8"/>
        <rect x="10" y="-30" width="90" height="12" rx="4" fill="${style.fg}" opacity="0.5"/>
        <rect x="10" y="-8" width="70" height="10" rx="3" fill="${style.fg}" opacity="0.3"/>
        <rect x="10" y="12" width="100" height="10" rx="3" fill="${style.accent}" opacity="0.7"/>
      </g>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 375" width="600" height="375">
  <defs>
    <linearGradient id="grad-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${style.bg}"/>
      <stop offset="100%" stop-color="${style.bg}" stop-opacity="0.95"/>
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="600" height="375" fill="url(#grad-${index})"/>
  <rect width="600" height="375" fill="none" stroke="${style.border}" stroke-width="2"/>

  <!-- Subtle Editorial Grid Accents -->
  <line x1="40" y1="0" x2="40" y2="375" stroke="${style.border}" stroke-width="0.75" opacity="0.4"/>
  <line x1="560" y1="0" x2="560" y2="375" stroke="${style.border}" stroke-width="0.75" opacity="0.4"/>
  <line x1="0" y1="40" x2="600" y2="40" stroke="${style.border}" stroke-width="0.75" opacity="0.4"/>
  <line x1="0" y1="320" x2="600" y2="320" stroke="${style.border}" stroke-width="0.75" opacity="0.4"/>

  <!-- Category Motif -->
  ${visualMotif}

  <!-- Header Category & Badge -->
  <g transform="translate(60, 48)">
    <text font-family="'Plus Jakarta Sans', -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="${style.accent}">
      ${safeCat}
    </text>
  </g>

  ${
    badge
      ? `
  <g transform="translate(440, 36)">
    <rect x="0" y="0" width="100" height="22" rx="11" fill="${style.accent}" opacity="0.9"/>
    <text x="50" y="15" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="700" fill="#FFFFFF" letter-spacing="0.5">
      ${badge.toUpperCase()}
    </text>
  </g>`
      : ""
  }

  <!-- Bottom Title Block -->
  <g transform="translate(60, 310)">
    <text font-family="'Playfair Display', Georgia, serif" font-size="19" font-weight="700" fill="${style.fg}">
      ${safeTitle.length > 36 ? safeTitle.slice(0, 34) + "..." : safeTitle}
    </text>
    <text y="24" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="500" fill="${style.fg}" opacity="0.6">
      Verified Author Asset • Instant Vault Access
    </text>
  </g>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MAIN SEED PROCESS
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=================================================================");
  console.log("    SEEDING 50–60 PRODUCTION-GRADE DEVELOPMENT MARKETPLACE DATA  ");
  console.log("=================================================================\n");

  const passwordHash = await bcrypt.hash("DemoCreator2026!@#", 10);

  // ── Step A: 16 Standard Categories ──────────────────────────────────────────
  console.log("1. Upserting 16 Standard Marketplace Categories...");
  const CATEGORIES_DATA = [
    { name: "Design", slug: "design", description: "UI kits, icons, design systems and Figma resources.", icon: "Palette", displayOrder: 1 },
    { name: "Development", slug: "development", description: "Full-stack starters, boilerplates, libraries, and developer tools.", icon: "Code", displayOrder: 2 },
    { name: "Templates", slug: "templates", description: "Landing pages, dashboards, notion workspaces, and web templates.", icon: "LayoutTemplate", displayOrder: 3 },
    { name: "Music & Audio", slug: "music-audio", description: "Loops, samples, royalty-free audio, and sound packs.", icon: "Music", displayOrder: 4 },
    { name: "Photography", slug: "photography", description: "Lightroom presets, high-res photo packs, and textures.", icon: "Camera", displayOrder: 5 },
    { name: "Video", slug: "video", description: "DaVinci presets, motion graphics, LUTs, and video effects.", icon: "Film", displayOrder: 6 },
    { name: "3D", slug: "3d", description: "Blender models, 3D icons, textures, and game-ready assets.", icon: "Box", displayOrder: 7 },
    { name: "Education", slug: "education", description: "Courses, technical guides, video masterclasses, and workbooks.", icon: "GraduationCap", displayOrder: 8 },
    { name: "Business", slug: "business", description: "Financial models, pitch decks, proposals, and business kits.", icon: "Briefcase", displayOrder: 9 },
    { name: "Marketing", slug: "marketing", description: "Growth playbooks, ad templates, email sequences, and copy kits.", icon: "TrendingUp", displayOrder: 10 },
    { name: "Writing", slug: "writing", description: "Author toolkits, screenplay templates, and storytelling frameworks.", icon: "PenTool", displayOrder: 11 },
    { name: "Productivity", slug: "productivity", description: "Notion systems, time-tracking frameworks, and workflow templates.", icon: "CheckSquare", displayOrder: 12 },
    { name: "AI", slug: "ai", description: "Prompt collections, GPT workflow pipelines, and AI fine-tuning guides.", icon: "Sparkles", displayOrder: 13 },
    { name: "Fonts", slug: "fonts", description: "Display typefaces, variable font families, and typography kits.", icon: "Type", displayOrder: 14 },
    { name: "Illustration", slug: "illustration", description: "Vector graphics, hand-drawn packs, and character illustrations.", icon: "Smile", displayOrder: 15 },
    { name: "E-books", slug: "ebooks", description: "Digital books, deep-dive technical manuals, and whitepapers.", icon: "BookOpen", displayOrder: 16 },
  ];

  const categoryMap = new Map<string, string>();
  for (const c of CATEGORIES_DATA) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        icon: c.icon,
        displayOrder: c.displayOrder,
        isActive: true,
      },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        displayOrder: c.displayOrder,
        isActive: true,
      },
    });
    categoryMap.set(c.slug, cat.id);
  }
  console.log(`✓ 16 Categories synchronized successfully.\n`);

  // ── Step B: 8 Verified Demo Sellers ─────────────────────────────────────────
  console.log("2. Creating 8 Approved Creator Sellers...");
  const SELLERS_SEED = [
    { email: "monolith@creators.test", name: "Studio Monolith", slug: "studio-monolith", bio: "Editorial design studio crafting premier Figma UI systems and typography kits." },
    { email: "apex@creators.test", name: "Apex Code Labs", slug: "apex-code-labs", bio: "Production full-stack engineering team building resilient Next.js and React boilerplates." },
    { email: "nordic@creators.test", name: "Nordic Audio Works", slug: "nordic-audio-works", bio: "Analog mastering engineer crafting lo-fi sample packs, synth presets, and field recordings." },
    { email: "voxel@creators.test", name: "Voxel 3D Studio", slug: "voxel-3d-studio", bio: "3D character and environment artists providing game-ready Blender assets and icons." },
    { email: "luminary@creators.test", name: "Luminary Presets", slug: "luminary-presets", bio: "Editorial photography studio specializing in cinematic film emulations and RAW presets." },
    { email: "paperink@creators.test", name: "Paper & Ink Press", slug: "paper-ink-press", bio: "Independent publication press publishing technical handbooks, guides, and creator books." },
    { email: "synthetix@creators.test", name: "Synthetix AI Lab", slug: "synthetix-ai-lab", bio: "Machine learning researchers releasing prompt engineering architectures and AI workflows." },
    { email: "prism@creators.test", name: "Prism Design Systems", slug: "prism-design-systems", bio: "Component library architects building accessible mobile and web design foundations." },
  ];

  const sellerIds: string[] = [];
  for (const s of SELLERS_SEED) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        fullName: s.name,
        role: "BUYER",
        isActive: true,
        isEmailVerified: true,
      },
      create: {
        email: s.email,
        fullName: s.name,
        passwordHash,
        role: "BUYER",
        isActive: true,
        isEmailVerified: true,
      },
    });

    const seller = await prisma.sellerProfile.upsert({
      where: { userId: user.id },
      update: {
        storeName: s.name,
        storeSlug: s.slug,
        bio: s.bio,
        status: "APPROVED",
      },
      create: {
        userId: user.id,
        storeName: s.name,
        storeSlug: s.slug,
        bio: s.bio,
        country: "IN",
        status: "APPROVED",
      },
    });
    sellerIds.push(seller.id);
  }
  console.log(`✓ 8 Approved Creator profiles active.\n`);

  // ── Step C: 60 Curated Digital Products Across Categories ───────────────────
  console.log("3. Generating 60 Diverse Digital Products and Local Visual Assets...");

  interface ProductSeedDef {
    title: string;
    slug: string;
    categorySlug: string;
    shortDescription: string;
    pricePaise: number;
    discountPricePaise?: number;
    tags: string[];
    fileFormats: string[];
    productType?: ProductType;
    badge?: string;
  }

  const RAW_PRODUCTS: ProductSeedDef[] = [
    // ── Design (8 items) ───────────────────────────────────────────────────────
    {
      title: "Minimal Portfolio UI Kit",
      slug: "minimal-portfolio-ui-kit",
      categorySlug: "design",
      shortDescription: "Clean, editorial portfolio components crafted in Figma with auto-layout v5.",
      pricePaise: 79900, // ₹799
      discountPricePaise: 99900,
      tags: ["Figma", "Portfolio", "UI Kit", "Minimal"],
      fileFormats: ["FIG", "PDF"],
      badge: "Staff Pick",
    },
    {
      title: "Figma Global Design System v3",
      slug: "figma-global-design-system-v3",
      categorySlug: "design",
      shortDescription: "Enterprise component library with 1,200+ variants, semantic tokens, and light/dark mode.",
      pricePaise: 249900, // ₹2,499
      discountPricePaise: 349900,
      tags: ["Figma", "Design System", "Tokens", "AutoLayout"],
      fileFormats: ["FIG"],
      badge: "Bestseller",
    },
    {
      title: "Mobile Banking & Fintech UI Kit",
      slug: "mobile-banking-fintech-ui-kit",
      categorySlug: "design",
      shortDescription: "65+ production-tested screens for wallet, card management, KYC, and biometric authentication.",
      pricePaise: 149900, // ₹1,499
      tags: ["Fintech", "iOS", "Android", "Figma"],
      fileFormats: ["FIG", "PNG"],
    },
    {
      title: "Editorial Typography & Poster Kit",
      slug: "editorial-typography-poster-kit",
      categorySlug: "design",
      shortDescription: "High-contrast layout grids, typographic pairings, and Swiss-style poster matrices.",
      pricePaise: 49900, // ₹499
      tags: ["Typography", "Editorial", "Layout", "Swiss"],
      fileFormats: ["FIG", "PDF", "AI"],
    },
    {
      title: "Feather Micro-Icon System",
      slug: "feather-micro-icon-system",
      categorySlug: "design",
      shortDescription: "800+ razor-sharp vector line icons on 16px and 24px pixel grids.",
      pricePaise: 29900, // ₹299
      tags: ["Icons", "Vector", "SVG", "Figma"],
      fileFormats: ["SVG", "FIG", "JSON"],
    },
    {
      title: "Dark Modern SaaS UI Wireframes",
      slug: "dark-modern-saas-ui-wireframes",
      categorySlug: "design",
      shortDescription: "Rapid prototyping wireframe kit with 140 modular blocks for B2B web applications.",
      pricePaise: 99900, // ₹999
      tags: ["Wireframes", "SaaS", "UX", "Prototyping"],
      fileFormats: ["FIG"],
    },
    {
      title: "E-Commerce Checkout Flow Pro",
      slug: "ecommerce-checkout-flow-pro",
      categorySlug: "design",
      shortDescription: "Conversion-optimized cart, checkout, payment gateway, and order confirmation flows.",
      pricePaise: 129900, // ₹1,299
      tags: ["Ecommerce", "Checkout", "UX", "Figma"],
      fileFormats: ["FIG"],
    },
    {
      title: "Neomorphic Glass UI Component Kit",
      slug: "neomorphic-glass-ui-component-kit",
      categorySlug: "design",
      shortDescription: "Refined glassmorphic layer styles, blur properties, and multi-state UI elements.",
      pricePaise: 69900, // ₹699
      tags: ["Glassmorphism", "Components", "Web"],
      fileFormats: ["FIG", "CSS"],
    },

    // ── Development (8 items) ──────────────────────────────────────────────────
    {
      title: "React Admin Dashboard Starter",
      slug: "react-admin-dashboard-starter",
      categorySlug: "development",
      shortDescription: "Complete TypeScript admin dashboard with TanStack Table, charts, and role auth.",
      pricePaise: 199900, // ₹1,999
      discountPricePaise: 299900,
      tags: ["React", "TypeScript", "Tailwind", "Admin"],
      fileFormats: ["ZIP", "TS"],
      productType: "SOFTWARE",
      badge: "Trending",
    },
    {
      title: "Next.js 14 Production SaaS Starter",
      slug: "nextjs-14-production-saas-starter",
      categorySlug: "development",
      shortDescription: "Next.js 14 App Router, Prisma ORM, Stripe/Razorpay webhooks, and JWT authentication.",
      pricePaise: 399900, // ₹3,999
      discountPricePaise: 499900,
      tags: ["Next.js", "Prisma", "FullStack", "Stripe"],
      fileFormats: ["ZIP", "TS"],
      productType: "SOFTWARE",
      badge: "Bestseller",
    },
    {
      title: "Tailwind CSS Component Vault",
      slug: "tailwind-css-component-vault",
      categorySlug: "development",
      shortDescription: "Over 200 copy-paste Tailwind UI components with zero external JS dependencies.",
      pricePaise: 79900, // ₹799
      tags: ["TailwindCSS", "HTML", "Components"],
      fileFormats: ["ZIP", "HTML"],
      productType: "SOFTWARE",
    },
    {
      title: "REST & GraphQL API Starter Kit",
      slug: "rest-graphql-api-starter-kit",
      categorySlug: "development",
      shortDescription: "Fastify & Express backend boilerplate with Redis caching and automated Swagger docs.",
      pricePaise: 149900, // ₹1,499
      tags: ["Node.js", "Fastify", "Redis", "TypeScript"],
      fileFormats: ["ZIP", "TS"],
      productType: "SOFTWARE",
    },
    {
      title: "Authentication & RBAC Engine",
      slug: "authentication-rbac-engine",
      categorySlug: "development",
      shortDescription: "Production-hardened session and JWT authentication with MFA support and rate limiting.",
      pricePaise: 129900, // ₹1,299
      tags: ["Auth", "Security", "RBAC", "TypeScript"],
      fileFormats: ["ZIP", "TS"],
      productType: "SOFTWARE",
    },
    {
      title: "Mobile React Native Starter",
      slug: "mobile-react-native-starter",
      categorySlug: "development",
      shortDescription: "Expo 51 boilerplate with push notifications, offline cache, and native navigation.",
      pricePaise: 249900, // ₹2,499
      tags: ["ReactNative", "Expo", "Mobile", "iOS"],
      fileFormats: ["ZIP", "TS"],
      productType: "SOFTWARE",
    },
    {
      title: "Microservices Docker Swarm Template",
      slug: "microservices-docker-swarm-template",
      categorySlug: "development",
      shortDescription: "Production Docker compose recipes with NGINX reverse proxy, Prometheus, and Grafana.",
      pricePaise: 99900, // ₹999
      tags: ["Docker", "DevOps", "NGINX", "Monitoring"],
      fileFormats: ["ZIP", "YML"],
      productType: "SOFTWARE",
    },
    {
      title: "Python Data Pipeline & Scraper Kit",
      slug: "python-data-pipeline-scraper-kit",
      categorySlug: "development",
      shortDescription: "Robust Playwright and Scrapy pipelines with anti-captcha and PostgreSQL export.",
      pricePaise: 179900, // ₹1,799
      tags: ["Python", "Scraping", "Playwright", "Data"],
      fileFormats: ["ZIP", "PY"],
      productType: "SOFTWARE",
    },

    // ── Templates (8 items) ────────────────────────────────────────────────────
    {
      title: "SaaS Landing Page Template",
      slug: "saas-landing-page-template",
      categorySlug: "templates",
      shortDescription: "High-converting modern landing page with pricing matrix, FAQ, and test preview.",
      pricePaise: 79900, // ₹799
      discountPricePaise: 119900,
      tags: ["LandingPage", "Next.js", "Conversion", "SaaS"],
      fileFormats: ["ZIP", "TSX"],
      badge: "Popular",
    },
    {
      title: "Minimal Creator Portfolio Theme",
      slug: "minimal-creator-portfolio-theme",
      categorySlug: "templates",
      shortDescription: "Aesthetic personal site for writers, designers, and engineers with built-in markdown blog.",
      pricePaise: 49900, // ₹499
      tags: ["Portfolio", "Blog", "Astro", "Tailwind"],
      fileFormats: ["ZIP", "ASTRO"],
    },
    {
      title: "Digital Marketplace HTML Starter",
      slug: "digital-marketplace-html-starter",
      categorySlug: "templates",
      shortDescription: "Multi-page store template with product grid, cart drawer, and review cards.",
      pricePaise: 99900, // ₹999
      tags: ["HTML5", "CSS", "Marketplace", "Shop"],
      fileFormats: ["ZIP", "HTML"],
    },
    {
      title: "Agency Pitch Deck & Keynote Kit",
      slug: "agency-pitch-deck-keynote-kit",
      categorySlug: "templates",
      shortDescription: "45 sleek presentation slides for client proposals, deliverables, and brand audits.",
      pricePaise: 79900, // ₹799
      tags: ["Presentation", "Keynote", "PowerPoint", "Deck"],
      fileFormats: ["KEY", "PPTX", "PDF"],
    },
    {
      title: "Agency Contract & Proposal Kit",
      slug: "agency-contract-proposal-kit",
      categorySlug: "templates",
      shortDescription: "Legally vetted client service agreement, statement of work, and change order templates.",
      pricePaise: 149900, // ₹1,499
      tags: ["Legal", "Contract", "Freelance", "Proposal"],
      fileFormats: ["DOCX", "PDF"],
    },
    {
      title: "Brand Guidelines Specification Template",
      slug: "brand-guidelines-specification-template",
      categorySlug: "templates",
      shortDescription: "32-page brand manual in InDesign and Figma covering logo usage, color hierarchy, and type.",
      pricePaise: 89900, // ₹899
      tags: ["Branding", "Identity", "Guidelines", "Figma"],
      fileFormats: ["INDD", "FIG", "PDF"],
    },
    {
      title: "Mobile App Store Screenshot Kit",
      slug: "mobile-app-store-screenshot-kit",
      categorySlug: "templates",
      shortDescription: "Figma mockup generator for App Store and Google Play promotional screenshots.",
      pricePaise: 39900, // ₹399
      tags: ["AppStore", "Screenshots", "Mockups", "Figma"],
      fileFormats: ["FIG"],
    },
    {
      title: "Resume & Curriculum Vitae Pack",
      slug: "resume-curriculum-vitae-pack",
      categorySlug: "templates",
      shortDescription: "Clean ATS-friendly single-page and two-page resume templates with cover letter.",
      pricePaise: 29900, // ₹299
      tags: ["Resume", "CV", "Career", "Minimal"],
      fileFormats: ["DOCX", "FIG", "PDF"],
    },

    // ── Music & Audio (5 items) ────────────────────────────────────────────────
    {
      title: "Indie Chill & Lo-Fi Sample Pack",
      slug: "indie-chill-lo-fi-sample-pack",
      categorySlug: "music-audio",
      shortDescription: "180+ royalty-free dusty drum breaks, vinyl crackles, Rhodes chords, and warm analog basslines.",
      pricePaise: 99900, // ₹999
      discountPricePaise: 149900,
      tags: ["LoFi", "Samples", "Beats", "WAV"],
      fileFormats: ["WAV", "ZIP"],
      badge: "Staff Pick",
    },
    {
      title: "Analog Synth Melodies & Arps",
      slug: "analog-synth-melodies-arps",
      categorySlug: "music-audio",
      shortDescription: "Recorded through vintage Moog and Juno synths, key-labeled 24-bit 48kHz WAV loops.",
      pricePaise: 129900, // ₹1,299
      tags: ["Synthesizer", "Analog", "Melody", "WAV"],
      fileFormats: ["WAV", "MIDI", "ZIP"],
    },
    {
      title: "Cinema Strings & Ambient Textures",
      slug: "cinema-strings-ambient-textures",
      categorySlug: "music-audio",
      shortDescription: "Rich orchestral swelling textures, bowing articulations, and atmospheric pads for film scoring.",
      pricePaise: 199900, // ₹1,999
      tags: ["Cinematic", "Strings", "FilmScore", "Ambient"],
      fileFormats: ["WAV", "ZIP"],
    },
    {
      title: "Serum Cyberpunk Preset Vault",
      slug: "serum-cyberpunk-preset-vault",
      categorySlug: "music-audio",
      shortDescription: "120 aggressive bass patches, reese leads, and glitch impacts for Xfer Serum.",
      pricePaise: 79900, // ₹799
      tags: ["Serum", "Presets", "Cyberpunk", "Bass"],
      fileFormats: ["FXP", "ZIP"],
    },
    {
      title: "Podcast Audio Master Presets",
      slug: "podcast-audio-master-presets",
      categorySlug: "music-audio",
      shortDescription: "One-click vocal mastering chains for Adobe Audition, Logic Pro, and REAPER.",
      pricePaise: 49900, // ₹499
      tags: ["Podcast", "Mastering", "Vocals", "Presets"],
      fileFormats: ["ZIP", "PDF"],
    },

    // ── Photography (5 items) ──────────────────────────────────────────────────
    {
      title: "Cinematic 35mm Film Presets",
      slug: "cinematic-35mm-film-presets",
      categorySlug: "photography",
      shortDescription: "Authentic Portra 400, Tri-X 400, and CineStill 800T color profiles for Lightroom Desktop & Mobile.",
      pricePaise: 79900, // ₹799
      discountPricePaise: 129900,
      tags: ["Lightroom", "Presets", "35mm", "Film"],
      fileFormats: ["XMP", "DNG", "ZIP"],
      badge: "Trending",
    },
    {
      title: "Street & Urban Mood Presets",
      slug: "street-urban-mood-presets",
      categorySlug: "photography",
      shortDescription: "Moody shadows, warm tungsten accents, and deep blacks for night and architectural photography.",
      pricePaise: 59900, // ₹599
      tags: ["Street", "Urban", "Lightroom", "Night"],
      fileFormats: ["XMP", "DNG"],
    },
    {
      title: "Moody Nordic Landscape Pack",
      slug: "moody-nordic-landscape-pack",
      categorySlug: "photography",
      shortDescription: "Desaturated greens, muted mist tones, and enhanced dynamic range for outdoor nature shots.",
      pricePaise: 69900, // ₹699
      tags: ["Landscape", "Nordic", "Nature", "Moody"],
      fileFormats: ["XMP", "DNG"],
    },
    {
      title: "Editorial Fashion Color Grading",
      slug: "editorial-fashion-color-grading",
      categorySlug: "photography",
      shortDescription: "True skin tones, clean highlights, and high-fashion saturation balancing for studio portraits.",
      pricePaise: 99900, // ₹999
      tags: ["Fashion", "Portrait", "Studio", "SkinTones"],
      fileFormats: ["XMP", "DNG"],
    },
    {
      title: "Vintage Monochrome Film Profiles",
      slug: "vintage-monochrome-film-profiles",
      categorySlug: "photography",
      shortDescription: "12 classic black-and-white tonal curves with authentic film grain simulation.",
      pricePaise: 39900, // ₹399
      tags: ["BlackAndWhite", "Monochrome", "Vintage"],
      fileFormats: ["XMP", "DNG"],
    },

    // ── Education (5 items) ────────────────────────────────────────────────────
    {
      title: "Full-Stack System Design Handbook",
      slug: "full-stack-system-design-handbook",
      categorySlug: "education",
      shortDescription: "Comprehensive architectural diagrams and real-world trade-offs for scaling to 10M requests/day.",
      pricePaise: 149900, // ₹1,499
      discountPricePaise: 199900,
      tags: ["SystemDesign", "Architecture", "Engineering", "Book"],
      fileFormats: ["PDF", "EPUB"],
      badge: "Bestseller",
    },
    {
      title: "Modern React Architecture Course",
      slug: "modern-react-architecture-course",
      categorySlug: "education",
      shortDescription: "8 hours of deep dive modules on Server Components, suspense boundaries, and state machines.",
      pricePaise: 299900, // ₹2,999
      discountPricePaise: 399900,
      tags: ["React", "Architecture", "Course", "Video"],
      fileFormats: ["ZIP", "PDF"],
    },
    {
      title: "Digital Product Creator Playbook",
      slug: "digital-product-creator-playbook",
      categorySlug: "education",
      shortDescription: "From idea validation to ₹1,00,000 monthly recurring revenue selling templates and software.",
      pricePaise: 99900, // ₹999
      tags: ["Creator", "Business", "Marketing", "Guides"],
      fileFormats: ["PDF", "NOTION"],
    },
    {
      title: "Advanced TypeScript Workbook",
      slug: "advanced-typescript-workbook",
      categorySlug: "education",
      shortDescription: "150 interactive exercises on conditional types, template literals, and type-level programming.",
      pricePaise: 79900, // ₹799
      tags: ["TypeScript", "Exercises", "Code"],
      fileFormats: ["PDF", "ZIP"],
    },
    {
      title: "UX Research Masterclass Workbook",
      slug: "ux-research-masterclass-workbook",
      categorySlug: "education",
      shortDescription: "User interview scripts, affinity mapping matrices, and usability testing scorecards.",
      pricePaise: 69900, // ₹699
      tags: ["UX", "Research", "Testing", "Templates"],
      fileFormats: ["PDF", "FIG"],
    },

    // ── 3D (4 items) ───────────────────────────────────────────────────────────
    {
      title: "3D Clay Tech Icon Collection",
      slug: "3d-clay-tech-icon-collection",
      categorySlug: "3d",
      shortDescription: "60 ultra-detailed clay-style 3D technology and finance icons with transparent PNG and FBX.",
      pricePaise: 129900, // ₹1,299
      discountPricePaise: 179900,
      tags: ["3D", "Blender", "Icons", "Clay"],
      fileFormats: ["BLEND", "FBX", "PNG"],
      badge: "Popular",
    },
    {
      title: "Modular Sci-Fi Corridor Kit",
      slug: "modular-sci-fi-corridor-kit",
      categorySlug: "3d",
      shortDescription: "Game-ready PBR textured modular structural pieces for Unity and Unreal Engine.",
      pricePaise: 249900, // ₹2,499
      tags: ["3D", "GameReady", "Unreal", "Unity"],
      fileFormats: ["FBX", "OBJ", "PNG"],
    },
    {
      title: "Abstract Geometric Shape Renders",
      slug: "abstract-geometric-shape-renders",
      categorySlug: "3d",
      shortDescription: "45 high-resolution 4K transparent render assets with holographic iridescent materials.",
      pricePaise: 59900, // ₹599
      tags: ["3D", "Abstract", "Renders", "Holographic"],
      fileFormats: ["PNG", "PSD"],
    },
    {
      title: "Isometric Room & Office Scene Kit",
      slug: "isometric-room-office-scene-kit",
      categorySlug: "3d",
      shortDescription: "Customizable 3D workspace setup with baked lighting and organized asset hierarchy.",
      pricePaise: 99900, // ₹999
      tags: ["Blender", "Isometric", "Interior", "3D"],
      fileFormats: ["BLEND", "GLTF"],
    },

    // ── Business (4 items) ─────────────────────────────────────────────────────
    {
      title: "SaaS Financial Model & Valuation",
      slug: "saas-financial-model-valuation",
      categorySlug: "business",
      shortDescription: "Detailed 5-year financial projection model with MRR build-up, CAC, LTV, and churn math.",
      pricePaise: 199900, // ₹1,999
      discountPricePaise: 249900,
      tags: ["Finance", "SaaS", "Excel", "Spreadsheet"],
      fileFormats: ["XLSX", "PDF"],
      badge: "Staff Pick",
    },
    {
      title: "Venture Capital Pitch Deck Template",
      slug: "venture-capital-pitch-deck-template",
      categorySlug: "business",
      shortDescription: "Proven 15-slide pitch structure used by founders to raise Seed and Series A financing.",
      pricePaise: 129900, // ₹1,299
      tags: ["PitchDeck", "VC", "Fundraising", "Slides"],
      fileFormats: ["KEY", "PPTX", "PDF"],
    },
    {
      title: "Independent Consultant Client Kit",
      slug: "independent-consultant-client-kit",
      categorySlug: "business",
      shortDescription: "Discovery call framework, scope of work document, and retainer billing invoices.",
      pricePaise: 89900, // ₹899
      tags: ["Consulting", "Freelance", "Contracts"],
      fileFormats: ["DOCX", "PDF", "NOTION"],
    },
    {
      title: "Cap Table & Equity Simulator",
      slug: "cap-table-equity-simulator",
      categorySlug: "business",
      shortDescription: "Model SAFE notes, convertible notes, option pools, and future round dilution cleanly.",
      pricePaise: 99900, // ₹999
      tags: ["Startup", "CapTable", "Equity", "Excel"],
      fileFormats: ["XLSX", "GOOGLE_SHEETS"],
    },

    // ── AI (4 items) ───────────────────────────────────────────────────────────
    {
      title: "Production LLM Prompt Architecture",
      slug: "production-llm-prompt-architecture",
      categorySlug: "ai",
      shortDescription: "Over 200 system prompts for code generation, JSON extraction, and autonomous agent loops.",
      pricePaise: 79900, // ₹799
      discountPricePaise: 119900,
      tags: ["AI", "LLM", "PromptEngineering", "GPT"],
      fileFormats: ["JSON", "MD", "PDF"],
      badge: "Trending",
    },
    {
      title: "Midjourney Photorealism Blueprint",
      slug: "midjourney-photorealism-blueprint",
      categorySlug: "ai",
      shortDescription: "Exact camera lenses, lighting styles, color temperatures, and aspect ratios for v6.",
      pricePaise: 49900, // ₹499
      tags: ["Midjourney", "AIArt", "Prompts", "Photography"],
      fileFormats: ["PDF", "NOTION"],
    },
    {
      title: "Autonomous Agent Workflow Recipes",
      slug: "autonomous-agent-workflow-recipes",
      categorySlug: "ai",
      shortDescription: "LangChain and AutoGen multi-agent orchestration code recipes with vector memory.",
      pricePaise: 149900, // ₹1,499
      tags: ["AI", "LangChain", "Agents", "Python"],
      fileFormats: ["ZIP", "PY"],
    },
    {
      title: "AI Fine-Tuning Dataset Generator",
      slug: "ai-fine-tuning-dataset-generator",
      categorySlug: "ai",
      shortDescription: "Scripts to transform raw markdown and codebase repositories into clean JSONL training pairs.",
      pricePaise: 99900, // ₹999
      tags: ["FineTuning", "Dataset", "OpenAI", "Python"],
      fileFormats: ["ZIP", "PY"],
    },

    // ── Writing (3 items) ──────────────────────────────────────────────────────
    {
      title: "The Novelist Manuscript Framework",
      slug: "the-novelist-manuscript-framework",
      categorySlug: "writing",
      shortDescription: "3-Act chapter planning, character arc trackers, and Scrivener/Notion manuscript setup.",
      pricePaise: 49900, // ₹499
      tags: ["Writing", "Novel", "Fiction", "Scrivener"],
      fileFormats: ["NOTION", "PDF", "DOCX"],
    },
    {
      title: "Technical Writing Style Guide",
      slug: "technical-writing-style-guide",
      categorySlug: "writing",
      shortDescription: "Rules for developer documentation, API reference consistency, and changelog drafting.",
      pricePaise: 69900, // ₹699
      tags: ["TechnicalWriting", "Documentation", "API"],
      fileFormats: ["PDF", "MD"],
    },
    {
      title: "Screenplay Beat Sheet & Bible",
      slug: "screenplay-beat-sheet-bible",
      categorySlug: "writing",
      shortDescription: "Blake Snyder 15-beat expansion matrix and series pitch bible templates.",
      pricePaise: 39900, // ₹399
      tags: ["Screenwriting", "Script", "Film", "Templates"],
      fileFormats: ["FDX", "PDF"],
    },

    // ── Productivity (3 items) ─────────────────────────────────────────────────
    {
      title: "Creator Operating System for Notion",
      slug: "creator-operating-system-for-notion",
      categorySlug: "productivity",
      shortDescription: "All-in-one Notion workspace for sponsorship CRM, editorial calendar, and cash flow.",
      pricePaise: 99900, // ₹999
      discountPricePaise: 149900,
      tags: ["Notion", "Productivity", "Creator", "CRM"],
      fileFormats: ["NOTION", "PDF"],
      badge: "Bestseller",
    },
    {
      title: "Second Brain Knowledge Management",
      slug: "second-brain-knowledge-management",
      categorySlug: "productivity",
      shortDescription: "PARA method implementation with automated inbox capture and bi-directional linking.",
      pricePaise: 79900, // ₹799
      tags: ["PARA", "Knowledge", "Obsidian", "Notion"],
      fileFormats: ["NOTION", "MD"],
    },
    {
      title: "Weekly Time Blocking Matrix",
      slug: "weekly-time-blocking-matrix",
      categorySlug: "productivity",
      shortDescription: "Deep work planning system for solo founders with Pomodoro and priority quadrants.",
      pricePaise: 29900, // ₹299
      tags: ["TimeManagement", "DeepWork", "Calendar"],
      fileFormats: ["PDF", "GOOGLE_SHEETS"],
    },

    // ── Illustration (3 items) ─────────────────────────────────────────────────
    {
      title: "Hand-Drawn Organic Botanical Vectors",
      slug: "hand-drawn-organic-botanical-vectors",
      categorySlug: "illustration",
      shortDescription: "140 delicate leaf, flower, and vine illustrations in vector SVG and high-res transparent PNG.",
      pricePaise: 59900, // ₹599
      tags: ["Illustration", "Botanical", "Vector", "SVG"],
      fileFormats: ["SVG", "AI", "PNG"],
    },
    {
      title: "Character Builder Modular Vector Kit",
      slug: "character-builder-modular-vector-kit",
      categorySlug: "illustration",
      shortDescription: "Mix-and-match facial features, hairstyles, and outfits for tech product onboarding avatars.",
      pricePaise: 89900, // ₹899
      tags: ["Characters", "Avatar", "Vector", "Figma"],
      fileFormats: ["FIG", "SVG", "PNG"],
      badge: "Staff Pick",
    },
    {
      title: "Retro Risograph Texture & Brush Pack",
      slug: "retro-risograph-texture-brush-pack",
      categorySlug: "illustration",
      shortDescription: "Authentic grain, halftone dots, and misregistration brushes for Photoshop and Procreate.",
      pricePaise: 69900, // ₹699
      tags: ["Procreate", "Photoshop", "Brushes", "Risograph"],
      fileFormats: ["ABR", "BRUSHSET"],
    },
  ];

  console.log(`Total Products to process: ${RAW_PRODUCTS.length}`);

  let createdCount = 0;
  for (let i = 0; i < RAW_PRODUCTS.length; i++) {
    const p = RAW_PRODUCTS[i];
    const catId = categoryMap.get(p.categorySlug);
    if (!catId) {
      console.warn(`Category not found for slug: ${p.categorySlug}, skipping.`);
      continue;
    }
    const sellerId = sellerIds[i % sellerIds.length];

    // 1. Generate & Save crisp vector artwork
    const svgFileName = `product-${i + 1}.svg`;
    const svgFilePath = path.join(PRODUCTS_IMG_DIR, svgFileName);
    const svgContent = generateProductSvg(i, p.title, p.categorySlug, p.badge);
    fs.writeFileSync(svgFilePath, svgContent, "utf8");
    const thumbnailUrl = `/products/${svgFileName}`;

    // 2. Deterministic reviews & ratings
    const ratingAvg = Number((4.75 + (i % 26) * 0.01).toFixed(2));
    const reviewsCount = 15 + ((i * 17) % 180);
    const salesCount = 60 + ((i * 43) % 1200);

    // 3. Upsert Product Record
    const productRecord = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        shortDescription: p.shortDescription,
        description: `### ${p.title}\n\n${p.shortDescription}\n\n#### What's Included:\n- Full commercial license\n- Lifetime product updates\n- Cryptographically verified files\n- Direct creator support\n\n#### Technical Specifications:\n- Formats: ${p.fileFormats.join(", ")}\n- Version: 1.2.0\n- Ready for production deployment`,
        pricePaise: p.pricePaise,
        discountPricePaise: p.discountPricePaise || null,
        isFree: false,
        categoryId: catId,
        sellerId: sellerId,
        tags: p.tags,
        fileFormats: p.fileFormats,
        status: ProductStatus.PUBLISHED,
        productType: p.productType || ProductType.DIGITAL_DOWNLOAD,
        licenseType: LicenseType.COMMERCIAL,
        ratingAvg,
        reviewsCount,
        salesCount,
        isFeatured: i < 8,
      },
      create: {
        title: p.title,
        slug: p.slug,
        shortDescription: p.shortDescription,
        description: `### ${p.title}\n\n${p.shortDescription}\n\n#### What's Included:\n- Full commercial license\n- Lifetime product updates\n- Cryptographically verified files\n- Direct creator support\n\n#### Technical Specifications:\n- Formats: ${p.fileFormats.join(", ")}\n- Version: 1.2.0\n- Ready for production deployment`,
        pricePaise: p.pricePaise,
        discountPricePaise: p.discountPricePaise || null,
        isFree: false,
        categoryId: catId,
        sellerId: sellerId,
        tags: p.tags,
        fileFormats: p.fileFormats,
        status: ProductStatus.PUBLISHED,
        productType: p.productType || ProductType.DIGITAL_DOWNLOAD,
        licenseType: LicenseType.COMMERCIAL,
        ratingAvg,
        reviewsCount,
        salesCount,
        isFeatured: i < 8,
      },
    });

    // 4. Upsert ProductMedia
    const existingMedia = await prisma.productMedia.findFirst({
      where: { productId: productRecord.id, type: "THUMBNAIL" },
    });
    if (existingMedia) {
      await prisma.productMedia.update({
        where: { id: existingMedia.id },
        data: { url: thumbnailUrl },
      });
    } else {
      await prisma.productMedia.create({
        data: {
          productId: productRecord.id,
          type: "THUMBNAIL",
          url: thumbnailUrl,
          displayOrder: 0,
        },
      });
    }

    // 5. Upsert ProductFile
    const existingFile = await prisma.productFile.findFirst({
      where: { productId: productRecord.id },
    });
    if (!existingFile) {
      await prisma.productFile.create({
        data: {
          productId: productRecord.id,
          originalFilename: `${p.slug}-v1.2.0.zip`,
          fileSize: BigInt(24500000 + i * 1500000), // ~25MB - 110MB
          mimeType: "application/zip",
          storageKey: `prod-assets/${p.slug}/${p.slug}-v1.2.0.zip`,
          version: "1.2.0",
        },
      });
    }

    createdCount++;
  }

  console.log(`✓ ${createdCount} Products synchronized with thumbnails and files!\n`);

  // ── Step D: Distribution Verification Table ────────────────────────────────
  const counts = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { status: "PUBLISHED" },
    _count: true,
  });

  const catNames = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
  });
  const catNameMap = new Map(catNames.map((c) => [c.id, c.name]));

  console.log("=================================================================");
  console.log("             CATEGORY DISTRIBUTION SUMMARY (DATABASE)            ");
  console.log("=================================================================");
  const summaryTable = counts.map((c) => ({
    Category: catNameMap.get(c.categoryId) || c.categoryId,
    ProductCount: c._count,
  }));
  console.table(summaryTable);

  const totalPub = await prisma.product.count({ where: { status: "PUBLISHED" } });
  console.log(`\nTOTAL PUBLISHED PRODUCTS IN CATALOG: ${totalPub}`);
  console.log("=================================================================\n");
}

main()
  .catch((err) => {
    console.error("FATAL ERROR IN DEMO SEEDER:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
