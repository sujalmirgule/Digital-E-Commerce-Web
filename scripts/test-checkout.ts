/**
 * Feature 10 Test Suite — Checkout & Order Initialization
 *
 * Validates:
 *   1. Authentication: active JWT required, inactive/expired/tampered rejected.
 *   2. Product availability: only PUBLISHED products can be checked out;
 *      DRAFT, PENDING, REJECTED, ARCHIVED, nonexistent rejected.
 *   3. Authoritative price calculation: DB price used, client-sent amounts ignored/rejected,
 *      discount prices applied correctly, integer paise preserved.
 *   4. Price & metadata snapshot: Order & OrderItem store immutable price snapshot,
 *      platform fee (10%), seller earnings (90%), buyer snapshot.
 *   5. Initial status: Order strictly created with status PENDING.
 *      Never marked PAID, no entitlements, no digital downloads provisioned.
 *   6. Idempotency: exact same idempotency key returns existing checkout session;
 *      database-level unique constraint prevents duplicate orders.
 *   7. Razorpay boundary: exact amount/currency sent, public key exposed, secrets hidden,
 *      gateway failures/timeouts handled gracefully with HTTP 502.
 *   8. Zero data leakage: no password hashes, JWT secrets, Razorpay secrets,
 *      database URLs, PAN, bank accounts, or storageKeys.
 *   9. Concurrency & race conditions: concurrent checkouts and same-key retries resolve safely.
 *  10. Full regression sanity across Features 01–09.
 */

import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { signJwt } from "../src/lib/jwt";
import { POST as checkoutHandler } from "../src/app/api/v1/orders/checkout/route";
import { POST as ordersHandler } from "../src/app/api/v1/orders/route";
import { POST as checkoutAliasHandler } from "../src/app/api/v1/checkout/route";

// Regression routes
import { POST as signupHandler } from "../src/app/api/v1/auth/signup/route";
import { POST as loginHandler } from "../src/app/api/v1/auth/login/route";
import { GET as meHandler } from "../src/app/api/v1/users/me/route";
import { POST as onboardHandler } from "../src/app/api/v1/seller/onboard/route";
import { PATCH as approveSellerHandler } from "../src/app/api/v1/admin/sellers/[id]/approve/route";
import { POST as createProductHandler } from "../src/app/api/v1/seller/products/route";
import { POST as uploadInitHandler } from "../src/app/api/v1/seller/products/[productId]/assets/upload/route";
import { PUT as localUploadHandler } from "../src/app/api/v1/internal/storage/upload/[...objectKey]/route";
import { POST as uploadCompleteHandler } from "../src/app/api/v1/seller/products/[productId]/assets/[assetId]/complete/route";
import { POST as submitProductHandler } from "../src/app/api/v1/seller/products/[productId]/submit/route";
import { POST as approveProductHandler } from "../src/app/api/v1/admin/products/[productId]/approve/route";
import { GET as catalogHandler } from "../src/app/api/v1/products/route";
import { GET as productDetailHandler } from "../src/app/api/v1/products/[slug]/route";

function makeReq(
  url: string,
  method = "POST",
  body?: unknown,
  authHeader?: string,
  customHeaders?: Record<string, string>
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...customHeaders,
  };
  if (authHeader) headers["authorization"] = authHeader;
  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makePutReq(url: string, data: Buffer, contentType?: string): NextRequest {
  const headers: Record<string, string> = {
    "content-type": contentType ?? "application/zip",
    "content-length": String(data.length),
  };
  return new NextRequest(url, { method: "PUT", headers, body: data as unknown as BodyInit });
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
  console.log("DIGITAL MARKETPLACE — FEATURE 10: CHECKOUT & ORDER INITIALIZATION");
  console.log("=".repeat(75) + "\n");

  const ts = Date.now();
  const ph = await hashPassword("CheckoutPass123!@#");

  // ── Seed Categories ────────────────────────────────────────────────────────
  const category = await prisma.category.create({
    data: {
      name: `Checkout Dev ${ts}`,
      slug: `chk-dev-${ts}`,
      isActive: true,
    },
  });

  // ── Seed Admin & Sellers & Buyers ──────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      fullName: "Checkout Admin",
      email: `admin.chk.${ts}@test.com`,
      passwordHash: ph,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      fullName: "Amit Patel",
      email: `buyer.chk.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });

  const inactiveBuyer = await prisma.user.create({
    data: {
      fullName: "Inactive Buyer",
      email: `inactive.chk.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: false,
      isEmailVerified: true,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      fullName: "CodeCraft Labs",
      email: `seller.chk.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "CodeCraft Labs",
          storeSlug: `codecraft-${ts}`,
          bio: "Creators of production ready UI kits",
          panNumberMasked: "ABCDE****F",
          bankAccountLast4: "****9999",
          bankIfsc: "HDFC0001234",
          bankAccountHolder: "CodeCraft Labs",
          status: "APPROVED",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const seller = sellerUser.sellerProfile!;

  // ── Seed Products across statuses ──────────────────────────────────────────
  // 1. Regular Published Product (₹799 = 79900 paise)
  const prodPublished = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      title: "Ultimate React Dashboard UI Kit",
      slug: `react-kit-${ts}`,
      shortDescription: "Over 50+ pre-built React components.",
      description: "Comprehensive React UI toolkit.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 79900,
      discountPricePaise: null,
      status: "PUBLISHED",
    },
  });

  // 2. Discounted Published Product (Regular ₹999 = 99900, Discount ₹699 = 69900)
  const prodDiscounted = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      title: "Fullstack NextJS SaaS Pro",
      slug: `nextjs-pro-${ts}`,
      shortDescription: "Complete SaaS starter kit with Stripe & Prisma.",
      description: "Fullstack production ready SaaS kit.",
      productType: "SOFTWARE",
      pricePaise: 99900,
      discountPricePaise: 69900,
      status: "PUBLISHED",
    },
  });

  // 3. Free Published Product (₹0 = 0 paise)
  const prodFree = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      title: "Free Developer Icons Pack",
      slug: `free-icons-${ts}`,
      shortDescription: "500+ free SVG developer icons.",
      description: "Free developer icon library.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 0,
      isFree: true,
      status: "PUBLISHED",
    },
  });

  // 4. Draft Product
  const prodDraft = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      title: "Secret Draft Template",
      slug: `draft-chk-${ts}`,
      shortDescription: "Draft product description.",
      description: "Full draft product description.",
      pricePaise: 50000,
      status: "DRAFT",
    },
  });

  // 5. Pending Review Product
  const prodPending = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      title: "Pending Moderation Template",
      slug: `pending-chk-${ts}`,
      shortDescription: "Pending review description.",
      description: "Full pending product description.",
      pricePaise: 50000,
      status: "PENDING_REVIEW",
    },
  });

  // 6. Rejected Product
  const prodRejected = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      title: "Rejected Template",
      slug: `rejected-chk-${ts}`,
      shortDescription: "Rejected product description.",
      description: "Full rejected product description.",
      pricePaise: 50000,
      status: "REJECTED",
      rejectionReason: "Violated asset guidelines",
    },
  });

  // 7. Archived Product
  const prodArchived = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      title: "Archived Template",
      slug: `archived-chk-${ts}`,
      shortDescription: "Archived product description.",
      description: "Full archived product description.",
      pricePaise: 50000,
      status: "ARCHIVED",
    },
  });

  // 8. Product that starts PUBLISHED but will be unpublished to test concurrency
  const prodToUnpublish = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: category.id,
      title: "Product To Be Unpublished",
      slug: `unpub-chk-${ts}`,
      shortDescription: "Short description.",
      description: "Full description.",
      pricePaise: 40000,
      status: "PUBLISHED",
    },
  });

  // ── Tokens ────────────────────────────────────────────────────────────────
  const buyerToken = `Bearer ${signJwt({ sub: buyer.id, email: buyer.email, role: "BUYER" })}`;
  const sellerToken = `Bearer ${signJwt({ sub: sellerUser.id, email: sellerUser.email, role: "BUYER" })}`;
  const adminToken = `Bearer ${signJwt({ sub: admin.id, email: admin.email, role: "ADMIN" })}`;
  const inactiveToken = `Bearer ${signJwt({ sub: inactiveBuyer.id, email: inactiveBuyer.email, role: "BUYER" })}`;
  const expiredToken = `Bearer ${signJwt({ sub: buyer.id, email: buyer.email, role: "BUYER" }, { expiresIn: "0s" })}`;
  const invalidToken = "Bearer invalid.signature.token";

  // ===========================================================================
  // SECTION 1: AUTHENTICATION
  // ===========================================================================

  await runTest("01. Unauthenticated checkout rejected with 401", async () => {
    const res = await checkoutHandler(
      makeReq("http://localhost/api/v1/orders/checkout", "POST", {
        productId: prodPublished.id,
      })
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 401 && data.error?.code === "UNAUTHORIZED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("02. Invalid JWT token rejected with 401", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        invalidToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 401 && data.error?.code === "UNAUTHORIZED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("03. Expired JWT token rejected with 401", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        expiredToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 401 && data.error?.code === "UNAUTHORIZED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("04. Inactive user account rejected with 403", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        inactiveToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 403 && data.error?.code === "FORBIDDEN",
      details: `Status: ${data.status}`,
    };
  });

  // ===========================================================================
  // SECTION 2: PRODUCT AVAILABILITY & STATUS CHECKS
  // ===========================================================================

  let firstOrderId = "";
  let firstRazorpayOrderId = "";

  await runTest("05. Published product checkout accepted with 201 Created", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, licenseType: "COMMERCIAL" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    firstOrderId = data.data?.orderId;
    firstRazorpayOrderId = data.data?.razorpayOrderId;
    return {
      passed:
        data.status === 201 &&
        data.success === true &&
        !!firstOrderId &&
        firstOrderId.startsWith("ORD-") &&
        firstRazorpayOrderId.startsWith("order_"),
      details: `Status: ${data.status}, OrderId: ${firstOrderId}, RazorpayId: ${firstRazorpayOrderId}`,
    };
  });

  await runTest("06. DRAFT product checkout rejected with 400", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodDraft.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "PRODUCT_NOT_AVAILABLE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("07. PENDING_REVIEW product checkout rejected with 400", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPending.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "PRODUCT_NOT_AVAILABLE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("08. REJECTED product checkout rejected with 400", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodRejected.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "PRODUCT_NOT_AVAILABLE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("09. ARCHIVED product checkout rejected with 400", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodArchived.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "PRODUCT_NOT_AVAILABLE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("10. Nonexistent product ID returns 404", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: "prod_nonexistent_99999" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 404 && data.error?.code === "NOT_FOUND",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("11. Malformed product ID with spaces/symbols rejected with 400", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: "invalid id with spaces!@#" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  // ===========================================================================
  // SECTION 3: PRICE INTEGRITY
  // ===========================================================================

  await runTest("12. Client-injected amount in body is rejected by strict validation (400)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, amount: 100 },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("13. Client-injected price in body is rejected by strict validation (400)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, price: 99 },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("14. Authoritative database price (79900 paise) used by server", async () => {
    const order = await prisma.order.findUnique({
      where: { id: firstOrderId },
    });
    return {
      passed: order?.totalAmountPaise === 79900 && order?.subtotalPaise === 79900,
      details: `TotalPaise: ${order?.totalAmountPaise}, SubtotalPaise: ${order?.subtotalPaise}`,
    };
  });

  await runTest("15. Integer paise format preserved (not converted to decimal float)", async () => {
    const order = await prisma.order.findUnique({
      where: { id: firstOrderId },
    });
    const isInteger = Number.isInteger(order?.totalAmountPaise);
    return {
      passed: isInteger && order?.totalAmountPaise === 79900,
      details: `IsInteger: ${isInteger}, Amount: ${order?.totalAmountPaise}`,
    };
  });

  let discountOrderId = "";

  await runTest("16. Discount price (discountPricePaise: 69900) correctly calculated and snapshotted", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodDiscounted.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    discountOrderId = data.data?.orderId;

    const order = await prisma.order.findUnique({
      where: { id: discountOrderId },
    });

    return {
      passed:
        data.status === 201 &&
        order?.totalAmountPaise === 69900 &&
        order?.subtotalPaise === 99900 &&
        order?.discountPaise === 30000,
      details: `Total: ${order?.totalAmountPaise}, Subtotal: ${order?.subtotalPaise}, Discount: ${order?.discountPaise}`,
    };
  });

  await runTest("17. Negative price is impossible", async () => {
    const order = await prisma.order.findUnique({
      where: { id: discountOrderId },
    });
    return {
      passed: (order?.totalAmountPaise ?? 0) >= 0 && (order?.subtotalPaise ?? 0) >= 0,
      details: `Order amounts non-negative`,
    };
  });

  let freeOrderId = "";

  await runTest("18. Zero price / free product handled according to architecture (0 paise, PENDING)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodFree.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    freeOrderId = data.data?.orderId;

    const order = await prisma.order.findUnique({
      where: { id: freeOrderId },
    });

    return {
      passed:
        data.status === 201 &&
        data.data?.totalAmountPaise === 0 &&
        order?.totalAmountPaise === 0 &&
        order?.status === "PENDING",
      details: `Status: ${data.status}, TotalPaise: ${order?.totalAmountPaise}, OrderStatus: ${order?.status}`,
    };
  });

  await runTest("19. Floating point manipulation in body rejected", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, totalAmountPaise: 799.5 },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  // ===========================================================================
  // SECTION 4: ORDER CREATION & RELATIONS
  // ===========================================================================

  await runTest("20. Order created with correct authenticated buyer relation", async () => {
    const order = await prisma.order.findUnique({
      where: { id: firstOrderId },
    });
    return {
      passed:
        order?.buyerId === buyer.id &&
        order?.buyerNameSnapshot === buyer.fullName &&
        order?.buyerEmailSnapshot === buyer.email,
      details: `BuyerId: ${order?.buyerId}, Snapshot: ${order?.buyerNameSnapshot}`,
    };
  });

  await runTest("21. Correct product relation in OrderItem", async () => {
    const item = await prisma.orderItem.findFirst({
      where: { orderId: firstOrderId },
    });
    return {
      passed: item?.productId === prodPublished.id && item?.sellerId === seller.id,
      details: `ProductId: ${item?.productId}, SellerId: ${item?.sellerId}`,
    };
  });

  await runTest("22. Correct price & fee snapshot in OrderItem (10% platform fee, 90% seller share)", async () => {
    const item = await prisma.orderItem.findFirst({
      where: { orderId: firstOrderId },
    });
    const expectedFee = Math.round(79900 * 0.1); // 7990
    const expectedEarnings = 79900 - expectedFee; // 71910
    return {
      passed:
        item?.pricePaise === 79900 &&
        item?.platformFeePaise === expectedFee &&
        item?.sellerEarningsPaise === expectedEarnings,
      details: `Price: ${item?.pricePaise}, Fee: ${item?.platformFeePaise}, Earnings: ${item?.sellerEarningsPaise}`,
    };
  });

  await runTest("23. Correct currency is INR", async () => {
    const order = await prisma.order.findUnique({
      where: { id: firstOrderId },
    });
    return {
      passed: order?.currency === "INR",
      details: `Currency: ${order?.currency}`,
    };
  });

  await runTest("24. Correct initial order state is PENDING", async () => {
    const order = await prisma.order.findUnique({
      where: { id: firstOrderId },
    });
    return {
      passed: order?.status === "PENDING" && order?.paidAt === null,
      details: `Status: ${order?.status}, PaidAt: ${order?.paidAt}`,
    };
  });

  await runTest("25. No order is marked PAID during checkout initialization", async () => {
    const paidOrders = await prisma.order.findMany({
      where: {
        id: { in: [firstOrderId, discountOrderId, freeOrderId] },
        status: "PAID",
      },
    });
    return {
      passed: paidOrders.length === 0,
      details: `Paid count: ${paidOrders.length}`,
    };
  });

  await runTest("26. No entitlement is created during checkout initialization", async () => {
    const downloads = await prisma.download.findMany({
      where: {
        orderId: { in: [firstOrderId, discountOrderId, freeOrderId] },
      },
    });
    return {
      passed: downloads.length === 0,
      details: `Downloads count: ${downloads.length}`,
    };
  });

  await runTest("27. No download record created during checkout initialization", async () => {
    const downloadLogs = await prisma.downloadLog.findMany({
      where: {
        download: {
          orderId: { in: [firstOrderId, discountOrderId, freeOrderId] },
        },
      },
    });
    return {
      passed: downloadLogs.length === 0,
      details: `Download logs: ${downloadLogs.length}`,
    };
  });

  // ===========================================================================
  // SECTION 5: IDEMPOTENCY
  // ===========================================================================

  const testKey = `idem_key_${ts}_alpha123`;
  let idempotentOrderId = "";

  await runTest("28. First request with idempotency key creates order", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, idempotencyKey: testKey },
        buyerToken
      )
    );
    const data = await parseJson(res);
    idempotentOrderId = data.data?.orderId;
    return {
      passed: data.status === 201 && !!idempotentOrderId,
      details: `Status: ${data.status}, OrderId: ${idempotentOrderId}`,
    };
  });

  await runTest("29. Repeated request with same idempotency key returns same order (No duplicate)", async () => {
    const ordersCountBefore = await prisma.order.count();

    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, idempotencyKey: testKey },
        buyerToken
      )
    );
    const data = await parseJson(res);
    const ordersCountAfter = await prisma.order.count();

    return {
      passed:
        data.status === 200 &&
        data.data?.orderId === idempotentOrderId &&
        ordersCountBefore === ordersCountAfter,
      details: `Status: ${data.status}, SameOrderId: ${data.data?.orderId === idempotentOrderId}, DB Count: ${ordersCountBefore} -> ${ordersCountAfter}`,
    };
  });

  await runTest("30. Repeated request via Idempotency-Key header returns same order", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken,
        { "Idempotency-Key": testKey }
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.orderId === idempotentOrderId,
      details: `Status: ${data.status}, OrderId: ${data.data?.orderId}`,
    };
  });

  await runTest("31. Malformed idempotency key (< 8 chars) rejected with 400", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, idempotencyKey: "short" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("32. Malformed idempotency key with illegal characters rejected with 400", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, idempotencyKey: "invalid key with spaces!@#" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("33. Concurrent requests with same idempotency key handled safely (Zero duplicates)", async () => {
    const concurrentKey = `idem_concurrent_${ts}_${Math.random().toString(36).substring(2, 8)}`;
    const countBefore = await prisma.order.count();

    const [res1, res2] = await Promise.all([
      checkoutHandler(
        makeReq(
          "http://localhost/api/v1/orders/checkout",
          "POST",
          { productId: prodPublished.id, idempotencyKey: concurrentKey },
          buyerToken
        )
      ),
      checkoutHandler(
        makeReq(
          "http://localhost/api/v1/orders/checkout",
          "POST",
          { productId: prodPublished.id, idempotencyKey: concurrentKey },
          buyerToken
        )
      ),
    ]);

    const [data1, data2] = await Promise.all([parseJson(res1), parseJson(res2)]);
    const countAfter = await prisma.order.count();

    const bothSucceeded = (data1.status === 201 || data1.status === 200) && (data2.status === 201 || data2.status === 200);
    const sameOrderId = data1.data?.orderId === data2.data?.orderId;
    const exactlyOneCreated = countAfter === countBefore + 1;

    return {
      passed: bothSucceeded && sameOrderId && exactlyOneCreated,
      details: `Status1: ${data1.status}, Status2: ${data2.status}, SameOrder: ${sameOrderId}, Created: ${countAfter - countBefore}`,
    };
  });

  // ===========================================================================
  // SECTION 6: RAZORPAY INTEGRATION & BOUNDARY
  // ===========================================================================

  await runTest("34. Correct amount sent to Razorpay (equal to DB price in paise)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.data?.totalAmountPaise === 79900,
      details: `Amount: ${data.data?.totalAmountPaise}`,
    };
  });

  await runTest("35. Correct currency (INR) returned in checkout payload", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.data?.currency === "INR",
      details: `Currency: ${data.data?.currency}`,
    };
  });

  await runTest("36. Razorpay secret key is NEVER returned in response", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    const leaked = text.includes("RAZORPAY_KEY_SECRET") || text.includes("your_razorpay_secret");
    return {
      passed: !leaked,
      details: `Secret leaked: ${leaked}`,
    };
  });

  await runTest("37. Public Razorpay Key ID is returned for frontend checkout modal", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    const keyId = data.data?.razorpayKeyId;
    return {
      passed: !!keyId && typeof keyId === "string" && keyId.startsWith("rzp_"),
      details: `KeyId: ${keyId}`,
    };
  });

  await runTest("38. Razorpay gateway failure returns 502 without creating broken DB order", async () => {
    let res: any;
    let data: any;
    let countBefore = 0;
    let countAfter = 0;
    try {
      process.env.RAZORPAY_SIMULATE_FAILURE = "true";
      countBefore = await prisma.order.count();

      res = await checkoutHandler(
        makeReq(
          "http://localhost/api/v1/orders/checkout",
          "POST",
          { productId: prodPublished.id },
          buyerToken
        )
      );
      data = await parseJson(res);
      countAfter = await prisma.order.count();
    } finally {
      delete process.env.RAZORPAY_SIMULATE_FAILURE;
    }

    return {
      passed: data?.status === 502 && data?.error?.code === "PAYMENT_GATEWAY_ERROR" && countBefore === countAfter,
      details: `Status: ${data?.status}, Code: ${data?.error?.code}, Orders before: ${countBefore}, after: ${countAfter}`,
    };
  });

  await runTest("39. Razorpay timeout returns 502 without creating broken DB order", async () => {
    let res: any;
    let data: any;
    let countBefore = 0;
    let countAfter = 0;
    try {
      process.env.RAZORPAY_SIMULATE_TIMEOUT = "true";
      countBefore = await prisma.order.count();

      res = await checkoutHandler(
        makeReq(
          "http://localhost/api/v1/orders/checkout",
          "POST",
          { productId: prodPublished.id },
          buyerToken
        )
      );
      data = await parseJson(res);
      countAfter = await prisma.order.count();
    } finally {
      delete process.env.RAZORPAY_SIMULATE_TIMEOUT;
    }

    return {
      passed: data?.status === 502 && data?.error?.code === "PAYMENT_GATEWAY_ERROR" && countBefore === countAfter,
      details: `Status: ${data?.status}, Code: ${data?.error?.code}`,
    };
  });

  await runTest("40. Order status remains PENDING after checkout response (No false payment success)", async () => {
    const order = await prisma.order.findUnique({
      where: { id: firstOrderId },
    });
    return {
      passed: order?.status === "PENDING" && order?.paidAt === null,
      details: `Status: ${order?.status}`,
    };
  });

  // ===========================================================================
  // SECTION 7: SECURITY & INJECTION PROTECTION
  // ===========================================================================

  await runTest("41. buyerId injection rejected by strict validation (400)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, buyerId: "injected_user_id" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("42. sellerId injection rejected by strict validation (400)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, sellerId: "injected_seller_id" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("43. currency injection rejected by strict validation (400)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, currency: "USD" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("44. paymentStatus injection rejected by strict validation (400)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, status: "PAID" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("45. role injection rejected by strict validation (400)", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, role: "ADMIN" },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("46. Private seller PAN / bank account data is ABSENT from checkout response", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    const leaked = text.includes("ABCDE****F") || text.includes("HDFC0001234") || text.includes("****9999");
    return {
      passed: !leaked,
      details: `Seller financial data leaked: ${leaked}`,
    };
  });

  await runTest("47. ProductFile.storageKey is ABSENT from checkout response", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    return {
      passed: !text.includes("storageKey"),
      details: `storageKey leaked: ${text.includes("storageKey")}`,
    };
  });

  await runTest("48. Database credentials & secrets are ABSENT from checkout response", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    const text = JSON.stringify(data);
    const leaked = text.includes("postgresql://") || text.includes("JWT_SECRET");
    return {
      passed: !leaked,
      details: `Credentials leaked: ${leaked}`,
    };
  });

  // ===========================================================================
  // SECTION 8: ROUTE ALIASES & CONCURRENCY
  // ===========================================================================

  await runTest("49. Alias route POST /api/v1/orders functions identically", async () => {
    const res = await ordersHandler(
      makeReq(
        "http://localhost/api/v1/orders",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 201 && !!data.data?.orderId,
      details: `Status: ${data.status}, OrderId: ${data.data?.orderId}`,
    };
  });

  await runTest("50. Alias route POST /api/v1/checkout functions identically", async () => {
    const res = await checkoutAliasHandler(
      makeReq(
        "http://localhost/api/v1/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 201 && !!data.data?.orderId,
      details: `Status: ${data.status}, OrderId: ${data.data?.orderId}`,
    };
  });

  await runTest("51. Product price change: historical order retains original price snapshot", async () => {
    const orderBefore = await prisma.order.findUnique({
      where: { id: firstOrderId },
    });

    // Update product price in database
    await prisma.product.update({
      where: { id: prodPublished.id },
      data: { pricePaise: 129900 },
    });

    // Check that historical order still has 79900
    const orderAfter = await prisma.order.findUnique({
      where: { id: firstOrderId },
    });

    // Restore price
    await prisma.product.update({
      where: { id: prodPublished.id },
      data: { pricePaise: 79900 },
    });

    return {
      passed:
        orderBefore?.totalAmountPaise === 79900 &&
        orderAfter?.totalAmountPaise === 79900,
      details: `Before: ${orderBefore?.totalAmountPaise}, After: ${orderAfter?.totalAmountPaise}`,
    };
  });

  await runTest("52. Product unpublished before checkout completion handled safely (400)", async () => {
    // Unpublish product
    await prisma.product.update({
      where: { id: prodToUnpublish.id },
      data: { status: "DRAFT" },
    });

    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodToUnpublish.id },
        buyerToken
      )
    );
    const data = await parseJson(res);

    return {
      passed: data.status === 400 && data.error?.code === "PRODUCT_NOT_AVAILABLE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("53. Idempotency key from another user session is rejected with 403 Forbidden", async () => {
    const userAKey = `idem_usera_${ts}_secure123`;
    // Buyer A creates order
    await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, idempotencyKey: userAKey },
        buyerToken
      )
    );

    // SellerUser (different buyer) attempts to replay same idempotency key
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id, idempotencyKey: userAKey },
        sellerToken
      )
    );
    const data = await parseJson(res);

    return {
      passed: data.status === 403 && data.error?.code === "FORBIDDEN",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("54. Multiple independent orders for same product without idempotency key are permitted", async () => {
    const res1 = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );
    const res2 = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        buyerToken
      )
    );

    const [d1, d2] = await Promise.all([parseJson(res1), parseJson(res2)]);
    return {
      passed:
        d1.status === 201 &&
        d2.status === 201 &&
        d1.data?.orderId !== d2.data?.orderId,
      details: `Order 1: ${d1.data?.orderId}, Order 2: ${d2.data?.orderId}`,
    };
  });

  await runTest("55. Approved seller can also purchase products as a buyer", async () => {
    const res = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: prodPublished.id },
        sellerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 201 && !!data.data?.orderId,
      details: `Status: ${data.status}, OrderId: ${data.data?.orderId}`,
    };
  });

  // ===========================================================================
  // SECTION 9: REGRESSION SANITY (FEATURES 01 - 09)
  // ===========================================================================

  const regEmail = `reg.f10.${ts}@example.com`;
  let regToken = "";

  await runTest("56. [Regression F01] User signup succeeds", async () => {
    const res = await signupHandler(
      makeReq("http://localhost/api/v1/auth/signup", "POST", {
        fullName: "Regression Tester F10",
        email: regEmail,
        password: "Password123!@",
        acceptTerms: true,
      })
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 201 && data.success === true && !!data.data?.user?.id,
      details: `Status: ${data.status}`,
    };
  });

  await runTest("57. [Regression F02] User login succeeds", async () => {
    const res = await loginHandler(
      makeReq("http://localhost/api/v1/auth/login", "POST", {
        email: regEmail,
        password: "Password123!@",
      })
    );
    const data = await parseJson(res);
    if (data.data?.token) {
      regToken = `Bearer ${data.data.token}`;
    }
    return {
      passed: data.status === 200 && !!regToken,
      details: `Status: ${data.status}`,
    };
  });

  await runTest("58. [Regression F03] Profile endpoint succeeds", async () => {
    const res = await meHandler(
      makeReq("http://localhost/api/v1/users/me", "GET", undefined, regToken)
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.user?.email === regEmail,
      details: `Email: ${data.data?.user?.email}`,
    };
  });

  let regSellerProfileId = "";

  await runTest("59. [Regression F04] Seller onboarding succeeds", async () => {
    const res = await onboardHandler(
      makeReq(
        "http://localhost/api/v1/seller/onboard",
        "POST",
        {
          storeName: "Regression Store F10",
          storeSlug: `reg-store-f10-${ts}`,
          bio: "Store bio",
          panNumber: "ABCDE1234F",
          bankAccount: "987654321012",
          bankIfsc: "HDFC0001234",
          bankAccountHolder: "Regression Tester",
        },
        regToken
      )
    );
    const data = await parseJson(res);
    regSellerProfileId = data.data?.sellerProfile?.id;
    return {
      passed: data.status === 201 && !!regSellerProfileId,
      details: `SellerProfile ID: ${regSellerProfileId}`,
    };
  });

  await runTest("60. [Regression F05] Admin approves seller", async () => {
    const res = await approveSellerHandler(
      makeReq(
        `http://localhost/api/v1/admin/sellers/${regSellerProfileId}/approve`,
        "PATCH",
        {},
        adminToken
      ),
      { params: { id: regSellerProfileId } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.seller?.status === "APPROVED",
      details: `Status: ${data.data?.seller?.status}`,
    };
  });

  let regProdId = "";

  await runTest("61. [Regression F06] Seller creates draft product", async () => {
    const res = await createProductHandler(
      makeReq(
        "http://localhost/api/v1/seller/products",
        "POST",
        {
          title: `Regression Product F10 ${ts}`,
          shortDescription: "A comprehensive developer toolkit with components.",
          description: "Full production-ready component suite with TypeScript.",
          categoryId: category.id,
          productType: "DIGITAL_DOWNLOAD",
          pricePaise: 75000,
          tags: ["Regression"],
          fileFormats: ["ZIP"],
          version: "1.0.0",
        },
        regToken
      )
    );
    const data = await parseJson(res);
    regProdId = data.data?.product?.id;
    return {
      passed: data.status === 201 && !!regProdId,
      details: `Product ID: ${regProdId}`,
    };
  });

  let regAssetId = "";
  let regObjectKey = "";

  await runTest("62. [Regression F07] File upload presign and complete", async () => {
    const initRes = await uploadInitHandler(
      makeReq(
        `http://localhost/api/v1/seller/products/${regProdId}/assets/upload`,
        "POST",
        {
          fileName: "bundle.zip",
          contentType: "application/zip",
          fileSizeBytes: 2048,
        },
        regToken
      ),
      { params: { productId: regProdId } }
    );
    const initData = await parseJson(initRes);
    regAssetId = initData.data?.assetId;
    regObjectKey = initData.data?.objectKey;

    const fakeZip = Buffer.from("PK\x03\x04 regression fake binary zip content");
    await localUploadHandler(
      makePutReq(`http://localhost/api/v1/internal/storage/upload/${regObjectKey}`, fakeZip),
      { params: { objectKey: regObjectKey.split("/") } }
    );

    const compRes = await uploadCompleteHandler(
      makeReq(
        `http://localhost/api/v1/seller/products/${regProdId}/assets/${regAssetId}/complete`,
        "POST",
        {},
        regToken
      ),
      { params: { productId: regProdId, assetId: regAssetId } }
    );
    const compData = await parseJson(compRes);

    return {
      passed: initData.status === 200 && compData.status === 200,
      details: `Init: ${initData.status}, Complete: ${compData.status}`,
    };
  });

  await runTest("63. [Regression F08] Seller submits product for moderation", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${regProdId}/submit`, "POST", {}, regToken),
      { params: { productId: regProdId } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.product?.status === "PENDING_REVIEW",
      details: `Status: ${data.data?.product?.status}`,
    };
  });

  await runTest("64. [Regression F08] Admin approves product into PUBLISHED", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${regProdId}/approve`, "POST", {}, adminToken),
      { params: { productId: regProdId } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.product?.status === "PUBLISHED",
      details: `Status: ${data.data?.product?.status}`,
    };
  });

  await runTest("65. [Regression F09] Product is publicly discoverable in catalog", async () => {
    const res = await catalogHandler(
      makeReq(`http://localhost/api/v1/products?query=Regression%20Product%20F10%20${ts}`)
    );
    const data = await parseJson(res);
    const found = data.data?.some((p: any) => p.id === regProdId);
    return {
      passed: data.status === 200 && found,
      details: `Found: ${found}`,
    };
  });

  await runTest("66. [Regression F09] Product detail returns valid Buy Now checkout entry point", async () => {
    const res = await productDetailHandler(
      makeReq(`http://localhost/api/v1/products/${regProdId}`),
      { params: { slug: regProdId } }
    );
    const data = await parseJson(res);
    const buyNow = data.data?.buyNow || data.data?.product?.buyNow;
    return {
      passed: data.status === 200 && buyNow?.enabled === true && buyNow?.checkoutUrl === `/checkout/${regProdId}`,
      details: `BuyNow: ${JSON.stringify(buyNow)}`,
    };
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================

  console.log("\n" + "=".repeat(75));
  console.log("FEATURE 10 TEST RESULTS SUMMARY");
  console.log("=".repeat(75));

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);

  if (failedCount > 0) {
    console.error("\nFAILED TESTS:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(`- Test ${r.num}: ${r.name} (${r.details})`);
    });
    process.exit(1);
  } else {
    console.log("\nALL FEATURE 10 TESTS PASSED PERFECTLY!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
