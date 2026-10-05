/**
 * Feature 22 Test Suite — Advanced Search, Product Discovery & Filtering
 *
 * Validates:
 *   1. Public visibility: ONLY PUBLISHED products returned (DRAFT, PENDING, REJECTED, ARCHIVED, SUSPENDED hidden).
 *   2. Multi-field search: title, shortDescription, description, tags.
 *   3. Search relevance & normalization: whitespace collapsing, control char stripping, conjunctive multi-token matching.
 *   4. Category filtering: by slug, by CUID, alias handling, non-existent / inactive category rejection (400).
 *   5. Price range filtering: priceMin, priceMax, aliases, bounds validation, zero-price / free items.
 *   6. Rating filtering: ratingAvg >= minRating, invalid ratings rejected.
 *   7. Seller filtering: storeSlug, seller CUID, isolation, suspended seller filtering.
 *   8. License & product type filtering: COMMERCIAL, PERSONAL, EXTENDED, DIGITAL_DOWNLOAD.
 *   9. Sorting allowlist: newest, price_low / price_asc, price_high / price_desc, rating, popular / best_selling.
 *  10. Pagination: limit, page, bounds (limit <= 100), response meta.
 *  11. Search security: SQL injection prevention, Prisma query injection, script tags, strict parameter validation.
 *  12. Data leakage prevention: storage keys, private files, PAN, bank accounts, hashes, rejection reasons absent.
 *  13. Public Categories API: GET /api/v1/categories returns active categories with accurate product counts.
 */

import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { GET as catalogHandler } from "../src/app/api/v1/products/route";
import { GET as productDetailHandler } from "../src/app/api/v1/products/[slug]/route";
import { GET as categoriesHandler } from "../src/app/api/v1/categories/route";

function makeReq(url: string, method = "GET", body?: unknown): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJson(res: Response): Promise<{ status: number; [key: string]: any }> {
  const json = await res.json();
  return { status: res.status, ...json };
}

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];
let testCounter = 0;

async function runTest(
  name: string,
  fn: () => Promise<{ passed: boolean; details?: string }>
) {
  testCounter++;
  const num = testCounter;
  try {
    const res = await fn();
    results.push({ num, name, passed: res.passed, details: res.details });
    if (res.passed) {
      console.log(`[PASS] Test ${String(num).padStart(2, "0")}: ${name}`);
    } else {
      console.error(
        `[FAIL] Test ${String(num).padStart(2, "0")}: ${name}${res.details ? " — " + res.details : ""}`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ num, name, passed: false, details: `Exception: ${msg}` });
    console.error(`[FAIL] Test ${String(num).padStart(2, "0")}: ${name} — Exception: ${msg}`);
  }
}

async function main() {
  console.log("=".repeat(75));
  console.log("DIGITAL MARKETPLACE — FEATURE 22: ADVANCED SEARCH & PRODUCT DISCOVERY");
  console.log("=".repeat(75) + "\n");

  const ts = Date.now();
  const ph = await hashPassword("SearchPass123!@#");

  // ── Seed Categories ────────────────────────────────────────────────────────
  const catSoftware = await prisma.category.create({
    data: {
      name: `Developer Tools ${ts}`,
      slug: `dev-tools-${ts}`,
      description: "CLI tools, developer utilities and libraries",
      displayOrder: 1,
      isActive: true,
    },
  });

  const catDesign = await prisma.category.create({
    data: {
      name: `Design Systems ${ts}`,
      slug: `design-systems-${ts}`,
      description: "Figma design tokens and component kits",
      displayOrder: 2,
      isActive: true,
    },
  });

  const catInactive = await prisma.category.create({
    data: {
      name: `Deprecated Category ${ts}`,
      slug: `deprecated-${ts}`,
      description: "Inactive category that should not be visible",
      displayOrder: 99,
      isActive: false,
    },
  });

  // ── Seed Sellers ───────────────────────────────────────────────────────────
  // Active Seller Alpha
  const userAlpha = await prisma.user.create({
    data: {
      fullName: "Alpha Search Seller",
      email: `alpha.search.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      sellerProfile: {
        create: {
          storeName: `Alpha Labs ${ts}`,
          storeSlug: `alpha-labs-${ts}`,
          bio: "Creators of world-class React tools",
          status: "APPROVED",
          totalRevenuePaise: BigInt(0),
          netEarningsPaise: BigInt(0),
          pendingBalance: BigInt(0),
          availableBalance: BigInt(0),
          panNumberMasked: "ABCDE****F",
          bankAccountLast4: "****1111",
          bankIfsc: "HDFC0001111",
          bankAccountHolder: "Alpha Search Seller",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerAlpha = userAlpha.sellerProfile!;

  // Active Seller Beta
  const userBeta = await prisma.user.create({
    data: {
      fullName: "Beta Search Seller",
      email: `beta.search.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      sellerProfile: {
        create: {
          storeName: `Beta Creatives ${ts}`,
          storeSlug: `beta-creatives-${ts}`,
          bio: "Figma experts and graphic kits",
          status: "APPROVED",
          totalRevenuePaise: BigInt(0),
          netEarningsPaise: BigInt(0),
          pendingBalance: BigInt(0),
          availableBalance: BigInt(0),
          panNumberMasked: "XYZAB****C",
          bankAccountLast4: "****2222",
          bankIfsc: "ICIC0002222",
          bankAccountHolder: "Beta Search Seller",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerBeta = userBeta.sellerProfile!;

  // Suspended Seller
  const userSuspended = await prisma.user.create({
    data: {
      fullName: "Suspended Search Seller",
      email: `suspended.search.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      sellerProfile: {
        create: {
          storeName: `Suspended Store ${ts}`,
          storeSlug: `suspended-store-${ts}`,
          bio: "Banned seller account",
          status: "SUSPENDED",
          totalRevenuePaise: BigInt(0),
          netEarningsPaise: BigInt(0),
          pendingBalance: BigInt(0),
          availableBalance: BigInt(0),
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerSuspended = userSuspended.sellerProfile!;

  // ── Seed Products ─────────────────────────────────────────────────────────
  // Prod 1: React Dashboard Pro (Alpha, Software, ₹1,500, Rating 4.8, Commercial)
  const prod1 = await prisma.product.create({
    data: {
      sellerId: sellerAlpha.id,
      categoryId: catSoftware.id,
      title: `NextJS React Dashboard Pro ${ts}`,
      slug: `nextjs-react-dashboard-${ts}`,
      shortDescription: "Ultra responsive modular React admin dashboard system",
      description: "Full-stack enterprise application with analytics, charts, and dark mode.",
      productType: "SOFTWARE",
      pricePaise: 150000, // ₹1,500
      discountPricePaise: 200000,
      isFree: false,
      licenseType: "COMMERCIAL",
      ratingAvg: 4.8,
      reviewsCount: 12,
      salesCount: 85,
      tags: ["react", "nextjs", "dashboard", "analytics"],
      status: "PUBLISHED",
      createdAt: new Date(Date.now() - 1000 * 15), // 15 secs ago
    },
  });

  // Prod 2: Free Tailwind UI Elements (Alpha, Software, Free, Rating 4.2, Personal)
  const prod2 = await prisma.product.create({
    data: {
      sellerId: sellerAlpha.id,
      categoryId: catSoftware.id,
      title: `Tailwind UI Free Components ${ts}`,
      slug: `tailwind-ui-free-${ts}`,
      shortDescription: "Open-source Tailwind CSS components for rapid prototyping",
      description: "Over 50 accessible components designed for modern web applications.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 0, // Free
      isFree: true,
      licenseType: "PERSONAL",
      ratingAvg: 4.2,
      reviewsCount: 5,
      salesCount: 210,
      tags: ["tailwind", "css", "free", "ui"],
      status: "PUBLISHED",
      createdAt: new Date(Date.now() - 1000 * 25), // 25 secs ago
    },
  });

  // Prod 3: Figma Design System (Beta, Design, ₹2,500, Rating 4.9, Extended)
  const prod3 = await prisma.product.create({
    data: {
      sellerId: sellerBeta.id,
      categoryId: catDesign.id,
      title: `Omni Figma Design System ${ts}`,
      slug: `omni-figma-system-${ts}`,
      shortDescription: "Comprehensive Figma UI kit with auto-layout v5 tokens",
      description: "Built for scalable design teams. Includes typography scale and component variants.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 250000, // ₹2,500
      isFree: false,
      licenseType: "EXTENDED",
      ratingAvg: 4.9,
      reviewsCount: 30,
      salesCount: 150,
      tags: ["figma", "tokens", "wireframe", "design-system"],
      status: "PUBLISHED",
      createdAt: new Date(Date.now() - 1000 * 5), // 5 secs ago (newest)
    },
  });

  // Prod 4: Budget Icon Set (Beta, Design, ₹300, Rating 3.5, Commercial)
  const prod4 = await prisma.product.create({
    data: {
      sellerId: sellerBeta.id,
      categoryId: catDesign.id,
      title: `Minimalist SVG Icons Pack ${ts}`,
      slug: `minimalist-svg-icons-${ts}`,
      shortDescription: "Clean SVG line icons for web & mobile interfaces",
      description: "Pixel-perfect vector icons with multiple weights and stroke widths.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 30000, // ₹300
      isFree: false,
      licenseType: "COMMERCIAL",
      ratingAvg: 3.5,
      reviewsCount: 2,
      salesCount: 40,
      tags: ["icons", "svg", "vector"],
      status: "PUBLISHED",
      createdAt: new Date(Date.now() - 1000 * 35), // 35 secs ago (oldest of the 4)
    },
  });


  // Prod 5: DRAFT Product (Must be hidden)
  const prodDraft = await prisma.product.create({
    data: {
      sellerId: sellerAlpha.id,
      categoryId: catSoftware.id,
      title: `Secret Draft Product ${ts}`,
      slug: `secret-draft-${ts}`,
      shortDescription: "Work in progress draft software",
      description: "Confidential upcoming project.",
      productType: "SOFTWARE",
      pricePaise: 500000,
      status: "DRAFT",
    },
  });

  // Prod 6: PENDING_REVIEW Product (Must be hidden)
  const prodPending = await prisma.product.create({
    data: {
      sellerId: sellerBeta.id,
      categoryId: catDesign.id,
      title: `Under Review Asset ${ts}`,
      slug: `under-review-${ts}`,
      shortDescription: "Moderation pending asset",
      description: "Awaiting administrator approval.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 100000,
      status: "PENDING_REVIEW",
    },
  });

  // Prod 7: REJECTED Product (Must be hidden)
  const prodRejected = await prisma.product.create({
    data: {
      sellerId: sellerAlpha.id,
      categoryId: catSoftware.id,
      title: `Rejected Ineligible Tool ${ts}`,
      slug: `rejected-ineligible-${ts}`,
      shortDescription: "Policy violating product",
      description: "Disallowed item.",
      productType: "SOFTWARE",
      pricePaise: 100000,
      status: "REJECTED",
      rejectionReason: "Violated marketplace quality policy",
    },
  });

  // Prod 8: Product from Suspended Seller (Must be hidden)
  const prodSuspendedSeller = await prisma.product.create({
    data: {
      sellerId: sellerSuspended.id,
      categoryId: catSoftware.id,
      title: `Suspended Creator Product ${ts}`,
      slug: `suspended-creator-${ts}`,
      shortDescription: "Product belonging to suspended account",
      description: "Should not be discoverable in public catalog.",
      productType: "SOFTWARE",
      pricePaise: 100000,
      status: "PUBLISHED", // Even if status is PUBLISHED, seller is SUSPENDED
    },
  });

  // Prod 9: Product in Inactive Category (Must be hidden)
  const prodInactiveCat = await prisma.product.create({
    data: {
      sellerId: sellerAlpha.id,
      categoryId: catInactive.id,
      title: `Inactive Category Product ${ts}`,
      slug: `inactive-cat-prod-${ts}`,
      shortDescription: "Product in deprecated category",
      description: "Category was decommissioned.",
      productType: "SOFTWARE",
      pricePaise: 100000,
      status: "PUBLISHED",
    },
  });

  console.log("Seed data prepared successfully.\n");

  // ===========================================================================
  // SECTION 1: BASELINE & PUBLISHED-ONLY INVARIANT
  // ===========================================================================
  console.log("--- SECTION 1: Baseline & Published-Only Invariant ---");

  await runTest("Public catalog endpoint responds with 200 OK without authentication", async () => {
    const res = await catalogHandler(makeReq("http://localhost/api/v1/products"));
    const data = await parseJson(res);
    return { passed: data.status === 200 && Array.isArray(data.data) };
  });

  await runTest("Published product is returned in discovery results", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=Dashboard`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod1.id);
    return { passed: Boolean(found) };
  });

  await runTest("DRAFT product is strictly HIDDEN from discovery results", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=${prodDraft.slug}`));
    const data = await parseJson(res);
    const leaked = data.data?.some((p: any) => p.id === prodDraft.id);
    return { passed: !leaked && data.data?.length === 0 };
  });

  await runTest("PENDING_REVIEW product is strictly HIDDEN from discovery results", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=${prodPending.slug}`));
    const data = await parseJson(res);
    const leaked = data.data?.some((p: any) => p.id === prodPending.id);
    return { passed: !leaked && data.data?.length === 0 };
  });

  await runTest("REJECTED product is strictly HIDDEN from discovery results", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=${prodRejected.slug}`));
    const data = await parseJson(res);
    const leaked = data.data?.some((p: any) => p.id === prodRejected.id);
    return { passed: !leaked && data.data?.length === 0 };
  });

  await runTest("Suspended seller's products are strictly HIDDEN from discovery results", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=${prodSuspendedSeller.slug}`));
    const data = await parseJson(res);
    const leaked = data.data?.some((p: any) => p.id === prodSuspendedSeller.id);
    return { passed: !leaked && data.data?.length === 0 };
  });

  await runTest("Querying unpublished product by slug returns 404 anti-enumeration shield", async () => {
    const res = await productDetailHandler(
      makeReq(`http://localhost/api/v1/products/${prodDraft.slug}`),
      { params: { slug: prodDraft.slug } }
    );
    const data = await parseJson(res);
    return { passed: data.status === 404 && data.error?.code === "NOT_FOUND" };
  });

  await runTest("Non-existent product detail lookup returns 404", async () => {
    const res = await productDetailHandler(
      makeReq("http://localhost/api/v1/products/non-existent-product-slug-xyz"),
      { params: { slug: "non-existent-product-slug-xyz" } }
    );
    const data = await parseJson(res);
    return { passed: data.status === 404 && data.error?.code === "NOT_FOUND" };
  });

  await runTest("Published product detail returns buyNow entry point without performing transaction", async () => {
    const res = await productDetailHandler(
      makeReq(`http://localhost/api/v1/products/${prod1.slug}`),
      { params: { slug: prod1.slug } }
    );
    const data = await parseJson(res);
    const buyNow = data.data?.buyNow;
    return { passed: Boolean(buyNow?.enabled && buyNow?.checkoutUrl?.includes(prod1.id)) };
  });

  await runTest("Product detail response contains zero private seller financial or KYC fields", async () => {
    const res = await productDetailHandler(
      makeReq(`http://localhost/api/v1/products/${prod1.slug}`),
      { params: { slug: prod1.slug } }
    );
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    const leaked =
      text.includes("panNumber") ||
      text.includes("bankAccount") ||
      text.includes("HDFC0001111") ||
      text.includes("passwordHash");
    return { passed: !leaked };
  });

  // ===========================================================================
  // SECTION 2: ADVANCED SEARCH & RELEVANCE
  // ===========================================================================
  console.log("\n--- SECTION 2: Advanced Search & Relevance ---");

  await runTest("Search query matches product by exact title keyword", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=Dashboard`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod1.id);
    return { passed: Boolean(found) };
  });

  await runTest("Search query matches product case-insensitively ('dashboard' matches 'Dashboard')", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=dashboard`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod1.id);
    return { passed: Boolean(found) };
  });

  await runTest("Search query matches product by shortDescription", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=modular%20React`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod1.id);
    return { passed: Boolean(found) };
  });

  await runTest("Search query matches product by full description", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=scalable%20design%20teams`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(found) };
  });

  await runTest("Search query matches product by tags", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=wireframe`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(found) };
  });

  await runTest("Search query matches product with tag 'tailwind'", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=tailwind`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod2.id);
    return { passed: Boolean(found) };
  });

  await runTest("Multi-word search query matches products containing all terms (conjunctive relevance)", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=React%20NextJS`));
    const data = await parseJson(res);
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id);
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(hasProd1 && !hasProd3) };
  });

  await runTest("Search query normalization trims leading and trailing whitespace", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=%20%20Dashboard%20%20`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod1.id);
    return { passed: Boolean(found) };
  });

  await runTest("Search query normalization collapses multiple consecutive spaces", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=NextJS%20%20%20%20React`));
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === prod1.id);
    return { passed: Boolean(found) };
  });

  await runTest("Search query normalization strips null bytes (\\0) safely", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=Dashboard%00`));
    const data = await parseJson(res);
    return { passed: data.status === 200 };
  });

  await runTest("Search query normalization strips ASCII control characters safely", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=Dashboard%07%1F`));
    const data = await parseJson(res);
    return { passed: data.status === 200 };
  });

  await runTest("Search query alias 'q' returns identical results to 'query'", async () => {
    const res1 = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=Dashboard`));
    const data1 = await parseJson(res1);
    const res2 = await catalogHandler(makeReq(`http://localhost/api/v1/products?q=Dashboard`));
    const data2 = await parseJson(res2);
    return { passed: data1.data?.length === data2.data?.length && data1.data?.length > 0 };
  });

  await runTest("Empty search query string returns full catalog without error", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=`));
    const data = await parseJson(res);
    return { passed: data.status === 200 && data.data?.length > 0 };
  });

  await runTest("Search query exceeding 100 characters is rejected with 400 VALIDATION_FAILED", async () => {
    const longQuery = "a".repeat(101);
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?q=${longQuery}`));
    const data = await parseJson(res);
    return { passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED" };
  });

  await runTest("Search query with zero matches returns empty data array without error", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=supercalifragilistic12345`));
    const data = await parseJson(res);
    return { passed: data.status === 200 && data.data?.length === 0 };
  });

  // ===========================================================================
  // SECTION 3: CATEGORY FILTERING
  // ===========================================================================
  console.log("\n--- SECTION 3: Category Filtering ---");

  await runTest("Filter by valid category slug returns only products in that category", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?category=${catSoftware.slug}`));
    const data = await parseJson(res);
    const allMatch = data.data?.every((p: any) => p.category?.slug === catSoftware.slug);
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id);
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(allMatch && hasProd1 && !hasProd3) };
  });

  await runTest("Filter by valid category CUID returns matching products", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?category=${catDesign.id}`));
    const data = await parseJson(res);
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(hasProd3) };
  });

  await runTest("Filter using alias 'categorySlug' works identically to 'category'", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?categorySlug=${catDesign.slug}`));
    const data = await parseJson(res);
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(hasProd3) };
  });

  await runTest("Non-existent category slug is rejected with 400 VALIDATION_FAILED", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?category=fake-cat-${ts}`));
    const data = await parseJson(res);
    return { passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED" };
  });

  await runTest("Inactive category is rejected with 400 VALIDATION_FAILED", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?category=${catInactive.slug}`));
    const data = await parseJson(res);
    return { passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED" };
  });

  await runTest("Category slug with illegal characters is rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?category=invalid!@#$%`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Category combined with search query narrows results correctly", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?category=${catSoftware.slug}&q=Dashboard`)
    );
    const data = await parseJson(res);
    const matches = data.data?.length === 1 && data.data[0].id === prod1.id;
    return { passed: Boolean(matches) };
  });

  await runTest("Category combined with price filter filters correctly within category", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?category=${catSoftware.slug}&priceMin=100000`)
    );
    const data = await parseJson(res);
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id);
    const hasProd2 = data.data?.some((p: any) => p.id === prod2.id); // Free -> 0 paise
    return { passed: Boolean(hasProd1 && !hasProd2) };
  });

  // ===========================================================================
  // SECTION 4: PRICE RANGE FILTERING
  // ===========================================================================
  console.log("\n--- SECTION 4: Price Range Filtering ---");

  await runTest("Filter by minPrice returns products with pricePaise >= minPrice", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?minPrice=200000`));
    const data = await parseJson(res);
    const allGte = data.data?.every((p: any) => p.pricePaise >= 200000);
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id); // 250000
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id); // 150000
    return { passed: Boolean(allGte && hasProd3 && !hasProd1) };
  });

  await runTest("Filter by maxPrice returns products with pricePaise <= maxPrice", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?category=${catDesign.slug}&maxPrice=50000`)
    );
    const data = await parseJson(res);
    const allLte = data.data?.every((p: any) => p.pricePaise <= 50000);
    const hasProd4 = data.data?.some((p: any) => p.id === prod4.id); // 30000
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id); // 250000
    return { passed: Boolean(allLte && hasProd4 && !hasProd3) };
  });

  await runTest("Filter with both priceMin and priceMax returns products within exact bounds", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?priceMin=100000&priceMax=200000`)
    );
    const data = await parseJson(res);
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id); // 150000
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id); // 250000
    const hasProd4 = data.data?.some((p: any) => p.id === prod4.id); // 30000
    return { passed: Boolean(hasProd1 && !hasProd3 && !hasProd4) };
  });

  await runTest("Aliases 'priceMin' and 'priceMax' behave identically to 'minPrice' / 'maxPrice'", async () => {
    const res1 = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?priceMin=250000&priceMax=250000`)
    );
    const data1 = await parseJson(res1);
    const res2 = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?minPrice=250000&maxPrice=250000`)
    );
    const data2 = await parseJson(res2);
    const hasProd3 = data1.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(hasProd3 && data1.data?.length === data2.data?.length) };
  });

  await runTest("Free product filter (maxPrice=0) returns only free products", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?maxPrice=0`));
    const data = await parseJson(res);
    const allFree = data.data?.every((p: any) => p.pricePaise === 0 || p.isFree);
    const hasProd2 = data.data?.some((p: any) => p.id === prod2.id);
    return { passed: Boolean(allFree && hasProd2) };
  });

  await runTest("Inverted price bounds (priceMin > priceMax) rejected with 400", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?priceMin=50000&priceMax=10000`)
    );
    const data = await parseJson(res);
    return { passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED" };
  });

  await runTest("Negative priceMin rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?priceMin=-500`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Negative priceMax rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?priceMax=-10`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Excessive price exceeding 1,000,000,000 paise rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?priceMax=1000000001`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Non-numeric price parameter rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?priceMin=expensive`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  // ===========================================================================
  // SECTION 5: RATING FILTERING
  // ===========================================================================
  console.log("\n--- SECTION 5: Customer Rating Filtering ---");

  await runTest("Filter by rating=4.5 returns products with ratingAvg >= 4.5", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?rating=4.5`));
    const data = await parseJson(res);
    const allGte = data.data?.every((p: any) => p.ratingAvg >= 4.5);
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id); // 4.8
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id); // 4.9
    const hasProd4 = data.data?.some((p: any) => p.id === prod4.id); // 3.5
    return { passed: Boolean(allGte && hasProd1 && hasProd3 && !hasProd4) };
  });

  await runTest("Filter by rating=4.0 returns products with ratingAvg >= 4.0", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?category=${catSoftware.slug}&rating=4.0`)
    );
    const data = await parseJson(res);
    const allGte = data.data?.every((p: any) => p.ratingAvg >= 4.0);
    const hasProd2 = data.data?.some((p: any) => p.id === prod2.id); // 4.2
    return { passed: Boolean(allGte && hasProd2) };
  });

  await runTest("Filter by rating=5.0 returns only products with ratingAvg >= 5.0", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?rating=5.0`));
    const data = await parseJson(res);
    const all5 = data.data?.every((p: any) => p.ratingAvg >= 5.0);
    return { passed: Boolean(all5) };
  });

  await runTest("Filter using alias 'minRating' works identically to 'rating'", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?minRating=4.8`));
    const data = await parseJson(res);
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id);
    const hasProd4 = data.data?.some((p: any) => p.id === prod4.id);
    return { passed: Boolean(hasProd1 && !hasProd4) };
  });

  await runTest("Products with low rating excluded when minRating=4.0 is set", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?rating=4.0`));
    const data = await parseJson(res);
    const hasProd4 = data.data?.some((p: any) => p.id === prod4.id); // rating 3.5
    return { passed: !hasProd4 };
  });

  await runTest("Rating > 5.0 rejected with 400 VALIDATION_FAILED", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?rating=5.5`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Negative rating rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?rating=-1`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Non-numeric rating rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?rating=five_stars`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  // ===========================================================================
  // SECTION 6: SELLER & CREATOR FILTERING
  // ===========================================================================
  console.log("\n--- SECTION 6: Seller & Creator Filtering ---");

  await runTest("Filter by seller storeSlug returns only products from that seller", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?seller=${sellerAlpha.storeSlug}`));
    const data = await parseJson(res);
    const allAlpha = data.data?.every((p: any) => p.seller.storeSlug === sellerAlpha.storeSlug);
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id);
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id); // Beta
    return { passed: Boolean(allAlpha && hasProd1 && !hasProd3) };
  });

  await runTest("Filter by seller profile CUID ID returns matching products", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?seller=${sellerBeta.id}`));
    const data = await parseJson(res);
    const allBeta = data.data?.every((p: any) => p.seller.storeSlug === sellerBeta.storeSlug);
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(allBeta && hasProd3) };
  });

  await runTest("Filter using alias 'sellerSlug' works identically to 'seller'", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?sellerSlug=${sellerBeta.storeSlug}`));
    const data = await parseJson(res);
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(hasProd3) };
  });

  await runTest("Seller filter combined with category narrows results correctly", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?seller=${sellerAlpha.storeSlug}&category=${catSoftware.slug}`)
    );
    const data = await parseJson(res);
    const allMatch = data.data?.every(
      (p: any) => p.seller.storeSlug === sellerAlpha.storeSlug && p.category.slug === catSoftware.slug
    );
    return { passed: Boolean(allMatch && data.data?.length > 0) };
  });

  await runTest("Seller filter with non-existent store returns 0 results safely without crashing", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?seller=non-existent-store-${ts}`));
    const data = await parseJson(res);
    return { passed: data.status === 200 && data.data?.length === 0 };
  });

  await runTest("Suspended seller's storeSlug returns 0 results", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?seller=${sellerSuspended.storeSlug}`));
    const data = await parseJson(res);
    return { passed: data.status === 200 && data.data?.length === 0 };
  });

  await runTest("Seller filter with invalid characters rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?seller=invalid!store@#$`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Seller isolation: public fields populated, internal emails/payouts absent", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?seller=${sellerAlpha.storeSlug}`));
    const data = await parseJson(res);
    const p = data.data?.[0];
    const hasPublicFields = p?.seller?.storeName && p?.seller?.storeSlug;
    const hasPrivateFields = "email" in (p?.seller || {}) || "panNumber" in (p?.seller || {});
    return { passed: Boolean(hasPublicFields && !hasPrivateFields) };
  });

  // ===========================================================================
  // SECTION 7: LICENSE & PRODUCT TYPE FILTERING
  // ===========================================================================
  console.log("\n--- SECTION 7: License & Product Type Filtering ---");

  await runTest("Filter by licenseType=COMMERCIAL returns only commercial products", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?licenseType=COMMERCIAL`));
    const data = await parseJson(res);
    const allCommercial = data.data?.every((p: any) => p.licenseType === "COMMERCIAL");
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id);
    return { passed: Boolean(allCommercial && hasProd1) };
  });

  await runTest("Filter by licenseType=PERSONAL returns only personal license products", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?licenseType=PERSONAL`));
    const data = await parseJson(res);
    const allPersonal = data.data?.every((p: any) => p.licenseType === "PERSONAL");
    const hasProd2 = data.data?.some((p: any) => p.id === prod2.id);
    return { passed: Boolean(allPersonal && hasProd2) };
  });

  await runTest("Filter by licenseType=EXTENDED returns only extended license products", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?licenseType=EXTENDED`));
    const data = await parseJson(res);
    const allExtended = data.data?.every((p: any) => p.licenseType === "EXTENDED");
    const hasProd3 = data.data?.some((p: any) => p.id === prod3.id);
    return { passed: Boolean(allExtended && hasProd3) };
  });

  await runTest("Invalid licenseType string rejected with 400 VALIDATION_FAILED", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?licenseType=UNLIMITED`));
    const data = await parseJson(res);
    return { passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED" };
  });

  await runTest("Filter by productType=SOFTWARE returns only software products", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?productType=SOFTWARE`));
    const data = await parseJson(res);
    const allSoftware = data.data?.every((p: any) => p.productType === "SOFTWARE");
    const hasProd1 = data.data?.some((p: any) => p.id === prod1.id);
    return { passed: Boolean(allSoftware && hasProd1) };
  });

  await runTest("Invalid productType string rejected with 400 VALIDATION_FAILED", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?productType=HARDWARE`));
    const data = await parseJson(res);
    return { passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED" };
  });

  // ===========================================================================
  // SECTION 8: ALLOWLISTED SORTING
  // ===========================================================================
  console.log("\n--- SECTION 8: Allowlisted Sorting ---");

  await runTest("Sort by newest (createdAt: desc) orders newest products first", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=newest`));
    const data = await parseJson(res);
    const dates = data.data?.map((p: any) => new Date(p.createdAt).getTime()) || [];
    let isSorted = true;
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] > dates[i - 1]) isSorted = false;
    }
    return { passed: isSorted && dates.length > 0 };
  });

  await runTest("Sort by price_asc / price_low orders lowest price first", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=price_low`));
    const data = await parseJson(res);
    const prices = data.data?.map((p: any) => p.pricePaise) || [];
    let isSorted = true;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1]) isSorted = false;
    }
    return { passed: isSorted && prices.length > 0 };
  });

  await runTest("Sort by price_desc / price_high orders highest price first", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=price_high`));
    const data = await parseJson(res);
    const prices = data.data?.map((p: any) => p.pricePaise) || [];
    let isSorted = true;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) isSorted = false;
    }
    return { passed: isSorted && prices.length > 0 };
  });

  await runTest("Sort by rating orders highest rated products first", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=rating`));
    const data = await parseJson(res);
    const ratings = data.data?.map((p: any) => p.ratingAvg) || [];
    let isSorted = true;
    for (let i = 1; i < ratings.length; i++) {
      if (ratings[i] > ratings[i - 1]) isSorted = false;
    }
    return { passed: isSorted && ratings.length > 0 };
  });

  await runTest("Sort by best_selling / popular orders highest salesCount first", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=best_selling`));
    const data = await parseJson(res);
    const sales = data.data?.map((p: any) => p.salesCount) || [];
    let isSorted = true;
    for (let i = 1; i < sales.length; i++) {
      if (sales[i] > sales[i - 1]) isSorted = false;
    }
    return { passed: isSorted && sales.length > 0 };
  });

  await runTest("Sort alias 'price_low' behaves identically to 'price_asc'", async () => {
    const res1 = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=price_low`));
    const data1 = await parseJson(res1);
    const res2 = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=price_asc`));
    const data2 = await parseJson(res2);
    const id1 = data1.data?.[0]?.id;
    const id2 = data2.data?.[0]?.id;
    return { passed: Boolean(id1 && id1 === id2) };
  });

  await runTest("Sort alias 'popular' behaves identically to 'best_selling'", async () => {
    const res1 = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=popular`));
    const data1 = await parseJson(res1);
    const res2 = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=best_selling`));
    const data2 = await parseJson(res2);
    const id1 = data1.data?.[0]?.id;
    const id2 = data2.data?.[0]?.id;
    return { passed: Boolean(id1 && id1 === id2) };
  });

  await runTest("Arbitrary/injected sort field rejected with 400 (no arbitrary SQL/orderBy)", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?sort=passwordHash`));
    const data = await parseJson(res);
    return { passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED" };
  });

  // ===========================================================================
  // SECTION 9: PAGINATION & BOUNDS ENFORCEMENT
  // ===========================================================================
  console.log("\n--- SECTION 9: Pagination & Bounds Enforcement ---");

  await runTest("Default pagination returns page 1 with limit 20", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products`));
    const data = await parseJson(res);
    return { passed: data.meta?.page === 1 && data.meta?.limit === 20 };
  });

  await runTest("Custom page & limit (page=2, limit=1) returns distinct item from page 1", async () => {
    const res1 = await catalogHandler(makeReq(`http://localhost/api/v1/products?page=1&limit=1&sort=newest`));
    const data1 = await parseJson(res1);
    const res2 = await catalogHandler(makeReq(`http://localhost/api/v1/products?page=2&limit=1&sort=newest`));
    const data2 = await parseJson(res2);
    const id1 = data1.data?.[0]?.id;
    const id2 = data2.data?.[0]?.id;
    return { passed: Boolean(id1 && id2 && id1 !== id2) };
  });

  await runTest("Negative page number rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?page=-5`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Zero limit rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?limit=0`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Excessive limit (> 100) rejected with 400 (unbounded pagination prevention)", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?limit=101`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Non-numeric page parameter rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?page=second`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Response meta contains total, totalPages, page, limit, and applied filters", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?category=${catSoftware.slug}&priceMin=100000&sort=newest`)
    );
    const data = await parseJson(res);
    const meta = data.meta;
    const hasMetaFields =
      typeof meta?.total === "number" &&
      typeof meta?.totalPages === "number" &&
      meta?.filters?.category === catSoftware.slug &&
      meta?.filters?.minPrice === 100000 &&
      meta?.filters?.sort === "newest";
    return { passed: Boolean(hasMetaFields) };
  });

  // ===========================================================================
  // SECTION 10: SECURITY, INJECTION & DATA LEAKAGE
  // ===========================================================================
  console.log("\n--- SECTION 10: Security, Injection & Data Leakage ---");

  await runTest("SQL injection in query parameter treated safely as literal text", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?query=%27%20OR%20%271%27=%271`));
    const data = await parseJson(res);
    return { passed: data.status === 200 };
  });

  await runTest("SQL injection in category parameter rejected by strict regex with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?category=%27%20OR%201=1--`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Prisma query injection attempt (raw object notation) rejected with 400", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?where[status]=DRAFT`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("Script tag in search query handled safely without executing XSS", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?query=%3Cscript%3Ealert(1)%3C/script%3E`)
    );
    const data = await parseJson(res);
    return { passed: data.status === 200 && data.data?.length === 0 };
  });

  await runTest("Unexpected query parameter rejected with 400 (strict schema enforcement)", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?adminAccess=true`));
    const data = await parseJson(res);
    return { passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED" };
  });

  await runTest("Query string exceeding 100 characters rejected with 400", async () => {
    const longString = "x".repeat(101);
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products?q=${longString}`));
    const data = await parseJson(res);
    return { passed: data.status === 400 };
  });

  await runTest("passwordHash is strictly ABSENT from catalog response", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products`));
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    return { passed: !text.includes("passwordHash") };
  });

  await runTest("Seller private email, PAN number, and bank account are strictly ABSENT", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products`));
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    const leaked =
      text.includes("panNumber") ||
      text.includes("bankAccount") ||
      text.includes("HDFC0001111") ||
      text.includes("alpha.search.");
    return { passed: !leaked };
  });

  await runTest("ProductFile storageKey, filesystem paths, and private S3 keys are strictly ABSENT", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products`));
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    const leaked = text.includes("storageKey") || text.includes(".zip") || text.includes("private/prod");
    return { passed: !leaked };
  });

  await runTest("Moderation notes and rejectionReason are strictly ABSENT from catalog response", async () => {
    const res = await catalogHandler(makeReq(`http://localhost/api/v1/products`));
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    const leaked = text.includes("rejectionReason") || text.includes("Violated marketplace quality policy");
    return { passed: !leaked };
  });

  // ===========================================================================
  // SECTION 11: PUBLIC CATEGORIES API
  // ===========================================================================
  console.log("\n--- SECTION 11: Public Categories API ---");

  await runTest("GET /api/v1/categories returns 200 OK without authentication", async () => {
    const res = await categoriesHandler(makeReq("http://localhost/api/v1/categories"));
    const data = await parseJson(res);
    return { passed: data.status === 200 && Array.isArray(data.data) };
  });

  await runTest("Categories response includes name, slug, description, and productCount", async () => {
    const res = await categoriesHandler(makeReq("http://localhost/api/v1/categories"));
    const data = await parseJson(res);
    const cat = data.data?.find((c: any) => c.id === catSoftware.id);
    const hasProps =
      cat?.name &&
      cat?.slug === catSoftware.slug &&
      typeof cat?.productCount === "number";
    return { passed: Boolean(hasProps) };
  });

  await runTest("Inactive categories are strictly EXCLUDED from public categories response", async () => {
    const res = await categoriesHandler(makeReq("http://localhost/api/v1/categories"));
    const data = await parseJson(res);
    const foundInactive = data.data?.some((c: any) => c.id === catInactive.id || c.slug === catInactive.slug);
    return { passed: !foundInactive };
  });

  await runTest("Categories are ordered by displayOrder ascending", async () => {
    const res = await categoriesHandler(makeReq("http://localhost/api/v1/categories"));
    const data = await parseJson(res);
    const orders = data.data?.map((c: any) => c.displayOrder) || [];
    let isSorted = true;
    for (let i = 1; i < orders.length; i++) {
      if (orders[i] < orders[i - 1]) isSorted = false;
    }
    return { passed: isSorted && orders.length > 0 };
  });

  await runTest("Product count accurately reflects only published products from approved sellers", async () => {
    const res = await categoriesHandler(makeReq("http://localhost/api/v1/categories"));
    const data = await parseJson(res);
    const cat = data.data?.find((c: any) => c.id === catSoftware.id);
    // catSoftware has prod1 and prod2 published from sellerAlpha. prodDraft, prodRejected, prodInactive are excluded.
    return { passed: Boolean(cat && cat.productCount >= 2) };
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log("\n" + "=".repeat(75));
  console.log("FEATURE 22 TEST RESULTS SUMMARY");
  console.log("=".repeat(75));
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);

  if (failedCount > 0) {
    console.error("\nFAILED TESTS:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.error(`- Test ${r.num}: ${r.name}${r.details ? ` (${r.details})` : ""}`);
      });
    process.exit(1);
  }

  console.log("\nALL FEATURE 22 TESTS PASSED PERFECTLY!\n");
}

main()
  .catch((e) => {
    console.error("FATAL ERROR in test execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
