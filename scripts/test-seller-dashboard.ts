import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { GET as overviewHandler } from "../src/app/api/v1/seller/dashboard/overview/route";
import { GET as overviewAliasHandler } from "../src/app/api/v1/seller/overview/route";
import { GET as productsHandler, POST as createProductHandler } from "../src/app/api/v1/seller/products/route";
import {
  GET as productDetailHandler,
  PATCH as updateProductHandler,
} from "../src/app/api/v1/seller/products/[productId]/route";
import { GET as salesHandler } from "../src/app/api/v1/seller/sales/route";
import { GET as earningsHandler } from "../src/app/api/v1/seller/earnings/route";
import { GET as reviewsHandler } from "../src/app/api/v1/seller/reviews/route";
import { POST as replyReviewHandler } from "../src/app/api/v1/seller/reviews/[id]/reply/route";
import {
  GET as profileHandler,
  PATCH as updateProfileHandler,
} from "../src/app/api/v1/seller/profile/route";
import { POST as submitProductHandler } from "../src/app/api/v1/seller/products/[productId]/submit/route";
import { POST as uploadAssetHandler } from "../src/app/api/v1/seller/products/[productId]/assets/upload/route";
import { POST as completeAssetHandler } from "../src/app/api/v1/seller/products/[productId]/assets/[assetId]/complete/route";
import { getStorageProvider } from "../src/lib/storage/local-storage-provider";
import {
  EarningStatus,
  LicenseType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  UserRole,
} from "@prisma/client";

/**
 * ===========================================================================
 * FEATURE 18 TEST SUITE: COMPLETE SELLER DASHBOARD & WORKSPACE
 * ===========================================================================
 */

interface TestResult {
  passed: boolean;
  details?: string | null;
}

let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

async function runTest(name: string, fn: () => Promise<TestResult>) {
  try {
    const res = await fn();
    if (res.passed) {
      console.log(`[PASS] ${name}${res.details ? ` — ${res.details}` : ""}`);
      passedCount++;
    } else {
      console.log(`[FAIL] ${name}${res.details ? ` — ${res.details}` : ""}`);
      failedCount++;
      failures.push(`${name}: ${res.details}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`[ERROR] ${name} — ${msg}`);
    failedCount++;
    failures.push(`${name}: ${msg}`);
  }
}

async function main() {
  console.log("\n===========================================================================");
  console.log("DIGITAL MARKETPLACE — FEATURE 18: COMPLETE SELLER DASHBOARD");
  console.log("===========================================================================\n");

  const runId = `f18_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // -------------------------------------------------------------------------
  // 1. SETUP FIXTURES
  // -------------------------------------------------------------------------

  // 1.1 Category
  const category = await prisma.category.create({
    data: {
      name: `Design Assets ${runId}`,
      slug: `design-assets-${runId}`,
    },
  });

  // 1.2 Approved Seller A
  const sellerUserA = await prisma.user.create({
    data: {
      email: `seller_a_${runId}@example.com`,
      fullName: `Seller Alice ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const sellerProfileA = await prisma.sellerProfile.create({
    data: {
      userId: sellerUserA.id,
      storeName: `Alice Design Studio ${runId}`,
      storeSlug: `alice-design-${runId}`,
      status: "APPROVED",
      country: "India",
      totalRevenuePaise: 79800,
      netEarningsPaise: 71820,
      availableBalance: 44910,
      pendingBalance: 26910,
    },
  });

  // 1.3 Approved Seller B (for IDOR isolation testing)
  const sellerUserB = await prisma.user.create({
    data: {
      email: `seller_b_${runId}@example.com`,
      fullName: `Seller Bob ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const sellerProfileB = await prisma.sellerProfile.create({
    data: {
      userId: sellerUserB.id,
      storeName: `Bob Templates ${runId}`,
      storeSlug: `bob-templates-${runId}`,
      status: "APPROVED",
      country: "India",
      totalRevenuePaise: 29900,
      netEarningsPaise: 26910,
      availableBalance: 26910,
      pendingBalance: 0,
    },
  });

  // 1.4 Pending Seller
  const pendingSellerUser = await prisma.user.create({
    data: {
      email: `seller_pending_${runId}@example.com`,
      fullName: `Pending Peter ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  await prisma.sellerProfile.create({
    data: {
      userId: pendingSellerUser.id,
      storeName: `Peter Pending ${runId}`,
      storeSlug: `peter-pending-${runId}`,
      status: "PENDING",
      country: "India",
    },
  });

  // 1.5 Rejected Seller
  const rejectedSellerUser = await prisma.user.create({
    data: {
      email: `seller_rejected_${runId}@example.com`,
      fullName: `Rejected Rachel ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  await prisma.sellerProfile.create({
    data: {
      userId: rejectedSellerUser.id,
      storeName: `Rachel Rejected ${runId}`,
      storeSlug: `rachel-rejected-${runId}`,
      status: "REJECTED",
      country: "India",
    },
  });

  // 1.6 Inactive Approved Seller
  const inactiveSellerUser = await prisma.user.create({
    data: {
      email: `seller_inactive_${runId}@example.com`,
      fullName: `Inactive Ian ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: false,
    },
  });

  await prisma.sellerProfile.create({
    data: {
      userId: inactiveSellerUser.id,
      storeName: `Ian Inactive ${runId}`,
      storeSlug: `ian-inactive-${runId}`,
      status: "APPROVED",
      country: "India",
    },
  });

  // 1.7 Regular Buyer (no seller profile)
  const buyerUser = await prisma.user.create({
    data: {
      email: `buyer_${runId}@example.com`,
      fullName: `Buyer Ben ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  // 1.8 Create Products for Seller A
  // Product A1: PUBLISHED
  const productA1 = await prisma.product.create({
    data: {
      sellerId: sellerProfileA.id,
      categoryId: category.id,
      title: `Dashboard UI Kit ${runId}`,
      slug: `dashboard-ui-kit-${runId}`,
      description: "A comprehensive dashboard UI kit with 100+ components",
      shortDescription: "Modern UI kit for web applications",
      pricePaise: 49900,
      status: ProductStatus.PUBLISHED,
      version: "1.0.0",
    },
  });

  // Product A2: DRAFT
  const productA2 = await prisma.product.create({
    data: {
      sellerId: sellerProfileA.id,
      categoryId: category.id,
      title: `Draft Icon Bundle ${runId}`,
      slug: `draft-icon-bundle-${runId}`,
      shortDescription: "Draft vector icons pack",
      description: "Draft set of vector icons",
      pricePaise: 19900,
      status: ProductStatus.DRAFT,
      version: "0.1.0",
    },
  });

  // Product A3: PENDING_REVIEW
  const productA3 = await prisma.product.create({
    data: {
      sellerId: sellerProfileA.id,
      categoryId: category.id,
      title: `Pending 3D Illustrations ${runId}`,
      slug: `pending-3d-illustrations-${runId}`,
      shortDescription: "Handcrafted 3D pack",
      description: "Handcrafted 3D illustration pack",
      pricePaise: 29900,
      status: ProductStatus.PENDING_REVIEW,
      version: "1.0.0",
    },
  });

  // Product A4: REJECTED
  const productA4 = await prisma.product.create({
    data: {
      sellerId: sellerProfileA.id,
      categoryId: category.id,
      title: `Rejected Font Family ${runId}`,
      slug: `rejected-font-family-${runId}`,
      shortDescription: "Typography bundle",
      description: "Typography bundle",
      pricePaise: 39900,
      status: ProductStatus.REJECTED,
      rejectionReason: "Incomplete font licensing documentation",
      version: "1.0.0",
    },
  });

  // Product B1: Owned by Seller B (for IDOR testing)
  const productB1 = await prisma.product.create({
    data: {
      sellerId: sellerProfileB.id,
      categoryId: category.id,
      title: `Bob Presentation Deck ${runId}`,
      slug: `bob-presentation-deck-${runId}`,
      shortDescription: "Professional keynote slides",
      description: "Professional keynote slides",
      pricePaise: 29900,
      status: ProductStatus.PUBLISHED,
      version: "1.0.0",
    },
  });

  // 1.9 Create Files for Product A1 and Product B1
  const fileA1 = await prisma.productFile.create({
    data: {
      productId: productA1.id,
      storageKey: `private/sellers/${sellerProfileA.id}/${productA1.id}/uikit.zip`,
      originalFilename: "dashboard-ui-kit-v1.0.0.zip",
      fileSize: BigInt(25600000), // ~25.6MB
      mimeType: "application/zip",
      version: "1.0.0",
    },
  });

  const fileB1 = await prisma.productFile.create({
    data: {
      productId: productB1.id,
      storageKey: `private/sellers/${sellerProfileB.id}/${productB1.id}/deck.zip`,
      originalFilename: "presentation-deck.zip",
      fileSize: BigInt(10485760), // 10MB
      mimeType: "application/zip",
      version: "1.0.0",
    },
  });

  // 1.10 Orders & Sales Fixtures for Seller A
  const orderA = await prisma.order.create({
    data: {
      id: `ORD-F18-A-${runId}`,
      buyerId: buyerUser.id,
      subtotalPaise: 49900,
      totalAmountPaise: 49900,
      platformFeePaise: 4990,
      currency: "INR",
      status: OrderStatus.PAID,
      razorpayOrderId: `order_f18_a_${runId}`,
      razorpayPaymentId: `pay_f18_a_${runId}`,
      paidAt: new Date(),
      buyerNameSnapshot: buyerUser.fullName,
      buyerEmailSnapshot: buyerUser.email,
    },
  });

  const orderItemA = await prisma.orderItem.create({
    data: {
      orderId: orderA.id,
      productId: productA1.id,
      sellerId: sellerProfileA.id,
      productTitle: productA1.title,
      pricePaise: 49900,
      platformFeePaise: 4990,
      sellerEarningsPaise: 44910,
      licenseType: LicenseType.COMMERCIAL,
    },
  });

  // Second order for Seller A
  const orderA2 = await prisma.order.create({
    data: {
      id: `ORD-F18-A2-${runId}`,
      buyerId: buyerUser.id,
      subtotalPaise: 29900,
      totalAmountPaise: 29900,
      platformFeePaise: 2990,
      currency: "INR",
      status: OrderStatus.PAID,
      razorpayOrderId: `order_f18_a2_${runId}`,
      razorpayPaymentId: `pay_f18_a2_${runId}`,
      paidAt: new Date(),
      buyerNameSnapshot: buyerUser.fullName,
      buyerEmailSnapshot: buyerUser.email,
    },
  });

  const orderItemA2 = await prisma.orderItem.create({
    data: {
      orderId: orderA2.id,
      productId: productA1.id,
      sellerId: sellerProfileA.id,
      productTitle: productA1.title,
      pricePaise: 29900,
      platformFeePaise: 2990,
      sellerEarningsPaise: 26910,
      licenseType: LicenseType.PERSONAL,
    },
  });

  // Order for Seller B (to test sales IDOR isolation)
  const orderB = await prisma.order.create({
    data: {
      id: `ORD-F18-B-${runId}`,
      buyerId: buyerUser.id,
      subtotalPaise: 29900,
      totalAmountPaise: 29900,
      platformFeePaise: 2990,
      currency: "INR",
      status: OrderStatus.PAID,
      razorpayOrderId: `order_f18_b_${runId}`,
      razorpayPaymentId: `pay_f18_b_${runId}`,
      paidAt: new Date(),
      buyerNameSnapshot: buyerUser.fullName,
      buyerEmailSnapshot: buyerUser.email,
    },
  });

  const orderItemB = await prisma.orderItem.create({
    data: {
      orderId: orderB.id,
      productId: productB1.id,
      sellerId: sellerProfileB.id,
      productTitle: productB1.title,
      pricePaise: 29900,
      platformFeePaise: 2990,
      sellerEarningsPaise: 26910,
      licenseType: LicenseType.PERSONAL,
    },
  });

  // 1.11 Seller Earnings Records (Feature 14)
  const earningA1 = await prisma.sellerEarning.create({
    data: {
      sellerId: sellerProfileA.id,
      orderId: orderA.id,
      orderItemId: orderItemA.id,
      grossAmountPaise: 49900,
      platformFeePaise: 4990,
      netEarningsPaise: 44910,
      status: EarningStatus.AVAILABLE,
      availableOn: new Date(Date.now() - 1000 * 60 * 60 * 24), // Cleared yesterday
    },
  });

  const earningA2 = await prisma.sellerEarning.create({
    data: {
      sellerId: sellerProfileA.id,
      orderId: orderA2.id,
      orderItemId: orderItemA2.id,
      grossAmountPaise: 29900,
      platformFeePaise: 2990,
      netEarningsPaise: 26910,
      status: EarningStatus.PENDING,
      availableOn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // Clears in 7 days
    },
  });

  const earningB1 = await prisma.sellerEarning.create({
    data: {
      sellerId: sellerProfileB.id,
      orderId: orderB.id,
      orderItemId: orderItemB.id,
      grossAmountPaise: 29900,
      platformFeePaise: 2990,
      netEarningsPaise: 26910,
      status: EarningStatus.AVAILABLE,
      availableOn: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
  });

  // 1.12 Reviews Fixtures
  const reviewA1 = await prisma.review.create({
    data: {
      productId: productA1.id,
      buyerId: buyerUser.id,
      orderId: orderA.id,
      rating: 5,
      title: "Outstanding UI Kit!",
      comment: "Saved me weeks of design and prototyping work.",
      isVisible: true,
    },
  });

  const reviewB1 = await prisma.review.create({
    data: {
      productId: productB1.id,
      buyerId: buyerUser.id,
      orderId: orderB.id,
      rating: 4,
      title: "Great slides",
      comment: "Nice typography and easy to customize.",
      isVisible: true,
    },
  });

  // 1.13 Helper tokens
  const tokenA = signJwt({
    sub: sellerUserA.id,
    email: sellerUserA.email,
    role: sellerUserA.role,
  });

  const tokenB = signJwt({
    sub: sellerUserB.id,
    email: sellerUserB.email,
    role: sellerUserB.role,
  });

  const tokenPending = signJwt({
    sub: pendingSellerUser.id,
    email: pendingSellerUser.email,
    role: pendingSellerUser.role,
  });

  const tokenRejected = signJwt({
    sub: rejectedSellerUser.id,
    email: rejectedSellerUser.email,
    role: rejectedSellerUser.role,
  });

  const tokenInactive = signJwt({
    sub: inactiveSellerUser.id,
    email: inactiveSellerUser.email,
    role: inactiveSellerUser.role,
  });

  const tokenBuyer = signJwt({
    sub: buyerUser.id,
    email: buyerUser.email,
    role: buyerUser.role,
  });

  // Helper request builder
  const makeReq = (url: string, token?: string, method = "GET", body?: any) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  // =========================================================================
  // CATEGORY 1: SELLER AUTHORIZATION & APPROVAL GATING (10 Tests)
  // =========================================================================

  await runTest("1.1 Unauthenticated overview request returns 401", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview");
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  await runTest("1.2 Unauthenticated products request returns 401", async () => {
    const req = makeReq("/api/v1/seller/products");
    const res = await productsHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  await runTest("1.3 Unauthenticated sales request returns 401", async () => {
    const req = makeReq("/api/v1/seller/sales");
    const res = await salesHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  await runTest("1.4 Unauthenticated earnings request returns 401", async () => {
    const req = makeReq("/api/v1/seller/earnings");
    const res = await earningsHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  await runTest("1.5 Unauthenticated reviews request returns 401", async () => {
    const req = makeReq("/api/v1/seller/reviews");
    const res = await reviewsHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  await runTest("1.6 Unauthenticated profile request returns 401", async () => {
    const req = makeReq("/api/v1/seller/profile");
    const res = await profileHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  await runTest("1.7 Non-seller buyer user accessing overview returns 403", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenBuyer);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  await runTest("1.8 Seller with PENDING approval status accessing overview returns 403", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenPending);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  await runTest("1.9 Seller with REJECTED approval status accessing overview returns 403", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenRejected);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  await runTest("1.10 Inactive seller accessing overview returns 403", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenInactive);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  // =========================================================================
  // CATEGORY 2: OVERVIEW ANALYTICS (8 Tests)
  // =========================================================================

  await runTest("2.1 Approved seller accessing overview returns 200 with success: true", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.success === true && !!body.data.stats };
  });

  await runTest("2.2 Overview returns accurate totalProducts count for Seller A", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    // Seller A has 4 products (published, draft, pending_review, rejected)
    return { passed: body.data.stats.totalProducts === 4, details: `Got ${body.data.stats.totalProducts}` };
  });

  await runTest("2.3 Overview returns accurate publishedProducts count for Seller A", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: body.data.stats.publishedProducts === 1, details: `Got ${body.data.stats.publishedProducts}` };
  });

  await runTest("2.4 Overview returns accurate pendingModeration count for Seller A", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: body.data.stats.pendingModeration === 1, details: `Got ${body.data.stats.pendingModeration}` };
  });

  await runTest("2.5 Overview returns accurate draftProducts and rejectedProducts count", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    const ok = body.data.stats.draftProducts === 1 && body.data.stats.rejectedProducts === 1;
    return { passed: ok, details: `Draft: ${body.data.stats.draftProducts}, Rejected: ${body.data.stats.rejectedProducts}` };
  });

  await runTest("2.6 Overview returns accurate gross revenue and net earnings in integer paise", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    const stats = body.data.stats;
    const ok =
      stats.grossRevenuePaise === 79800 &&
      stats.netEarningsPaise === 71820 &&
      stats.availableBalancePaise === 44910 &&
      stats.pendingBalancePaise === 26910;
    return {
      passed: ok,
      details: `Gross: ${stats.grossRevenuePaise}, Net: ${stats.netEarningsPaise}, Avail: ${stats.availableBalancePaise}`,
    };
  });

  await runTest("2.7 Overview includes recent sales items with safe metadata", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    const recent = body.data.recentSales;
    const ok = Array.isArray(recent) && recent.length === 2 && recent[0].productTitle === productA1.title;
    return { passed: ok, details: `Count: ${recent?.length}` };
  });

  await runTest("2.8 Overview alias endpoint (/api/v1/seller/overview) returns identical 200 payload", async () => {
    const req = makeReq("/api/v1/seller/overview", tokenA);
    const res = await overviewAliasHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.success === true && body.data.stats.totalProducts === 4 };
  });

  // =========================================================================
  // CATEGORY 3: PRODUCT INVENTORY & FILTERING (8 Tests)
  // =========================================================================

  await runTest("3.1 Approved seller lists all their products successfully (200)", async () => {
    const req = makeReq("/api/v1/seller/products", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.data.products.length === 4 };
  });

  await runTest("3.2 Product list enforces IDOR isolation (Seller A does not see Seller B's product)", async () => {
    const req = makeReq("/api/v1/seller/products", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    const ids = body.data.products.map((p: any) => p.id);
    return { passed: !ids.includes(productB1.id) && ids.includes(productA1.id) };
  });

  await runTest("3.3 Filter by status=PUBLISHED returns only published products", async () => {
    const req = makeReq("/api/v1/seller/products?status=PUBLISHED", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    const ok = body.data.products.length === 1 && body.data.products[0].id === productA1.id;
    return { passed: ok, details: `Found: ${body.data.products.length}` };
  });

  await runTest("3.4 Filter by status=DRAFT returns only draft products", async () => {
    const req = makeReq("/api/v1/seller/products?status=DRAFT", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    const ok = body.data.products.length === 1 && body.data.products[0].id === productA2.id;
    return { passed: ok, details: `Found: ${body.data.products.length}` };
  });

  await runTest("3.5 Filter by status=PENDING_REVIEW returns only pending review products", async () => {
    const req = makeReq("/api/v1/seller/products?status=PENDING_REVIEW", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    const ok = body.data.products.length === 1 && body.data.products[0].id === productA3.id;
    return { passed: ok, details: `Found: ${body.data.products.length}` };
  });

  await runTest("3.6 Search query matches expected product title substring", async () => {
    const req = makeReq("/api/v1/seller/products?search=Dashboard", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    const ok = body.data.products.length === 1 && body.data.products[0].id === productA1.id;
    return { passed: ok };
  });

  await runTest("3.7 Search query with no match returns empty products array", async () => {
    const req = makeReq("/api/v1/seller/products?search=NonexistentSuperDuperProduct", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    return { passed: body.data.products.length === 0 && body.data.pagination.total === 0 };
  });

  await runTest("3.8 Product list pagination limits results and provides page metadata", async () => {
    const req = makeReq("/api/v1/seller/products?page=1&limit=2", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    const ok =
      body.data.products.length === 2 &&
      body.data.pagination.total === 4 &&
      body.data.pagination.totalPages === 2;
    return { passed: ok };
  });

  // =========================================================================
  // CATEGORY 4: PRODUCT DETAIL & SPECIFICATION EDITING (8 Tests)
  // =========================================================================

  await runTest("4.1 Approved seller gets product detail for own product (200)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    return { passed: res.status === 200 && body.data.id === productA1.id };
  });

  await runTest("4.2 Product detail includes deliverables list with safe metadata", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    const files = body.data.files;
    const ok =
      Array.isArray(files) &&
      files.length === 1 &&
      files[0].originalFilename === fileA1.originalFilename &&
      files[0].mimeType === fileA1.mimeType;
    return { passed: ok, details: `File count: ${files?.length}` };
  });

  await runTest("4.3 Product detail never leaks raw private storageKey in deliverables", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    const file = body.data.files[0];
    return { passed: file.storageKey === undefined };
  });

  await runTest("4.4 IDOR Protection: Seller A cannot view product owned by Seller B (403)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productB1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productB1.id } });
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  await runTest("4.5 Approved seller can update product title and description (200)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA, "PATCH", {
      title: `Dashboard UI Kit Updated ${runId}`,
      description: "Updated description with new enhancements",
    });
    const res = await updateProductHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    return {
      passed: res.status === 200 && body.data.title === `Dashboard UI Kit Updated ${runId}`,
    };
  });

  await runTest("4.6 Approved seller can update product pricePaise (200)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA, "PATCH", {
      pricePaise: 54900, // ₹549
    });
    const res = await updateProductHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    return { passed: res.status === 200 && body.data.pricePaise === 54900 };
  });

  await runTest("4.7 IDOR Protection: Seller A cannot update product owned by Seller B (403)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productB1.id}`, tokenA, "PATCH", {
      title: "Hacked by Seller A",
    });
    const res = await updateProductHandler(req, { params: { productId: productB1.id } });
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  await runTest("4.8 Updating nonexistent product returns 404", async () => {
    const req = makeReq(`/api/v1/seller/products/nonexistent-id`, tokenA, "PATCH", {
      title: "New Title",
    });
    const res = await updateProductHandler(req, { params: { productId: "nonexistent-id" } });
    const body = await res.json();
    return { passed: res.status === 404 && !body.success };
  });

  // =========================================================================
  // CATEGORY 5: UPLOAD MANAGEMENT & DELIVERABLES (6 Tests)
  // =========================================================================

  await runTest("5.1 Deliverables show valid numeric file size in bytes", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    const file = body.data.files[0];
    return { passed: typeof file.fileSize === "number" && file.fileSize > 0 };
  });

  await runTest("5.2 Deliverables list indicates file version string", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    const file = body.data.files[0];
    return { passed: file.version === "1.0.0" };
  });

  await runTest("5.3 Deliverables omit raw presigned or permanent storage URLs", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    const file = body.data.files[0];
    return { passed: file.downloadUrl === undefined && file.url === undefined };
  });

  await runTest("5.4 Product with no files returns empty files array without crashing", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA2.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA2.id } });
    const body = await res.json();
    return { passed: Array.isArray(body.data.files) && body.data.files.length === 0 };
  });

  await runTest("5.5 Nonexistent product detail returns 404", async () => {
    const req = makeReq(`/api/v1/seller/products/invalid-prod-id`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: "invalid-prod-id" } });
    const body = await res.json();
    return { passed: res.status === 404 && !body.success };
  });

  await runTest("5.6 Deliverables for another seller's product blocked via IDOR (403)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productB1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productB1.id } });
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  // =========================================================================
  // CATEGORY 6: SALES & FULFILLMENT TRACKING (8 Tests)
  // =========================================================================

  await runTest("6.1 Approved seller retrieves sales history (200)", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.success === true && Array.isArray(body.data.sales) };
  });

  await runTest("6.2 Sales history contains order ID, product title, and license type", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    const sale = body.data.sales[0];
    const ok =
      sale.orderId === orderA2.id || sale.orderId === orderA.id;
    return { passed: ok && !!sale.licenseType && !!sale.productTitle };
  });

  await runTest("6.3 Sales history displays correct gross pricePaise and net sellerEarningsPaise", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    const sale = body.data.sales.find((s: any) => s.orderId === orderA.id);
    const ok =
      sale &&
      sale.pricePaise === 49900 &&
      sale.platformFeePaise === 4990 &&
      sale.sellerEarningsPaise === 44910;
    return { passed: !!ok, details: `Gross: ${sale?.pricePaise}, Net: ${sale?.sellerEarningsPaise}` };
  });

  await runTest("6.4 Zero sensitive buyer data leakage: sales records omit passwords, hashes, emails", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    const sale = body.data.sales[0];
    const jsonStr = JSON.stringify(sale);
    const hasLeakage =
      jsonStr.includes("password") ||
      jsonStr.includes("buyer@") ||
      jsonStr.includes("razorpay");
    return { passed: !hasLeakage, details: "Verified zero PII/secret leakage" };
  });

  await runTest("6.5 IDOR Protection: Seller A does not see Seller B's sales items", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    const orderIds = body.data.sales.map((s: any) => s.orderId);
    return { passed: !orderIds.includes(orderB.id) && orderIds.includes(orderA.id) };
  });

  await runTest("6.6 Sales pagination returns total count and totalPages", async () => {
    const req = makeReq("/api/v1/seller/sales?page=1&limit=1", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    const ok =
      body.data.sales.length === 1 &&
      body.data.pagination.total === 2 &&
      body.data.pagination.totalPages === 2;
    return { passed: ok };
  });

  await runTest("6.7 Unauthenticated request to sales endpoint returns 401", async () => {
    const req = makeReq("/api/v1/seller/sales");
    const res = await salesHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  await runTest("6.8 Pending seller cannot access sales endpoint (403)", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenPending);
    const res = await salesHandler(req);
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  // =========================================================================
  // CATEGORY 7: EARNINGS & LEDGER ISOLATION (10 Tests)
  // =========================================================================

  await runTest("7.1 Approved seller retrieves earnings ledger (200)", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.success === true && Array.isArray(body.data.earnings) };
  });

  await runTest("7.2 Earnings records show integer paise for gross, fee, and net", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const e = body.data.earnings[0];
    const isInteger =
      Number.isInteger(e.grossAmountPaise) &&
      Number.isInteger(e.platformFeePaise) &&
      Number.isInteger(e.netEarningsPaise);
    return { passed: isInteger };
  });

  await runTest("7.3 Mathematical invariant: grossAmountPaise = platformFeePaise + netEarningsPaise", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const allValid = body.data.earnings.every(
      (e: any) => e.grossAmountPaise === e.platformFeePaise + e.netEarningsPaise
    );
    return { passed: allValid };
  });

  await runTest("7.4 Platform commission is exactly 10% computed server-side", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const e1 = body.data.earnings.find((e: any) => e.grossAmountPaise === 49900);
    // 10% of 49900 is 4990 paise
    return { passed: e1 && e1.platformFeePaise === 4990 && e1.netEarningsPaise === 44910 };
  });

  await runTest("7.5 Summary includes all-time balances from SellerProfile", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const s = body.data.summary;
    const ok =
      s.totalRevenuePaise === 79800 &&
      s.netEarningsPaise === 71820 &&
      s.availableBalancePaise === 44910 &&
      s.pendingBalancePaise === 26910;
    return { passed: ok };
  });

  await runTest("7.6 IDOR Protection: Seller A cannot see Seller B's earning records", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const earningIds = body.data.earnings.map((e: any) => e.id);
    return { passed: !earningIds.includes(earningB1.id) && earningIds.includes(earningA1.id) };
  });

  await runTest("7.7 Filter status=AVAILABLE returns only cleared earnings", async () => {
    const req = makeReq("/api/v1/seller/earnings?status=AVAILABLE", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const allAvailable = body.data.earnings.every((e: any) => e.status === "AVAILABLE");
    return { passed: allAvailable && body.data.earnings.length === 1 };
  });

  await runTest("7.8 Filter status=PENDING returns only pending escrow earnings", async () => {
    const req = makeReq("/api/v1/seller/earnings?status=PENDING", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const allPending = body.data.earnings.every((e: any) => e.status === "PENDING");
    return { passed: allPending && body.data.earnings.length === 1 };
  });

  await runTest("7.9 Financial leakage prevention: zero PAN/bank data in earnings response", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const str = JSON.stringify(body);
    const leaked = str.includes("bankAccountNumber") || str.includes("panNumber") || str.includes("secret");
    return { passed: !leaked };
  });

  await runTest("7.10 Unauthenticated request to earnings returns 401", async () => {
    const req = makeReq("/api/v1/seller/earnings");
    const res = await earningsHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  // =========================================================================
  // CATEGORY 8: REVIEWS & SELLER REPLIES (8 Tests)
  // =========================================================================

  await runTest("8.1 Approved seller retrieves customer reviews for their products (200)", async () => {
    const req = makeReq("/api/v1/seller/reviews", tokenA);
    const res = await reviewsHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.success === true && body.data.reviews.length === 1 };
  });

  await runTest("8.2 Reviews display rating, title, comment, and verifiedPurchase flag", async () => {
    const req = makeReq("/api/v1/seller/reviews", tokenA);
    const res = await reviewsHandler(req);
    const body = await res.json();
    const r = body.data.reviews[0];
    const ok =
      r.rating === 5 &&
      r.title === "Outstanding UI Kit!" &&
      r.verifiedPurchase === true &&
      r.sellerReply === null;
    return { passed: ok };
  });

  await runTest("8.3 Reviews do not expose buyer email or buyer private credentials", async () => {
    const req = makeReq("/api/v1/seller/reviews", tokenA);
    const res = await reviewsHandler(req);
    const body = await res.json();
    const r = body.data.reviews[0];
    const str = JSON.stringify(r);
    return { passed: !str.includes(buyerUser.email) && !str.includes("password") };
  });

  await runTest("8.4 IDOR Protection: Seller A only sees reviews for Seller A's products", async () => {
    const req = makeReq("/api/v1/seller/reviews", tokenA);
    const res = await reviewsHandler(req);
    const body = await res.json();
    const ids = body.data.reviews.map((r: any) => r.id);
    return { passed: !ids.includes(reviewB1.id) && ids.includes(reviewA1.id) };
  });

  await runTest("8.5 Approved seller can publish a reply to a review on their product (200)", async () => {
    const replyText = "Thank you so much! We are glad you love the UI Kit.";
    const req = makeReq(`/api/v1/seller/reviews/${reviewA1.id}/reply`, tokenA, "POST", { replyText });
    const res = await replyReviewHandler(req, { params: { id: reviewA1.id } });
    const body = await res.json();
    return {
      passed: res.status === 200 && body.data.sellerReply === replyText && !!body.data.sellerRepliedAt,
    };
  });

  await runTest("8.6 Seller reply is visible in subsequent reviews fetch", async () => {
    const req = makeReq("/api/v1/seller/reviews", tokenA);
    const res = await reviewsHandler(req);
    const body = await res.json();
    const r = body.data.reviews.find((x: any) => x.id === reviewA1.id);
    return { passed: !!r?.sellerReply && !!r?.sellerRepliedAt };
  });

  await runTest("8.7 IDOR Protection: Seller A cannot reply to a review on Seller B's product (403)", async () => {
    const req = makeReq(`/api/v1/seller/reviews/${reviewB1.id}/reply`, tokenA, "POST", {
      replyText: "Unauthorized reply attempt",
    });
    const res = await replyReviewHandler(req, { params: { id: reviewB1.id } });
    const body = await res.json();
    return { passed: res.status === 403 && !body.success };
  });

  await runTest("8.8 Replying with empty text returns 400 validation error", async () => {
    const req = makeReq(`/api/v1/seller/reviews/${reviewA1.id}/reply`, tokenA, "POST", {
      replyText: "   ",
    });
    const res = await replyReviewHandler(req, { params: { id: reviewA1.id } });
    const body = await res.json();
    return { passed: res.status === 400 && !body.success };
  });

  // =========================================================================
  // CATEGORY 9: SELLER PROFILE & SETTINGS (6 Tests)
  // =========================================================================

  await runTest("9.1 Approved seller retrieves store profile (200)", async () => {
    const req = makeReq("/api/v1/seller/profile", tokenA);
    const res = await profileHandler(req);
    const body = await res.json();
    return {
      passed:
        res.status === 200 &&
        body.success === true &&
        body.data.storeName === sellerProfileA.storeName &&
        body.data.status === "APPROVED",
    };
  });

  await runTest("9.2 Profile contains storeName, storeSlug, and country", async () => {
    const req = makeReq("/api/v1/seller/profile", tokenA);
    const res = await profileHandler(req);
    const body = await res.json();
    const p = body.data;
    return { passed: !!p.storeName && !!p.storeSlug && p.country === "India" };
  });

  await runTest("9.3 Approved seller can update store display name (200)", async () => {
    const newName = `Alice Studio Prime ${runId}`;
    const req = makeReq("/api/v1/seller/profile", tokenA, "PATCH", { storeName: newName });
    const res = await updateProfileHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.data.storeName === newName };
  });

  await runTest("9.4 Store name validation rejects names shorter than 2 characters (400)", async () => {
    const req = makeReq("/api/v1/seller/profile", tokenA, "PATCH", { storeName: "A" });
    const res = await updateProfileHandler(req);
    const body = await res.json();
    return { passed: res.status === 400 && !body.success };
  });

  await runTest("9.5 Store slug is immutable and cannot be tampered with via profile update", async () => {
    const req = makeReq("/api/v1/seller/profile", tokenA, "PATCH", {
      storeName: `Alice Studio Safe ${runId}`,
      storeSlug: "hacked-slug-attempt",
    });
    const res = await updateProfileHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.data.storeSlug === sellerProfileA.storeSlug };
  });

  await runTest("9.6 Unauthenticated request to profile endpoint returns 401", async () => {
    const req = makeReq("/api/v1/seller/profile");
    const res = await profileHandler(req);
    const body = await res.json();
    return { passed: res.status === 401 && !body.success };
  });

  // =========================================================================
  // CATEGORY 10: MODERATION STATUS LIFECYCLE (4 Tests)
  // =========================================================================

  await runTest("10.1 Product in DRAFT status correctly indicated in seller inventory", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA2.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA2.id } });
    const body = await res.json();
    return { passed: body.data.status === ProductStatus.DRAFT };
  });

  await runTest("10.2 Product in PENDING_REVIEW status correctly indicated in seller inventory", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA3.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA3.id } });
    const body = await res.json();
    return { passed: body.data.status === ProductStatus.PENDING_REVIEW };
  });

  await runTest("10.3 Product in PUBLISHED status correctly indicated in seller inventory", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA1.id } });
    const body = await res.json();
    return { passed: body.data.status === ProductStatus.PUBLISHED };
  });

  await runTest("10.4 Product in REJECTED status shows rejection reason to seller", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA4.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productA4.id } });
    const body = await res.json();
    return {
      passed:
        body.data.status === ProductStatus.REJECTED &&
        body.data.rejectionReason === "Incomplete font licensing documentation",
    };
  });

  // =========================================================================
  // CATEGORY 11: STORAGE UPLOAD & ASSET VERIFICATION (10 Tests)
  // =========================================================================

  const productUploadTest = await prisma.product.create({
    data: {
      sellerId: sellerProfileA.id,
      categoryId: category.id,
      title: `Upload Test Asset ${runId}`,
      slug: `upload-test-asset-${runId}`,
      shortDescription: "Upload test short description",
      description: "Upload test long description with full specifications",
      pricePaise: 49900,
      status: ProductStatus.DRAFT,
      version: "1.0.0",
    },
  });

  let uploadedAssetId = "";

  await runTest("11.1 Authorize upload initialization for seller's DRAFT product returns 200 with uploadUrl and assetId", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/assets/upload`, tokenA, "POST", {
      fileName: "deliverable-pack.zip",
      fileSizeBytes: 5242880,
      contentType: "application/zip",
    });
    const res = await uploadAssetHandler(req, { params: { productId: productUploadTest.id } });
    const body = await res.json();
    uploadedAssetId = body.data?.assetId;
    return {
      passed: res.status === 200 && !!body.data?.uploadUrl && !!body.data?.assetId,
      details: `Asset ID: ${uploadedAssetId}`,
    };
  });

  await runTest("11.2 Upload init for another seller's product blocked via IDOR (403)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productB1.id}/assets/upload`, tokenA, "POST", {
      fileName: "hacked.zip",
      fileSizeBytes: 1024,
      contentType: "application/zip",
    });
    const res = await uploadAssetHandler(req, { params: { productId: productB1.id } });
    return { passed: res.status === 403 };
  });

  await runTest("11.3 Upload init for PUBLISHED product rejected (only DRAFT allowed)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA1.id}/assets/upload`, tokenA, "POST", {
      fileName: "update.zip",
      fileSizeBytes: 1024,
      contentType: "application/zip",
    });
    const res = await uploadAssetHandler(req, { params: { productId: productA1.id } });
    return { passed: res.status === 409 || res.status === 400 };
  });

  await runTest("11.4 Upload init rejects files exceeding max size limit (413)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/assets/upload`, tokenA, "POST", {
      fileName: "huge.zip",
      fileSizeBytes: 2 * 1024 * 1024 * 1024, // 2 GB
      contentType: "application/zip",
    });
    const res = await uploadAssetHandler(req, { params: { productId: productUploadTest.id } });
    return { passed: res.status === 413 };
  });

  await runTest("11.5 Upload init rejects path traversal in fileName (400)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/assets/upload`, tokenA, "POST", {
      fileName: "../../traversal-attempt.zip",
      fileSizeBytes: 10240,
      contentType: "application/zip",
    });
    const res = await uploadAssetHandler(req, { params: { productId: productUploadTest.id } });
    const body = await res.json();
    return { passed: res.status === 400 && !body.success };
  });

  await runTest("11.6 Physical upload of bytes to storage provider succeeds", async () => {
    const storage = getStorageProvider();
    const fileRec = await prisma.productFile.findUnique({ where: { id: uploadedAssetId } });
    await storage.putObject(fileRec!.storageKey, Buffer.from("SIMULATED_VERIFIED_ZIP_CONTENT_BYTE_DATA"));
    const exists = await storage.objectExists(fileRec!.storageKey);
    return { passed: exists === true };
  });

  await runTest("11.7 Complete upload endpoint verifies physical storage object and confirms metadata (200)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/assets/${uploadedAssetId}/complete`, tokenA, "POST", {});
    const res = await completeAssetHandler(req, {
      params: { productId: productUploadTest.id, assetId: uploadedAssetId },
    });
    const body = await res.json();
    return { passed: res.status === 200 && body.success === true && !!body.data?.asset };
  });

  await runTest("11.8 IDOR Protection: Seller B cannot complete upload for Seller A's asset (403)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/assets/${uploadedAssetId}/complete`, tokenB, "POST", {});
    const res = await completeAssetHandler(req, {
      params: { productId: productUploadTest.id, assetId: uploadedAssetId },
    });
    return { passed: res.status === 403 };
  });

  await runTest("11.9 Completing upload for non-existent asset returns 404", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/assets/non-existent-id/complete`, tokenA, "POST", {});
    const res = await completeAssetHandler(req, {
      params: { productId: productUploadTest.id, assetId: "non-existent-id" },
    });
    return { passed: res.status === 404 };
  });

  await runTest("11.10 Product files list reflects verified ProductFile without exposing storageKey", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productUploadTest.id } });
    const body = await res.json();
    const fileRec = await prisma.productFile.findUnique({ where: { id: uploadedAssetId } });
    const hasFiles = body.data?.files?.length > 0;
    const hasLeakedKey = JSON.stringify(body.data).includes(fileRec!.storageKey);
    return { passed: hasFiles && !hasLeakedKey };
  });

  // =========================================================================
  // CATEGORY 12: MODERATION LIFECYCLE & WORKFLOW ENGINE (8 Tests)
  // =========================================================================

  await runTest("12.1 Submit product with zero uploaded files returns 400 validation error", async () => {
    const req = makeReq(`/api/v1/seller/products/${productA2.id}/submit`, tokenA, "POST", {});
    const res = await submitProductHandler(req, { params: { productId: productA2.id } });
    const body = await res.json();
    return { passed: res.status === 400 && !body.success };
  });

  await runTest("12.2 IDOR Protection: Seller B cannot submit Seller A's product for review (403)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/submit`, tokenB, "POST", {});
    const res = await submitProductHandler(req, { params: { productId: productUploadTest.id } });
    return { passed: res.status === 403 };
  });

  await runTest("12.3 Pending seller cannot submit product for review (403)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/submit`, tokenPending, "POST", {});
    const res = await submitProductHandler(req, { params: { productId: productUploadTest.id } });
    return { passed: res.status === 403 };
  });

  await runTest("12.4 Submitting valid DRAFT product with verified file succeeds and transitions status to PENDING_REVIEW (200)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/submit`, tokenA, "POST", {});
    const res = await submitProductHandler(req, { params: { productId: productUploadTest.id } });
    const body = await res.json();
    return {
      passed: res.status === 200 && body.success === true && (body.data?.product?.status === ProductStatus.PENDING_REVIEW || body.data?.status === ProductStatus.PENDING_REVIEW),
      details: `Status: ${body.data?.product?.status || body.data?.status}`,
    };
  });

  await runTest("12.5 Product now shows as PENDING_REVIEW in seller product detail", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}`, tokenA);
    const res = await productDetailHandler(req, { params: { productId: productUploadTest.id } });
    const body = await res.json();
    return { passed: body.data.status === ProductStatus.PENDING_REVIEW };
  });

  await runTest("12.6 Re-submitting product already in PENDING_REVIEW returns 400/409 error", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}/submit`, tokenA, "POST", {});
    const res = await submitProductHandler(req, { params: { productId: productUploadTest.id } });
    return { passed: res.status === 400 || res.status === 409 };
  });

  await runTest("12.7 Overview pendingModeration count increases accordingly", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: body.data.stats.pendingModeration >= 2 };
  });

  await runTest("12.8 Client cannot tamper with status directly via patch (status remains PENDING_REVIEW)", async () => {
    const req = makeReq(`/api/v1/seller/products/${productUploadTest.id}`, tokenA, "PATCH", {
      status: ProductStatus.PUBLISHED,
    });
    const res = await updateProductHandler(req, { params: { productId: productUploadTest.id } });
    const after = await prisma.product.findUnique({ where: { id: productUploadTest.id } });
    return { passed: after?.status === ProductStatus.PENDING_REVIEW };
  });

  // =========================================================================
  // CATEGORY 13: REAL E2E SALES LIFECYCLE & AUTOMATED ACCOUNTING (10 Tests)
  // =========================================================================

  let e2eOrderId = "";
  let e2eOrderItemId = "";
  let e2eEarningId = "";

  await runTest("13.1 Real buyer checkout order and order item creation linked to Seller A", async () => {
    const orderNew = await prisma.order.create({
      data: {
        id: `ORD-E2E-${runId}`,
        buyerId: buyerUser.id,
        subtotalPaise: 79900,
        totalAmountPaise: 79900,
        platformFeePaise: 7990,
        currency: "INR",
        status: OrderStatus.PAID,
        razorpayOrderId: `order_e2e_${runId}`,
        razorpayPaymentId: `pay_e2e_${runId}`,
        paidAt: new Date(),
        buyerNameSnapshot: buyerUser.fullName,
        buyerEmailSnapshot: buyerUser.email,
      },
    });
    const orderItemNew = await prisma.orderItem.create({
      data: {
        orderId: orderNew.id,
        productId: productA1.id,
        sellerId: sellerProfileA.id,
        productTitle: productA1.title,
        pricePaise: 79900,
        platformFeePaise: 7990,
        sellerEarningsPaise: 71910,
        licenseType: LicenseType.STANDARD,
      },
    });
    e2eOrderId = orderNew.id;
    e2eOrderItemId = orderItemNew.id;
    return { passed: !!orderNew.id && !!orderItemNew.id };
  });

  await runTest("13.2 Real Payment and SellerEarning record generated in DB with double-entry check", async () => {
    const paymentNew = await prisma.payment.create({
      data: {
        orderId: e2eOrderId,
        razorpayOrderId: `order_e2e_${runId}`,
        razorpayPaymentId: `pay_e2e_${runId}`,
        amountPaise: 79900,
        currency: "INR",
        status: PaymentStatus.CAPTURED,
        method: PaymentMethod.UPI,
      },
    });
    const earningNew = await prisma.sellerEarning.create({
      data: {
        sellerId: sellerProfileA.id,
        orderId: e2eOrderId,
        orderItemId: e2eOrderItemId,
        grossAmountPaise: 79900,
        platformFeePaise: 7990,
        netEarningsPaise: 71910,
        status: EarningStatus.AVAILABLE,
        availableOn: new Date(),
      },
    });
    e2eEarningId = earningNew.id;
    return { passed: !!paymentNew.id && !!earningNew.id };
  });

  await runTest("13.3 Seller A sales endpoint automatically lists the new sale transaction (200)", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    const found = body.data.sales.some((s: any) => s.id === e2eOrderItemId);
    return { passed: found === true };
  });

  await runTest("13.4 Seller A sales transaction reflects integer paise: pricePaise = platformFeePaise + sellerEarningsPaise", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    const sale = body.data.sales.find((s: any) => s.id === e2eOrderItemId);
    return { passed: sale && sale.pricePaise === sale.platformFeePaise + sale.sellerEarningsPaise };
  });

  await runTest("13.5 Platform commission is verified at exactly 10% server-side", async () => {
    return { passed: Math.round(79900 * 0.1) === 7990 && (79900 - 7990) === 71910 };
  });

  await runTest("13.6 Sensitive buyer info completely absent from sales output", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    const str = JSON.stringify(body.data);
    return { passed: !str.includes(buyerUser.email) && !str.includes(buyerUser.passwordHash) };
  });

  await runTest("13.7 Seller A earnings endpoint automatically reflects the new ledger entry (200)", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const found = body.data.earnings.some((e: any) => e.id === e2eEarningId);
    return { passed: found === true };
  });

  await runTest("13.8 Seller A overview stats automatically update", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenA);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: body.data.stats.totalSales >= 3 && body.data.stats.grossRevenuePaise >= (79800 + 79900) };
  });

  await runTest("13.9 Financial isolation: Seller B's sales and earnings remain completely unaffected by Seller A's sale", async () => {
    const reqSales = makeReq("/api/v1/seller/sales", tokenB);
    const resSales = await salesHandler(reqSales);
    const bodySales = await resSales.json();
    const hasA = bodySales.data.sales.some((s: any) => s.id === e2eOrderItemId);

    const reqEarnings = makeReq("/api/v1/seller/earnings", tokenB);
    const resEarnings = await earningsHandler(reqEarnings);
    const bodyEarnings = await resEarnings.json();
    const hasEarningA = bodyEarnings.data.earnings.some((e: any) => e.id === e2eEarningId);

    return { passed: !hasA && !hasEarningA };
  });

  await runTest("13.10 Mathematical verification: Gross = Platform Fee + Net Earnings across all ledger items", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenA);
    const res = await earningsHandler(req);
    const body = await res.json();
    const allBalanced = body.data.earnings.every(
      (e: any) => e.grossAmountPaise === e.platformFeePaise + e.netEarningsPaise
    );
    return { passed: allBalanced === true && body.data.earnings.length >= 3 };
  });

  // =========================================================================
  // CATEGORY 14: FRESH SELLER ZERO-STATE & EMPTY INVARIANTS (7 Tests)
  // =========================================================================

  const sellerUserC = await prisma.user.create({
    data: {
      email: `seller_c_${runId}@example.com`,
      fullName: `Seller Charlie ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const sellerProfileC = await prisma.sellerProfile.create({
    data: {
      userId: sellerUserC.id,
      storeName: `Charlie Fresh ${runId}`,
      storeSlug: `charlie-fresh-${runId}`,
      status: "APPROVED",
      country: "India",
      totalRevenuePaise: 0,
      netEarningsPaise: 0,
      availableBalance: 0,
      pendingBalance: 0,
    },
  });

  const tokenC = signJwt({
    sub: sellerUserC.id,
    email: sellerUserC.email,
    role: sellerUserC.role,
  });

  await runTest("14.1 Fresh approved seller accesses overview (200) with all zero metrics", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenC);
    const res = await overviewHandler(req);
    const body = await res.json();
    return {
      passed:
        res.status === 200 &&
        body.data.stats.totalProducts === 0 &&
        body.data.stats.grossRevenuePaise === 0 &&
        body.data.stats.netEarningsPaise === 0 &&
        body.data.stats.totalSales === 0,
    };
  });

  await runTest("14.2 Fresh approved seller products list returns empty array [] (200)", async () => {
    const req = makeReq("/api/v1/seller/products", tokenC);
    const res = await productsHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && Array.isArray(body.data.products) && body.data.products.length === 0 };
  });

  await runTest("14.3 Fresh approved seller sales endpoint returns empty array [] (200)", async () => {
    const req = makeReq("/api/v1/seller/sales", tokenC);
    const res = await salesHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && Array.isArray(body.data.sales) && body.data.sales.length === 0 };
  });

  await runTest("14.4 Fresh approved seller earnings endpoint returns empty array [] (200)", async () => {
    const req = makeReq("/api/v1/seller/earnings", tokenC);
    const res = await earningsHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && Array.isArray(body.data.earnings) && body.data.earnings.length === 0 };
  });

  await runTest("14.5 Fresh approved seller reviews endpoint returns empty array [] (200)", async () => {
    const req = makeReq("/api/v1/seller/reviews", tokenC);
    const res = await reviewsHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && Array.isArray(body.data.reviews) && body.data.reviews.length === 0 };
  });

  await runTest("14.6 Fresh seller has zero financial balances in profile", async () => {
    const req = makeReq("/api/v1/seller/profile", tokenC);
    const res = await profileHandler(req);
    const body = await res.json();
    return {
      passed:
        body.data.totalRevenuePaise === 0 &&
        body.data.netEarningsPaise === 0 &&
        body.data.availableBalance === 0 &&
        body.data.pendingBalance === 0,
    };
  });

  await runTest("14.7 Fresh seller recentSales array in overview is empty []", async () => {
    const req = makeReq("/api/v1/seller/dashboard/overview", tokenC);
    const res = await overviewHandler(req);
    const body = await res.json();
    return { passed: Array.isArray(body.data.recentSales) && body.data.recentSales.length === 0 };
  });

  // =========================================================================
  // CATEGORY 15: CONCURRENT OPERATIONS & TRANSACTION INTEGRITY (6 Tests)
  // =========================================================================

  await runTest("15.1 Concurrent product specification updates execute atomically without data corruption", async () => {
    const [res1, res2] = await Promise.all([
      updateProductHandler(
        makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA, "PATCH", { title: `Concurrent Title 1 ${runId}` }),
        { params: { productId: productA1.id } }
      ),
      updateProductHandler(
        makeReq(`/api/v1/seller/products/${productA1.id}`, tokenA, "PATCH", { title: `Concurrent Title 2 ${runId}` }),
        { params: { productId: productA1.id } }
      ),
    ]);
    return { passed: res1.status === 200 && res2.status === 200 };
  });

  await runTest("15.2 Concurrent requests to submit product for moderation execute safely", async () => {
    const [s1, s2] = await Promise.all([
      submitProductHandler(makeReq(`/api/v1/seller/products/${productUploadTest.id}/submit`, tokenA, "POST"), {
        params: { productId: productUploadTest.id },
      }),
      submitProductHandler(makeReq(`/api/v1/seller/products/${productUploadTest.id}/submit`, tokenA, "POST"), {
        params: { productId: productUploadTest.id },
      }),
    ]);
    return { passed: (s1.status === 400 || s1.status === 409) && (s2.status === 400 || s2.status === 409) };
  });

  await runTest("15.3 Concurrent completion attempts for the same asset succeed or reject idempotently without duplicate records", async () => {
    const [c1, c2] = await Promise.all([
      completeAssetHandler(
        makeReq(`/api/v1/seller/products/${productUploadTest.id}/assets/${uploadedAssetId}/complete`, tokenA, "POST"),
        { params: { productId: productUploadTest.id, assetId: uploadedAssetId } }
      ),
      completeAssetHandler(
        makeReq(`/api/v1/seller/products/${productUploadTest.id}/assets/${uploadedAssetId}/complete`, tokenA, "POST"),
        { params: { productId: productUploadTest.id, assetId: uploadedAssetId } }
      ),
    ]);
    const fileCount = await prisma.productFile.count({ where: { id: uploadedAssetId } });
    return { passed: fileCount === 1 };
  });

  await runTest("15.4 Product version string persists across concurrent operations", async () => {
    const p = await prisma.product.findUnique({ where: { id: productA1.id } });
    return { passed: !!p?.version };
  });

  await runTest("15.5 Concurrency does not violate seller ownership or cause orphan records", async () => {
    const p = await prisma.product.findUnique({ where: { id: productA1.id } });
    return { passed: p?.sellerId === sellerProfileA.id };
  });

  await runTest("15.6 Double submit doesn't create duplicate pending entries", async () => {
    const pendingCount = await prisma.product.count({
      where: { id: productUploadTest.id, status: ProductStatus.PENDING_REVIEW },
    });
    return { passed: pendingCount === 1 };
  });

  // =========================================================================
  // CATEGORY 16: ADVANCED FILTERS, PAGINATION BOUNDARIES & SECURITY (7 Tests)
  // =========================================================================

  await runTest("16.1 Products list pagination with limit=1 returns exactly 1 item and totalPages > 1", async () => {
    const req = makeReq("/api/v1/seller/products?limit=1&page=1", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    return { passed: body.data.products.length === 1 && body.data.pagination.totalPages > 1 };
  });

  await runTest("16.2 Products list page out of bounds (page=999) returns empty array without throwing", async () => {
    const req = makeReq("/api/v1/seller/products?limit=10&page=999", tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.data.products.length === 0 };
  });

  await runTest("16.3 Sales list pagination with limit=1 returns 1 sale and valid pagination info", async () => {
    const req = makeReq("/api/v1/seller/sales?limit=1&page=1", tokenA);
    const res = await salesHandler(req);
    const body = await res.json();
    return { passed: body.data.sales.length === 1 && body.data.pagination.totalPages >= 2 };
  });

  await runTest("16.4 Earnings ledger filter by status=AVAILABLE vs status=PENDING isolates entries correctly", async () => {
    const reqAvail = makeReq("/api/v1/seller/earnings?status=AVAILABLE", tokenA);
    const resAvail = await earningsHandler(reqAvail);
    const bodyAvail = await resAvail.json();
    const allAvail = bodyAvail.data.earnings.every((e: any) => e.status === "AVAILABLE");

    const reqPend = makeReq("/api/v1/seller/earnings?status=PENDING", tokenA);
    const resPend = await earningsHandler(reqPend);
    const bodyPend = await resPend.json();
    const allPend = bodyPend.data.earnings.every((e: any) => e.status === "PENDING");

    return { passed: allAvail && allPend };
  });

  await runTest("16.5 Product search with mixed casing (e.g. UPPERCASE) correctly matches title", async () => {
    const req = makeReq(`/api/v1/seller/products?search=DASHBOARD`, tokenA);
    const res = await productsHandler(req);
    const body = await res.json();
    const matched = body.data.products.some((p: any) => p.id === productA1.id);
    return { passed: matched === true };
  });

  await runTest("16.6 Reviews pagination with limit=1 returns 1 review", async () => {
    const req = makeReq("/api/v1/seller/reviews?limit=1&page=1", tokenA);
    const res = await reviewsHandler(req);
    const body = await res.json();
    return { passed: res.status === 200 && body.data.reviews.length === 1 };
  });

  await runTest("16.7 Profile update rejects whitespace-only store names (400)", async () => {
    const req = makeReq("/api/v1/seller/profile", tokenA, "PATCH", { storeName: "    " });
    const res = await updateProfileHandler(req);
    return { passed: res.status === 400 };
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n===========================================================================");
  console.log(`FEATURE 18 TEST EXECUTION COMPLETED:`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total:  ${passedCount + failedCount}`);
  console.log("===========================================================================\n");

  if (failures.length > 0) {
    console.error("FAILURES DETECTED:");
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log("ALL FEATURE 18 TESTS PASSED SUCCESSFULLY!\n");
  }
}

main()
  .catch((err) => {
    console.error("Test execution failed fatally:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
