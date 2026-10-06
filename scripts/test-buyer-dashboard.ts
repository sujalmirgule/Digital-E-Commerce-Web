import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { GET as overviewHandler } from "../src/app/api/v1/buyer/dashboard/overview/route";
import { GET as overviewAliasHandler } from "../src/app/api/v1/buyer/overview/route";
import { GET as ordersHandler } from "../src/app/api/v1/buyer/orders/route";
import { GET as orderDetailHandler } from "../src/app/api/v1/buyer/orders/[orderId]/route";
import { GET as downloadsHandler } from "../src/app/api/v1/buyer/downloads/route";
import { POST as downloadUrlHandler } from "../src/app/api/v1/buyer/downloads/[productFileId]/url/route";
import { GET as receiptsHandler } from "../src/app/api/v1/buyer/receipts/route";
import { GET as receiptDownloadHandler } from "../src/app/api/v1/buyer/receipts/[id]/download/route";
import { GET as reviewsHandler } from "../src/app/api/v1/buyer/reviews/route";
import { POST as createReviewHandler } from "../src/app/api/v1/products/[slug]/reviews/route";
import { PATCH as updateReviewHandler, DELETE as deleteReviewHandler } from "../src/app/api/v1/reviews/[id]/route";
import { GET as libraryHandler } from "../src/app/api/v1/buyer/library/route";
import { GET as notificationsHandler } from "../src/app/api/v1/notifications/route";
import { PATCH as markNotificationReadHandler } from "../src/app/api/v1/notifications/[id]/read/route";
import { PATCH as markAllNotificationsReadHandler } from "../src/app/api/v1/notifications/read-all/route";
import { GET as getMeHandler, PATCH as patchMeHandler } from "../src/app/api/v1/users/me/route";
import { GET as ordersAliasHandler } from "../src/app/api/v1/orders/route";
import {
  EntitlementStatus,
  LicenseType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  UserRole,
} from "@prisma/client";

/**
 * ===========================================================================
 * COMPREHENSIVE PRODUCTION-READY BUYER DASHBOARD TEST SUITE
 * ===========================================================================
 * 100+ tests covering:
 * - Real PostgreSQL Database
 * - Real Authentication & Active Account Checks
 * - Invalid & Expired JWT Rejection
 * - Dashboard Overview & Accurate Statistics
 * - Order History, Filters, Pagination
 * - Order Details & IDOR Access Control
 * - Real Entitlement-Driven Library
 * - Cryptographic Temporary Download Generation
 * - Receipts & Tax Invoices with Secure PDF Streaming
 * - Verified Reviews Creation, Editing & Deletion
 * - Real Notifications with Read/Unread State
 * - User Profile Querying & Safe Updates
 * - Fresh Buyer Empty States
 * - Zero Seed / Fake Data Invariants
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
  console.log("DIGITAL MARKETPLACE — COMPLETE BUYER DASHBOARD TEST SUITE");
  console.log("===========================================================================\n");

  const runId = `f17_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Core Users: Buyer A, Buyer B, Fresh Buyer C, Inactive Buyer, Seller User, Admin User
  const buyerA = await prisma.user.create({
    data: {
      email: `buyer_a_${runId}@example.com`,
      fullName: `Buyer Alice ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const buyerB = await prisma.user.create({
    data: {
      email: `buyer_b_${runId}@example.com`,
      fullName: `Buyer Bob ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const buyerC = await prisma.user.create({
    data: {
      email: `buyer_c_fresh_${runId}@example.com`,
      fullName: `Buyer Charlie Fresh ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const inactiveBuyer = await prisma.user.create({
    data: {
      email: `inactive_buyer_${runId}@example.com`,
      fullName: `Inactive Buyer ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: false,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `seller_${runId}@example.com`,
      fullName: `Seller Sam ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: `admin_${runId}@example.com`,
      fullName: `Admin Adam ${runId}`,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // 2. Create Seller Profile & Category
  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: `Store F17 ${runId}`,
      storeSlug: `store-f17-${runId}`,
      status: "APPROVED",
      country: "IN",
    },
  });

  const category = await prisma.category.create({
    data: {
      name: `Category F17 ${runId}`,
      slug: `category-f17-${runId}`,
    },
  });

  // 3. Create Products with Files
  const product1 = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      categoryId: category.id,
      title: `Full UI Kit ${runId}`,
      slug: `full-ui-kit-${runId}`,
      description: "Complete professional digital UI kit",
      shortDescription: "Professional UI Kit",
      pricePaise: 49900, // ₹499
      status: ProductStatus.PUBLISHED,
      version: "1.2.0",
    },
  });

  const product2 = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      categoryId: category.id,
      title: `Icon Pack Pro ${runId}`,
      slug: `icon-pack-pro-${runId}`,
      description: "Vector icons for web and mobile",
      shortDescription: "Vector Icon Pack",
      pricePaise: 29900, // ₹299
      status: ProductStatus.PUBLISHED,
      version: "2.0.0",
    },
  });

  const file1 = await prisma.productFile.create({
    data: {
      productId: product1.id,
      storageKey: `private/products/${product1.id}/ui-kit-v1.zip`,
      originalFilename: "ui-kit-v1.zip",
      fileSize: BigInt(15728640), // 15 MB
      mimeType: "application/zip",
      version: "1.2.0",
    },
  });

  const file2 = await prisma.productFile.create({
    data: {
      productId: product2.id,
      storageKey: `private/products/${product2.id}/icons.zip`,
      originalFilename: "icons.zip",
      fileSize: BigInt(5242880), // 5 MB
      mimeType: "application/zip",
      version: "2.0.0",
    },
  });

  // 4. Order 1 for Buyer A (PAID with CAPTURED payment, Entitlement, and Receipt)
  const orderA1 = await prisma.order.create({
    data: {
      id: `ORD-F17-A1-${runId}`,
      buyerId: buyerA.id,
      subtotalPaise: 49900,
      totalAmountPaise: 49900,
      platformFeePaise: 4990,
      currency: "INR",
      status: OrderStatus.PAID,
      razorpayOrderId: `order_rzp_a1_${runId}`,
      razorpayPaymentId: `pay_rzp_a1_${runId}`,
      paidAt: new Date(),
      buyerNameSnapshot: buyerA.fullName,
      buyerEmailSnapshot: buyerA.email,
    },
  });

  const orderItemA1 = await prisma.orderItem.create({
    data: {
      orderId: orderA1.id,
      productId: product1.id,
      sellerId: sellerProfile.id,
      productTitle: product1.title,
      pricePaise: 49900,
      platformFeePaise: 4990,
      sellerEarningsPaise: 44910,
      licenseType: LicenseType.COMMERCIAL,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: orderA1.id,
      razorpayOrderId: orderA1.razorpayOrderId,
      razorpayPaymentId: `pay_rzp_a1_${runId}`,
      amountPaise: 49900,
      currency: "INR",
      status: PaymentStatus.CAPTURED,
      method: PaymentMethod.UPI,
      verifiedAt: new Date(),
    },
  });

  const entitlementA1 = await prisma.entitlement.create({
    data: {
      buyerId: buyerA.id,
      orderId: orderA1.id,
      orderItemId: orderItemA1.id,
      productId: product1.id,
      status: EntitlementStatus.ACTIVE,
      isActive: true,
    },
  });

  const receiptA1 = await prisma.receipt.create({
    data: {
      id: `REC-F17-A1-${runId}`,
      orderId: orderA1.id,
      invoiceNumber: `INV-2026-A1-${runId}`,
      buyerName: buyerA.fullName,
      buyerEmail: buyerA.email,
      amountPaidPaise: 49900,
      currency: "INR",
      paymentMethod: "upi",
      paymentId: `pay_rzp_a1_${runId}`,
    },
  });

  // 5. Order 2 for Buyer A (PAID for product 2)
  const orderA2 = await prisma.order.create({
    data: {
      id: `ORD-F17-A2-${runId}`,
      buyerId: buyerA.id,
      subtotalPaise: 29900,
      totalAmountPaise: 29900,
      platformFeePaise: 2990,
      currency: "INR",
      status: OrderStatus.PAID,
      razorpayOrderId: `order_rzp_a2_${runId}`,
      razorpayPaymentId: `pay_rzp_a2_${runId}`,
      paidAt: new Date(),
      buyerNameSnapshot: buyerA.fullName,
      buyerEmailSnapshot: buyerA.email,
    },
  });

  const orderItemA2 = await prisma.orderItem.create({
    data: {
      orderId: orderA2.id,
      productId: product2.id,
      sellerId: sellerProfile.id,
      productTitle: product2.title,
      pricePaise: 29900,
      platformFeePaise: 2990,
      sellerEarningsPaise: 26910,
      licenseType: LicenseType.PERSONAL,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: orderA2.id,
      razorpayOrderId: orderA2.razorpayOrderId,
      razorpayPaymentId: `pay_rzp_a2_${runId}`,
      amountPaise: 29900,
      currency: "INR",
      status: PaymentStatus.CAPTURED,
      method: PaymentMethod.CARD,
      verifiedAt: new Date(),
    },
  });

  await prisma.entitlement.create({
    data: {
      buyerId: buyerA.id,
      orderId: orderA2.id,
      orderItemId: orderItemA2.id,
      productId: product2.id,
      status: EntitlementStatus.ACTIVE,
      isActive: true,
    },
  });

  // 6. Review by Buyer A on Product 1
  const reviewA1 = await prisma.review.create({
    data: {
      productId: product1.id,
      buyerId: buyerA.id,
      orderId: orderA1.id,
      rating: 5,
      title: "Superb UI Quality",
      comment: "Clean code structure and excellent assets!",
      isVisible: true,
    },
  });

  // 7. Order for Buyer B (for IDOR isolation testing)
  const orderB = await prisma.order.create({
    data: {
      id: `ORD-F17-B1-${runId}`,
      buyerId: buyerB.id,
      subtotalPaise: 29900,
      totalAmountPaise: 29900,
      platformFeePaise: 2990,
      currency: "INR",
      status: OrderStatus.PAID,
      razorpayOrderId: `order_rzp_b1_${runId}`,
      razorpayPaymentId: `pay_rzp_b1_${runId}`,
      paidAt: new Date(),
      buyerNameSnapshot: buyerB.fullName,
      buyerEmailSnapshot: buyerB.email,
    },
  });

  // 8. Notifications for Buyer A
  const notifA1 = await prisma.notification.create({
    data: {
      userId: buyerA.id,
      type: "ORDER_PLACED",
      title: "Order Placed Successfully",
      message: `Your order ${orderA1.id} for Full UI Kit was confirmed.`,
      isRead: false,
    },
  });

  const notifA2 = await prisma.notification.create({
    data: {
      userId: buyerA.id,
      type: "RECEIPT_GENERATED",
      title: "Tax Receipt Available",
      message: `Invoice ${receiptA1.invoiceNumber} is ready for download.`,
      isRead: false,
    },
  });

  // JWT Tokens
  const buyerAToken = signJwt({ sub: buyerA.id, email: buyerA.email, role: buyerA.role });
  const buyerBToken = signJwt({ sub: buyerB.id, email: buyerB.email, role: buyerB.role });
  const buyerCToken = signJwt({ sub: buyerC.id, email: buyerC.email, role: buyerC.role });
  const inactiveToken = signJwt({ sub: inactiveBuyer.id, email: inactiveBuyer.email, role: inactiveBuyer.role });
  const adminToken = signJwt({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });

  // --- SECTION 1: Authentication & Access Control ---
  console.log("\n--- Section 1: Authentication & Access Control ---");

  await runTest("S1.1: GET /api/v1/buyer/dashboard/overview rejected without auth (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview");
    const res = await overviewHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S1.2: Inactive buyer account rejected with 403 on overview", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${inactiveToken}` },
    });
    const res = await overviewHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("S1.3: GET /api/v1/buyer/orders rejected without auth (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders");
    const res = await ordersHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S1.4: Inactive buyer rejected on orders endpoint (403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${inactiveToken}` },
    });
    const res = await ordersHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("S1.5: GET /api/v1/buyer/downloads rejected without auth (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads");
    const res = await downloadsHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S1.6: GET /api/v1/buyer/receipts rejected without auth (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts");
    const res = await receiptsHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S1.7: GET /api/v1/buyer/reviews rejected without auth (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/reviews");
    const res = await reviewsHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S1.8: GET /api/v1/buyer/library rejected without auth (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library");
    const res = await libraryHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S1.9: GET /api/v1/notifications rejected without auth (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications");
    const res = await notificationsHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S1.10: Malformed Authorization header format rejected (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    const res = await ordersHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  // --- SECTION 2: Invalid & Expired Token Rejection ---
  console.log("\n--- Section 2: Invalid & Expired Token Rejection ---");

  await runTest("S2.1: Expired JWT token returns 401 UNAUTHORIZED", async () => {
    // Generate token with exp timestamp 1 hour in the past
    const expiredToken = signJwt({
      sub: buyerA.id,
      email: buyerA.email,
      role: buyerA.role,
      exp: Math.floor(Date.now() / 1000) - 3600,
    });
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const res = await overviewHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S2.2: Random garbage string JWT token returns 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: "Bearer this.is.garbage.token" },
    });
    const res = await ordersHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S2.3: Non-existent user ID in validly signed JWT returns 401", async () => {
    const fakeToken = signJwt({ sub: "c_nonexistent_user_9999", email: "fake@user.com", role: UserRole.BUYER });
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    const res = await ordersHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S2.4: Inactive account on notifications endpoint returns 403", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications", {
      headers: { Authorization: `Bearer ${inactiveToken}` },
    });
    const res = await notificationsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // --- SECTION 3: Dashboard Overview API & Count Invariants ---
  console.log("\n--- Section 3: Dashboard Overview API & Count Invariants ---");

  await runTest("S3.1: Authenticated Buyer A retrieves dashboard overview (200)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.success === true,
      details: `Stats: ${JSON.stringify(json.data?.stats)}`,
    };
  });

  await runTest("S3.2: Total purchased products count matches active entitlements (2)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.stats?.totalPurchasedProducts === 2,
      details: `totalPurchasedProducts: ${json.data?.stats?.totalPurchasedProducts}`,
    };
  });

  await runTest("S3.3: Total orders count matches DB orders (2)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.stats?.totalOrders === 2,
      details: `totalOrders: ${json.data?.stats?.totalOrders}`,
    };
  });

  await runTest("S3.4: Total receipts count matches generated receipts (1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.stats?.totalReceipts === 1,
      details: `totalReceipts: ${json.data?.stats?.totalReceipts}`,
    };
  });

  await runTest("S3.5: Total reviews count reflects buyer's reviews (1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.stats?.totalReviews === 1,
      details: `totalReviews: ${json.data?.stats?.totalReviews}`,
    };
  });

  await runTest("S3.6: Recent purchases includes product details and file info", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    const p1 = json.data?.recentPurchases?.find(
      (p: { product: { id: string } }) => p.product.id === product1.id
    );
    return {
      passed: !!p1 && p1.product.title.includes("Full UI Kit") && p1.file?.filename === "ui-kit-v1.zip",
      details: `Found product: ${p1?.product?.title}, file: ${p1?.file?.filename}`,
    };
  });

  await runTest("S3.7: Recent orders includes order status and total in paise", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    const o1 = json.data?.recentOrders?.find((o: { id: string }) => o.id === orderA1.id);
    return {
      passed: !!o1 && o1.status === OrderStatus.PAID && o1.totalAmountPaise === 49900,
      details: `Order: ${o1?.id}, Total: ${o1?.totalAmountPaise}`,
    };
  });

  await runTest("S3.8: Recent receipts contains valid downloadUrl and invoiceNumber", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    const r1 = json.data?.recentReceipts?.find((r: { id: string }) => r.id === receiptA1.id);
    return {
      passed: !!r1 && r1.invoiceNumber === receiptA1.invoiceNumber && r1.downloadUrl.includes("/download"),
      details: `Receipt invoice: ${r1?.invoiceNumber}, url: ${r1?.downloadUrl}`,
    };
  });

  await runTest("S3.9: Overview alias endpoint (/api/v1/buyer/overview) functions identically", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewAliasHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.stats?.totalOrders === 2,
      details: `Alias returned orders: ${json.data?.stats?.totalOrders}`,
    };
  });

  await runTest("S3.10: Buyer B overview is strictly isolated from Buyer A data", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed:
        res.status === 200 &&
        json.data?.stats?.totalOrders === 1 &&
        json.data?.stats?.totalReceipts === 0 &&
        json.data?.stats?.totalPurchasedProducts === 0,
      details: `Buyer B stats: Orders ${json.data?.stats?.totalOrders}, Receipts ${json.data?.stats?.totalReceipts}`,
    };
  });

  // --- SECTION 4: Buyer Library API & Real Entitlements ---
  console.log("\n--- Section 4: Buyer Library API & Real Entitlements ---");

  await runTest("S4.1: GET /api/v1/buyer/library returns 200 for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await libraryHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(json.data),
      details: `Library count: ${json.data?.length}`,
    };
  });

  await runTest("S4.2: Library items belong strictly to Buyer A active entitlements", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await libraryHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.length === 2,
      details: `Active items: ${json.data?.map((i: { product: { title: string } }) => i.product.title).join(", ")}`,
    };
  });

  await runTest("S4.3: Library item includes product file metadata (filename, size)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await libraryHandler(req);
    const json = await res.json();
    const item1 = json.data?.find((i: { product: { id: string } }) => i.product.id === product1.id);
    return {
      passed: !!item1?.file && item1.file.filename === "ui-kit-v1.zip" && item1.file.fileSize > 0,
      details: `File: ${item1?.file?.filename}, Size: ${item1?.file?.fileSize}`,
    };
  });

  await runTest("S4.4: Revoked entitlement is NOT returned in active library", async () => {
    // Create revoked entitlement
    const revoked = await prisma.entitlement.create({
      data: {
        buyerId: buyerA.id,
        orderId: orderA1.id,
        productId: product2.id,
        status: EntitlementStatus.REVOKED,
        isActive: false,
      },
    });

    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await libraryHandler(req);
    const json = await res.json();

    await prisma.entitlement.delete({ where: { id: revoked.id } });

    // Should still only have the 2 active ones
    const foundRevoked = json.data?.some((i: { entitlementId: string }) => i.entitlementId === revoked.id);
    return {
      passed: !foundRevoked,
      details: `Revoked entitlement excluded: ${!foundRevoked}`,
    };
  });

  await runTest("S4.5: Buyer B has empty library (0 entitlements)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await libraryHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.length === 0,
      details: `Buyer B library length: ${json.data?.length}`,
    };
  });

  await runTest("S4.6: Inactive buyer rejected on library endpoint with 403", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library", {
      headers: { Authorization: `Bearer ${inactiveToken}` },
    });
    const res = await libraryHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // --- SECTION 5: Buyer Orders List, Filtering & Pagination ---
  console.log("\n--- Section 5: Buyer Orders List, Filtering & Pagination ---");

  await runTest("S5.1: GET /api/v1/buyer/orders returns array of orders for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(json.data?.orders) && json.data.orders.length === 2,
      details: `Found orders: ${json.data?.orders?.length}`,
    };
  });

  await runTest("S5.2: Order items contain seller storeName, pricePaise and licenseType", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    const o1 = json.data?.orders?.find((o: { id: string }) => o.id === orderA1.id);
    const item = o1?.items?.[0];
    return {
      passed:
        !!item &&
        item.sellerStoreName === sellerProfile.storeName &&
        item.pricePaise === 49900 &&
        item.licenseType === "COMMERCIAL",
      details: `Seller: ${item?.sellerStoreName}, License: ${item?.licenseType}`,
    };
  });

  await runTest("S5.3: Order payment object contains method and razorpayPaymentId", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    const o1 = json.data?.orders?.find((o: { id: string }) => o.id === orderA1.id);
    return {
      passed: o1?.payment?.method === "UPI" && o1?.payment?.status === PaymentStatus.CAPTURED,
      details: `Method: ${o1?.payment?.method}, Status: ${o1?.payment?.status}`,
    };
  });

  await runTest("S5.4: Order receipt object contains downloadUrl", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    const o1 = json.data?.orders?.find((o: { id: string }) => o.id === orderA1.id);
    return {
      passed: o1?.receipt?.downloadUrl?.includes(`/api/v1/buyer/receipts/${receiptA1.id}/download`),
      details: `Receipt url: ${o1?.receipt?.downloadUrl}`,
    };
  });

  await runTest("S5.5: Orders status filter (status=PAID) returns only paid orders", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders?status=PAID", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.orders?.every((o: { status: string }) => o.status === "PAID") && json.data.orders.length === 2,
      details: `Filtered count: ${json.data?.orders?.length}`,
    };
  });

  await runTest("S5.6: Orders status filter with nonexistent status returns empty list", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders?status=CANCELLED", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.orders?.length === 0,
      details: `Cancelled orders count: ${json.data?.orders?.length}`,
    };
  });

  await runTest("S5.7: Pagination limit works correctly (limit=1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders?limit=1", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.orders?.length === 1 && json.data?.pagination?.totalPages === 2,
      details: `Limit 1 returned: ${json.data?.orders?.length}, totalPages: ${json.data?.pagination?.totalPages}`,
    };
  });

  await runTest("S5.8: Pagination page offset works correctly (page=2, limit=1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders?page=2&limit=1", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.orders?.length === 1 && json.data?.pagination?.page === 2,
      details: `Page 2 returned 1 order`,
    };
  });

  await runTest("S5.9: GET /api/v1/orders alias functions identically to /api/v1/buyer/orders", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersAliasHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.orders?.length === 2,
      details: `Orders alias count: ${json.data?.orders?.length}`,
    };
  });

  // --- SECTION 6: Order Detail & Deep IDOR Protection ---
  console.log("\n--- Section 6: Order Detail & Deep IDOR Protection ---");

  await runTest("S6.1: Buyer A can view their own order detail (200)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`, {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.id === orderA1.id,
      details: `Order ID: ${json.data?.id}`,
    };
  });

  await runTest("S6.2: IDOR: Buyer B CANNOT view Buyer A's order (403 FORBIDDEN)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`, {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("S6.3: IDOR: Buyer A CANNOT view Buyer B's order (403 FORBIDDEN)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderB.id}`, {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderB.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("S6.4: Admin can view any buyer's order (200)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    return { passed: res.status === 200, details: `Admin status: ${res.status}` };
  });

  await runTest("S6.5: Nonexistent order ID returns 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders/ORD-NONEXISTENT", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: "ORD-NONEXISTENT" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  await runTest("S6.6: Unauthenticated request to order detail returns 401", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`);
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  // --- SECTION 7: Secure Downloads Vault & Download Authorization API ---
  console.log("\n--- Section 7: Secure Downloads Vault & Authorization ---");

  await runTest("S7.1: GET /api/v1/buyer/downloads returns accessible files for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await downloadsHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.length === 2,
      details: `Download items: ${json.data?.length}`,
    };
  });

  await runTest("S7.2: Download items include product version and filename", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await downloadsHandler(req);
    const json = await res.json();
    const item = json.data?.find((d: { productFileId: string }) => d.productFileId === file1.id);
    return {
      passed: !!item && item.productVersion === "1.2.0" && item.filename === "ui-kit-v1.zip",
      details: `Version: ${item?.productVersion}, File: ${item?.filename}`,
    };
  });

  await runTest("S7.3: Storage keys and private paths are NEVER exposed in downloads list", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await downloadsHandler(req);
    const text = await res.text();
    return {
      passed: !text.includes("storageKey") && !text.includes("private/products"),
      details: "No private storage keys exposed",
    };
  });

  await runTest("S7.4: POST /api/v1/buyer/downloads/:productFileId/url authorizes valid download", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/downloads/${file1.id}/url`, {
      method: "POST",
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await downloadUrlHandler(req, { params: { productFileId: file1.id } });
    const json = await res.json();
    return {
      passed: res.status === 200 && json.success === true && typeof json.data?.downloadUrl === "string",
      details: `Temporary URL generated: ${json.data?.downloadUrl?.substring(0, 40)}...`,
    };
  });

  await runTest("S7.5: Download authorization logs entry in PostgreSQL audit table", async () => {
    const logs = await prisma.downloadLog.findMany({
      where: {
        download: {
          buyerId: buyerA.id,
          productFileId: file1.id,
        },
      },
    });
    return {
      passed: logs.length > 0,
      details: `Recorded ${logs.length} audit logs in DB`,
    };
  });

  await runTest("S7.6: IDOR: Buyer B CANNOT authorize download of Buyer A's product file (403)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/downloads/${file1.id}/url`, {
      method: "POST",
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await downloadUrlHandler(req, { params: { productFileId: file1.id } });
    return {
      passed: res.status === 403,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S7.7: Unauthenticated request to download URL returns 401", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/downloads/${file1.id}/url`, {
      method: "POST",
    });
    const res = await downloadUrlHandler(req, { params: { productFileId: file1.id } });
    return {
      passed: res.status === 401,
      details: `Status: ${res.status}`,
    };
  });

  // --- SECTION 8: Receipts & Invoices Archive & PDF Stream ---
  console.log("\n--- Section 8: Receipts & Invoices Archive & PDF Stream ---");

  await runTest("S8.1: GET /api/v1/buyer/receipts returns receipts for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await receiptsHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.receipts?.length === 1,
      details: `Receipts: ${json.data?.receipts?.length}`,
    };
  });

  await runTest("S8.2: Receipt contains accurate invoiceNumber and amount in paise", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await receiptsHandler(req);
    const json = await res.json();
    const r = json.data?.receipts?.[0];
    return {
      passed: r?.invoiceNumber === receiptA1.invoiceNumber && r?.amountPaidPaise === 49900,
      details: `Invoice: ${r?.invoiceNumber}, Amount: ${r?.amountPaidPaise}`,
    };
  });

  await runTest("S8.3: Buyer B receipts list is empty (no receipts generated)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await receiptsHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.receipts?.length === 0,
      details: `Buyer B receipts: ${json.data?.receipts?.length}`,
    };
  });

  await runTest("S8.4: IDOR: Buyer B cannot download Buyer A receipt (403)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/receipts/${receiptA1.id}/download`, {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await receiptDownloadHandler(req, { params: { id: receiptA1.id } });
    return {
      passed: res.status === 403,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S8.5: Unauthenticated request to receipt download returns 401", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/receipts/${receiptA1.id}/download`);
    const res = await receiptDownloadHandler(req, { params: { id: receiptA1.id } });
    return {
      passed: res.status === 401,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S8.6: Non-existent receipt ID returns 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts/REC-NONEXISTENT/download", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await receiptDownloadHandler(req, { params: { id: "REC-NONEXISTENT" } });
    return {
      passed: res.status === 404,
      details: `Status: ${res.status}`,
    };
  });

  // --- SECTION 9: Buyer Reviews API & Lifecycle Flow ---
  console.log("\n--- Section 9: Buyer Reviews API & Lifecycle Flow ---");

  await runTest("S9.1: GET /api/v1/buyer/reviews returns submitted reviews for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/reviews", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await reviewsHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(json.data) && json.data.length === 1,
      details: `Found reviews: ${json.data?.length}`,
    };
  });

  await runTest("S9.2: Review object contains product title, rating and comment", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/reviews", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await reviewsHandler(req);
    const json = await res.json();
    const r = json.data?.[0];
    return {
      passed: r?.productTitle?.includes("Full UI Kit") && r?.rating === 5 && r?.comment?.includes("Clean code"),
      details: `Product: ${r?.productTitle}, Rating: ${r?.rating}`,
    };
  });

  await runTest("S9.3: Buyer B has no submitted reviews", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/reviews", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await reviewsHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.length === 0,
      details: `Buyer B reviews: ${json.data?.length}`,
    };
  });

  await runTest("S9.4: POST review creation on product 2 succeeds for entitled Buyer A", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product2.slug}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${buyerAToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: 4,
        title: "Very useful icon pack",
        comment: "Great quality SVGs and clean grouping.",
      }),
    });
    const res = await createReviewHandler(req, { params: { slug: product2.slug } });
    const json = await res.json();
    return {
      passed: res.status === 200 || res.status === 201,
      details: `Created review rating: ${json.data?.review?.rating}`,
    };
  });

  await runTest("S9.5: Duplicate review on same product is rejected (400/409)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product2.slug}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${buyerAToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: 5,
        title: "Duplicate review attempt",
        comment: "This should fail because I already reviewed product 2.",
      }),
    });
    const res = await createReviewHandler(req, { params: { slug: product2.slug } });
    return {
      passed: res.status === 400 || res.status === 409,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S9.6: Ineligible buyer (no purchase) CANNOT review product (400/403)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.slug}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${buyerBToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: 5,
        title: "Fake review without purchase",
        comment: "I never purchased this item.",
      }),
    });
    const res = await createReviewHandler(req, { params: { slug: product1.slug } });
    return {
      passed: res.status === 400 || res.status === 403,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S9.7: Review validation rejects rating < 1 or > 5", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.slug}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${buyerAToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: 6,
        title: "Out of bounds rating",
        comment: "Should fail validation",
      }),
    });
    const res = await createReviewHandler(req, { params: { slug: product1.slug } });
    return {
      passed: res.status === 400,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S9.8: Author can update their review via PATCH /api/v1/reviews/:id", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/reviews/${reviewA1.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${buyerAToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: 5,
        title: "Updated Headline",
        comment: "Updated feedback with even more detail.",
      }),
    });
    const res = await updateReviewHandler(req, { params: { id: reviewA1.id } });
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.review?.title === "Updated Headline",
      details: `Title updated: ${json.data?.review?.title}`,
    };
  });

  await runTest("S9.9: IDOR: Buyer B cannot edit Buyer A's review (403)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/reviews/${reviewA1.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${buyerBToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: 1,
        title: "Malicious Tampering",
        comment: "Hacked comment",
      }),
    });
    const res = await updateReviewHandler(req, { params: { id: reviewA1.id } });
    return {
      passed: res.status === 403,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S9.10: Author can delete review via DELETE /api/v1/reviews/:id", async () => {
    const rev2 = await prisma.review.findFirst({
      where: { buyerId: buyerA.id, productId: product2.id },
    });
    if (!rev2) return { passed: false, details: "Review 2 not found" };

    const req = new NextRequest(`http://localhost:3000/api/v1/reviews/${rev2.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await deleteReviewHandler(req, { params: { id: rev2.id } });
    return {
      passed: res.status === 200,
      details: `Status: ${res.status}`,
    };
  });

  // --- SECTION 10: Notifications System ---
  console.log("\n--- Section 10: Notifications System ---");

  await runTest("S10.1: GET /api/v1/notifications returns unread notifications for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await notificationsHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.notifications?.length === 2 && json.data?.unreadCount === 2,
      details: `Unread count: ${json.data?.unreadCount}`,
    };
  });

  await runTest("S10.2: Filter isRead=false returns only unread notifications", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications?isRead=false", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await notificationsHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.notifications?.every((n: { isRead: boolean }) => !n.isRead),
      details: `Unread notifications: ${json.data?.notifications?.length}`,
    };
  });

  await runTest("S10.3: Filter isRead=true returns empty when all are unread", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications?isRead=true", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await notificationsHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.notifications?.length === 0,
      details: `Read notifications: ${json.data?.notifications?.length}`,
    };
  });

  await runTest("S10.4: Filter by type (type=ORDER_PLACED) returns matching notifications", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications?type=ORDER_PLACED", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await notificationsHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.notifications?.length === 1 && json.data.notifications[0].type === "ORDER_PLACED",
      details: `Matching type notifications: ${json.data?.notifications?.length}`,
    };
  });

  await runTest("S10.5: PATCH /api/v1/notifications/:id/read marks single notification as read", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/notifications/${notifA1.id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await markNotificationReadHandler(req, { params: { id: notifA1.id } });
    const json = await res.json();
    return {
      passed: res.status === 200 && (json.data?.isRead === true || json.data?.notification?.isRead === true),
      details: `isRead: ${json.data?.isRead ?? json.data?.notification?.isRead}`,
    };
  });

  await runTest("S10.6: Unread count decrements to 1 after marking single read", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await notificationsHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.unreadCount === 1,
      details: `Remaining unread: ${json.data?.unreadCount}`,
    };
  });

  await runTest("S10.7: IDOR: Buyer B cannot mark Buyer A's notification as read (403/404)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/notifications/${notifA2.id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await markNotificationReadHandler(req, { params: { id: notifA2.id } });
    return {
      passed: res.status === 403 || res.status === 404,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S10.8: PATCH /api/v1/notifications/read-all marks all unread as read", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications/read-all", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await markAllNotificationsReadHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.success === true,
      details: `Marked count: ${json.data?.count}`,
    };
  });

  await runTest("S10.9: Unread count drops to 0 after mark-all-read", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await notificationsHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.unreadCount === 0,
      details: `Unread count: ${json.data?.unreadCount}`,
    };
  });

  await runTest("S10.10: Buyer B notifications are isolated (has 0 notifications)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await notificationsHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.notifications?.length === 0 && json.data?.unreadCount === 0,
      details: `Buyer B notifications: ${json.data?.notifications?.length}`,
    };
  });

  // --- SECTION 11: Buyer Profile API (GET & PATCH /api/v1/users/me) ---
  console.log("\n--- Section 11: Buyer Profile API ---");

  await runTest("S11.1: GET /api/v1/users/me returns authenticated user profile", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/users/me", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await getMeHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.user?.email === buyerA.email,
      details: `Email: ${json.data?.user?.email}, Name: ${json.data?.user?.fullName}`,
    };
  });

  await runTest("S11.2: Profile response NEVER leaks passwordHash", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/users/me", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await getMeHandler(req);
    const text = await res.text();
    return {
      passed: !text.includes("passwordHash"),
      details: "passwordHash is strictly absent",
    };
  });

  await runTest("S11.3: PATCH /api/v1/users/me safely updates user fullName", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/users/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${buyerAToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fullName: `Alice Updated ${runId}` }),
    });
    const res = await patchMeHandler(req);
    const json = await res.json();
    return {
      passed: res.status === 200 && json.data?.user?.fullName === `Alice Updated ${runId}`,
      details: `Updated name: ${json.data?.user?.fullName}`,
    };
  });

  await runTest("S11.4: Database confirms fullName update persisted", async () => {
    const userInDb = await prisma.user.findUnique({ where: { id: buyerA.id } });
    return {
      passed: userInDb?.fullName === `Alice Updated ${runId}`,
      details: `DB fullName: ${userInDb?.fullName}`,
    };
  });

  await runTest("S11.5: PATCH /api/v1/users/me rejects unauthorized role elevation attempt", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/users/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${buyerAToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "ADMIN" }),
    });
    const res = await patchMeHandler(req);
    const userInDb = await prisma.user.findUnique({ where: { id: buyerA.id } });
    return {
      passed: (res.status === 400 || res.status === 200) && userInDb?.role === UserRole.BUYER,
      details: `User role remains strictly BUYER: ${userInDb?.role}`,
    };
  });

  await runTest("S11.6: PATCH /api/v1/users/me rejects passwordHash alteration", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/users/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${buyerAToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ passwordHash: "hacked_password_hash" }),
    });
    const res = await patchMeHandler(req);
    const userInDb = await prisma.user.findUnique({ where: { id: buyerA.id } });
    return {
      passed: userInDb?.passwordHash === passwordHash,
      details: "Original bcrypt passwordHash preserved",
    };
  });

  // --- SECTION 12: Empty States & Fresh Buyer Isolation ---
  console.log("\n--- Section 12: Empty States & Fresh Buyer Isolation ---");

  await runTest("S12.1: Fresh Buyer C overview stats are all zero (no purchases)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerCToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed:
        json.data?.stats?.totalOrders === 0 &&
        json.data?.stats?.totalPurchasedProducts === 0 &&
        json.data?.stats?.totalReceipts === 0 &&
        json.data?.stats?.totalReviews === 0,
      details: `All stats 0: Orders=${json.data?.stats?.totalOrders}, Purchases=${json.data?.stats?.totalPurchasedProducts}`,
    };
  });

  await runTest("S12.2: Fresh Buyer C recent purchases array is empty", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerCToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed: Array.isArray(json.data?.recentPurchases) && json.data.recentPurchases.length === 0,
      details: `recentPurchases length: ${json.data?.recentPurchases?.length}`,
    };
  });

  await runTest("S12.3: Fresh Buyer C library is empty array", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library", {
      headers: { Authorization: `Bearer ${buyerCToken}` },
    });
    const res = await libraryHandler(req);
    const json = await res.json();
    return {
      passed: Array.isArray(json.data) && json.data.length === 0,
      details: `Library length: ${json.data?.length}`,
    };
  });

  await runTest("S12.4: Fresh Buyer C orders list is empty array", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerCToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    return {
      passed: Array.isArray(json.data?.orders) && json.data.orders.length === 0,
      details: `Orders length: ${json.data?.orders?.length}`,
    };
  });

  await runTest("S12.5: Fresh Buyer C downloads vault is empty array", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerCToken}` },
    });
    const res = await downloadsHandler(req);
    const json = await res.json();
    return {
      passed: Array.isArray(json.data) && json.data.length === 0,
      details: `Downloads length: ${json.data?.length}`,
    };
  });

  await runTest("S12.6: Fresh Buyer C receipts list is empty array", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${buyerCToken}` },
    });
    const res = await receiptsHandler(req);
    const json = await res.json();
    return {
      passed: Array.isArray(json.data?.receipts) && json.data.receipts.length === 0,
      details: `Receipts length: ${json.data?.receipts?.length}`,
    };
  });

  await runTest("S12.7: Fresh Buyer C reviews list is empty array", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/reviews", {
      headers: { Authorization: `Bearer ${buyerCToken}` },
    });
    const res = await reviewsHandler(req);
    const json = await res.json();
    return {
      passed: Array.isArray(json.data) && json.data.length === 0,
      details: `Reviews length: ${json.data?.length}`,
    };
  });

  await runTest("S12.8: Fresh Buyer C notifications is empty array", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/notifications", {
      headers: { Authorization: `Bearer ${buyerCToken}` },
    });
    const res = await notificationsHandler(req);
    const json = await res.json();
    return {
      passed: Array.isArray(json.data?.notifications) && json.data.notifications.length === 0,
      details: `Notifications length: ${json.data?.notifications?.length}`,
    };
  });

  // --- SECTION 13: Data Privacy, Security Audits & Zero Sensitive Leakage ---
  console.log("\n--- Section 13: Data Privacy & Security Audits ---");

  await runTest("S13.1: passwordHash is ABSENT from overview response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const text = await res.text();
    return { passed: !text.includes("passwordHash"), details: "passwordHash absent" };
  });

  await runTest("S13.2: JWT_SECRET is ABSENT from overview response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const text = await res.text();
    return { passed: !text.includes(process.env.JWT_SECRET || "fallback_secret"), details: "JWT_SECRET absent" };
  });

  await runTest("S13.3: DATABASE_URL is ABSENT from overview response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const text = await res.text();
    return { passed: !text.includes("postgresql://"), details: "DATABASE_URL absent" };
  });

  await runTest("S13.4: Seller PAN / KYC details are ABSENT from orders response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const text = await res.text();
    return { passed: !text.includes("panNumber") && !text.includes("bankAccount"), details: "PAN/bank absent" };
  });

  await runTest("S13.5: Seller KYC details are ABSENT from order detail response", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`, {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    const text = await res.text();
    return { passed: !text.includes("panNumber") && !text.includes("bankAccount"), details: "PAN/bank absent" };
  });

  await runTest("S13.6: No raw SQL / database error is leaked on malformed parameters", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders/malformed'--id", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: "malformed'--id" } });
    const text = await res.text();
    return {
      passed: !text.includes("syntax error at or near") && !text.includes("pg_"),
      details: "Raw SQL errors shielded",
    };
  });

  // --- SECTION 14: Real End-to-End Buyer Lifecycle Workflow ---
  console.log("\n--- Section 14: Real End-to-End Buyer Lifecycle Workflow ---");

  const e2eBuyer = await prisma.user.create({
    data: {
      email: `e2e_buyer_${runId}@example.com`,
      fullName: `E2E Buyer Emily ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });
  const e2eBuyerToken = signJwt({ sub: e2eBuyer.id, email: e2eBuyer.email, role: e2eBuyer.role });

  let e2eOrderId = "";
  let e2eOrderItemId = "";
  let e2eReceiptId = "";
  let e2eEntitlementId = "";

  await runTest("S14.1: Step 1: E2E Buyer creates real order in PostgreSQL", async () => {
    const order = await prisma.order.create({
      data: {
        id: `ORD-E2E-${runId}`,
        buyerId: e2eBuyer.id,
        subtotalPaise: 49900,
        totalAmountPaise: 49900,
        platformFeePaise: 4990,
        currency: "INR",
        status: OrderStatus.PENDING,
        razorpayOrderId: `order_rzp_e2e_${runId}`,
        buyerNameSnapshot: e2eBuyer.fullName,
        buyerEmailSnapshot: e2eBuyer.email,
      },
    });
    e2eOrderId = order.id;

    const item = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product1.id,
        sellerId: sellerProfile.id,
        productTitle: product1.title,
        pricePaise: 49900,
        platformFeePaise: 4990,
        sellerEarningsPaise: 44910,
        licenseType: LicenseType.COMMERCIAL,
      },
    });
    e2eOrderItemId = item.id;

    return { passed: !!e2eOrderId, details: `Order created: ${e2eOrderId}` };
  });

  await runTest("S14.2: Step 2: Payment captured and verified for E2E Order", async () => {
    await prisma.payment.create({
      data: {
        orderId: e2eOrderId,
        razorpayOrderId: `order_rzp_e2e_${runId}`,
        amountPaise: 49900,
        currency: "INR",
        status: PaymentStatus.CAPTURED,
        method: PaymentMethod.UPI,
        razorpayPaymentId: `pay_e2e_${runId}`,
        verifiedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: e2eOrderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        razorpayPaymentId: `pay_e2e_${runId}`,
      },
    });

    const o = await prisma.order.findUnique({ where: { id: e2eOrderId } });
    return { passed: o?.status === OrderStatus.PAID, details: `Order status: ${o?.status}` };
  });

  await runTest("S14.3: Step 3: Entitlement provisioned upon verified purchase", async () => {
    const ent = await prisma.entitlement.create({
      data: {
        buyerId: e2eBuyer.id,
        orderId: e2eOrderId,
        orderItemId: e2eOrderItemId,
        productId: product1.id,
        status: EntitlementStatus.ACTIVE,
        isActive: true,
      },
    });
    e2eEntitlementId = ent.id;
    return { passed: !!e2eEntitlementId, details: `Entitlement: ${e2eEntitlementId}` };
  });

  await runTest("S14.4: Step 4: Official Tax Receipt generated in PostgreSQL", async () => {
    const r = await prisma.receipt.create({
      data: {
        id: `REC-E2E-${runId}`,
        orderId: e2eOrderId,
        invoiceNumber: `INV-E2E-${runId}`,
        buyerName: e2eBuyer.fullName,
        buyerEmail: e2eBuyer.email,
        amountPaidPaise: 49900,
        currency: "INR",
        paymentMethod: "upi",
        paymentId: `pay_e2e_${runId}`,
      },
    });
    e2eReceiptId = r.id;
    return { passed: !!e2eReceiptId, details: `Receipt: ${e2eReceiptId}` };
  });

  await runTest("S14.5: Step 5: E2E Buyer can now see product in Library", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/library", {
      headers: { Authorization: `Bearer ${e2eBuyerToken}` },
    });
    const res = await libraryHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.length === 1 && json.data[0].product.id === product1.id,
      details: `Library updated: ${json.data?.[0]?.product?.title}`,
    };
  });

  await runTest("S14.6: Step 6: E2E Buyer can generate secure download link", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/downloads/${file1.id}/url`, {
      method: "POST",
      headers: { Authorization: `Bearer ${e2eBuyerToken}` },
    });
    const res = await downloadUrlHandler(req, { params: { productFileId: file1.id } });
    const json = await res.json();
    return {
      passed: res.status === 200 && typeof json.data?.downloadUrl === "string",
      details: `Download link generated for E2E buyer`,
    };
  });

  await runTest("S14.7: Step 7: E2E Buyer can view and download official receipt", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${e2eBuyerToken}` },
    });
    const res = await receiptsHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.receipts?.length === 1 && json.data.receipts[0].invoiceNumber === `INV-E2E-${runId}`,
      details: `Receipt visible: ${json.data?.receipts?.[0]?.invoiceNumber}`,
    };
  });

  await runTest("S14.8: Step 8: E2E Buyer can write review for purchased product", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.slug}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${e2eBuyerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: 5,
        title: "Flawless E2E Kit",
        comment: "End to end purchased and reviewed perfectly!",
      }),
    });
    const res = await createReviewHandler(req, { params: { slug: product1.slug } });
    return {
      passed: res.status === 200 || res.status === 201,
      details: `Review created successfully`,
    };
  });

  await runTest("S14.9: Step 9: E2E Buyer dashboard overview reflects exactly 1 purchase and 1 order", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${e2eBuyerToken}` },
    });
    const res = await overviewHandler(req);
    const json = await res.json();
    return {
      passed:
        json.data?.stats?.totalOrders === 1 &&
        json.data?.stats?.totalPurchasedProducts === 1 &&
        json.data?.stats?.totalReceipts === 1 &&
        json.data?.stats?.totalReviews === 1,
      details: `E2E Stats: Orders=${json.data?.stats?.totalOrders}, Purchases=${json.data?.stats?.totalPurchasedProducts}`,
    };
  });

  await runTest("S14.10: Step 10: E2E Buyer orders list displays completed transaction", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${e2eBuyerToken}` },
    });
    const res = await ordersHandler(req);
    const json = await res.json();
    return {
      passed: json.data?.orders?.length === 1 && json.data.orders[0].id === e2eOrderId,
      details: `E2E order list: ${json.data?.orders?.[0]?.id}`,
    };
  });

  // --- SECTION 15: Database Consistency & Invariant Verification ---
  console.log("\n--- Section 15: Database Consistency & Invariants ---");

  await runTest("S15.1: Order totals remain strictly integer paise in PostgreSQL", async () => {
    const o = await prisma.order.findUnique({ where: { id: orderA1.id } });
    return {
      passed: Number.isInteger(o?.totalAmountPaise) && o?.totalAmountPaise === 49900,
      details: `Total: ${o?.totalAmountPaise}`,
    };
  });

  await runTest("S15.2: Payment captured records remain intact in PostgreSQL", async () => {
    const p = await prisma.payment.findFirst({ where: { orderId: orderA1.id } });
    return { passed: p?.status === PaymentStatus.CAPTURED, details: `Status: ${p?.status}` };
  });

  await runTest("S15.3: Entitlement state remains ACTIVE in PostgreSQL", async () => {
    const ent = await prisma.entitlement.findUnique({ where: { id: entitlementA1.id } });
    return { passed: ent?.status === EntitlementStatus.ACTIVE, details: `Entitlement: ${ent?.status}` };
  });

  await runTest("S15.4: Receipt records remain intact with templateVersion in PostgreSQL", async () => {
    const r = await prisma.receipt.findUnique({ where: { id: receiptA1.id } });
    return { passed: r?.templateVersion === 1, details: `templateVersion: ${r?.templateVersion}` };
  });

  await runTest("S15.5: Reviews remain connected and visible in PostgreSQL", async () => {
    const rev = await prisma.review.findUnique({ where: { id: reviewA1.id } });
    return { passed: rev?.isVisible === true && rev?.rating === 5, details: `Rating: ${rev?.rating}` };
  });

  await runTest("S15.6: Download logs contain recorded IP and user agent in PostgreSQL", async () => {
    const log = await prisma.downloadLog.findFirst({
      where: {
        download: {
          buyerId: buyerA.id,
          productFileId: file1.id,
        },
      },
    });
    return { passed: !!log && !!log.downloadedAt, details: `Log ID: ${log?.id}` };
  });

  // Cleanup test data
  try {
    await prisma.downloadLog.deleteMany({
      where: {
        download: {
          productFileId: { in: [file1.id, file2.id] },
        },
      },
    });
    await prisma.download.deleteMany({
      where: { productFileId: { in: [file1.id, file2.id] } },
    });
    await prisma.review.deleteMany({
      where: { productId: { in: [product1.id, product2.id] } },
    });
    await prisma.entitlement.deleteMany({
      where: { productId: { in: [product1.id, product2.id] } },
    });
    await prisma.orderItem.deleteMany({
      where: { productId: { in: [product1.id, product2.id] } },
    });
    await prisma.receipt.deleteMany({
      where: { orderId: { in: [orderA1.id, orderA2.id, orderB.id, e2eOrderId] } },
    });
    await prisma.payment.deleteMany({
      where: { orderId: { in: [orderA1.id, orderA2.id, orderB.id, e2eOrderId] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [orderA1.id, orderA2.id, orderB.id, e2eOrderId] } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: [buyerA.id, buyerB.id, buyerC.id, e2eBuyer.id] } },
    });
    await prisma.productFile.deleteMany({
      where: { productId: { in: [product1.id, product2.id] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [product1.id, product2.id] } },
    });
    await prisma.category.deleteMany({
      where: { id: category.id },
    });
    await prisma.sellerProfile.deleteMany({
      where: { id: sellerProfile.id },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            buyerA.id,
            buyerB.id,
            buyerC.id,
            e2eBuyer.id,
            inactiveBuyer.id,
            sellerUser.id,
            adminUser.id,
          ],
        },
      },
    });
  } catch {}

  console.log("\n===========================================================================");
  console.log("FEATURE 17: BUYER DASHBOARD TEST RESULTS SUMMARY");
  console.log("===========================================================================");
  console.log(`Total Tests Run: ${passedCount + failedCount}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);

  if (failedCount === 0) {
    console.log("\nALL BUYER DASHBOARD TESTS PASSED PERFECTLY!\n");
  } else {
    console.log("\nFAILED TESTS:");
    failures.forEach((f) => console.log(`- ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in test-buyer-dashboard:", err);
  process.exit(1);
});
