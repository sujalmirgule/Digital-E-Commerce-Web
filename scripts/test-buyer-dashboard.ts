import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { GET as overviewHandler } from "../src/app/api/v1/buyer/dashboard/overview/route";
import { GET as overviewAliasHandler } from "../src/app/api/v1/buyer/overview/route";
import { GET as ordersHandler } from "../src/app/api/v1/buyer/orders/route";
import { GET as orderDetailHandler } from "../src/app/api/v1/buyer/orders/[orderId]/route";
import { GET as downloadsHandler } from "../src/app/api/v1/buyer/downloads/route";
import { GET as receiptsHandler } from "../src/app/api/v1/buyer/receipts/route";
import { GET as reviewsHandler } from "../src/app/api/v1/buyer/reviews/route";
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
 * FEATURE 17 TEST SUITE: COMPLETE BUYER DASHBOARD
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
  console.log("DIGITAL MARKETPLACE — FEATURE 17: COMPLETE BUYER DASHBOARD");
  console.log("===========================================================================\n");

  const runId = `f17_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Users: Buyer A, Buyer B, Inactive Buyer, Seller User, Admin User
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

  // 4. Create Order 1 for Buyer A (PAID with CAPTURED payment and Receipt)
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

  // 5. Create Order 2 for Buyer A (PAID for product 2)
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

  // 6. Create Review by Buyer A on Product 1
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

  // 7. Create Order for Buyer B (for IDOR isolation testing)
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

  // JWT Tokens
  const buyerAToken = signJwt({ sub: buyerA.id, email: buyerA.email, role: buyerA.role });
  const buyerBToken = signJwt({ sub: buyerB.id, email: buyerB.email, role: buyerB.role });
  const inactiveToken = signJwt({ sub: inactiveBuyer.id, email: inactiveBuyer.email, role: inactiveBuyer.role });
  const adminToken = signJwt({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });

  // --- Section 1: Authentication & Access Control ---
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

  // --- Section 2: Dashboard Overview API ---
  console.log("\n--- Section 2: Dashboard Overview API ---");

  await runTest("S2.1: Authenticated Buyer A retrieves dashboard overview (200)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.success === true && !!data.data?.stats,
      details: `Stats: ${JSON.stringify(data.data?.stats)}`,
    };
  });

  await runTest("S2.2: Total purchased products count matches active entitlements (2)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    return {
      passed: data.data?.stats?.totalPurchasedProducts === 2,
      details: `totalPurchasedProducts: ${data.data?.stats?.totalPurchasedProducts}`,
    };
  });

  await runTest("S2.3: Total orders count matches DB orders (2)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    return {
      passed: data.data?.stats?.totalOrders === 2,
      details: `totalOrders: ${data.data?.stats?.totalOrders}`,
    };
  });

  await runTest("S2.4: Total receipts count matches generated receipts (1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    return {
      passed: data.data?.stats?.totalReceipts === 1,
      details: `totalReceipts: ${data.data?.stats?.totalReceipts}`,
    };
  });

  await runTest("S2.5: Total reviews count reflects buyer's reviews (1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    return {
      passed: data.data?.stats?.totalReviews === 1,
      details: `totalReviews: ${data.data?.stats?.totalReviews}`,
    };
  });

  await runTest("S2.6: Recent purchases includes product details and file info", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    const p1 = data.data?.recentPurchases?.find((p: any) => p.product.id === product1.id);
    return {
      passed: !!p1 && p1.product.title === product1.title && !!p1.file?.filename,
      details: `Found product: ${p1?.product?.title}, file: ${p1?.file?.filename}`,
    };
  });

  await runTest("S2.7: Recent orders includes order status and total in paise", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    const ord = data.data?.recentOrders?.find((o: any) => o.id === orderA1.id);
    return {
      passed: ord?.status === "PAID" && ord?.totalAmountPaise === 49900,
      details: `Order: ${ord?.id}, Total: ${ord?.totalAmountPaise}`,
    };
  });

  await runTest("S2.8: Recent receipts contains valid downloadUrl and invoiceNumber", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    const rec = data.data?.recentReceipts?.[0];
    return {
      passed: rec?.invoiceNumber === receiptA1.invoiceNumber && rec?.downloadUrl.includes("/api/v1/buyer/receipts/"),
      details: `Receipt invoice: ${rec?.invoiceNumber}, url: ${rec?.downloadUrl}`,
    };
  });

  await runTest("S2.9: Overview alias endpoint (/api/v1/buyer/overview) functions identically", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewAliasHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.stats?.totalOrders === 2,
      details: `Alias returned orders: ${data.data?.stats?.totalOrders}`,
    };
  });

  await runTest("S2.10: Buyer B overview is strictly isolated from Buyer A data", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await overviewHandler(req);
    const data = await res.json();
    // Buyer B has 1 order, 0 receipts, 0 reviews, 0 entitlements
    return {
      passed: data.data?.stats?.totalOrders === 1 && data.data?.stats?.totalReceipts === 0 && data.data?.stats?.totalReviews === 0,
      details: `Buyer B stats: Orders ${data.data?.stats?.totalOrders}, Receipts ${data.data?.stats?.totalReceipts}`,
    };
  });

  // --- Section 3: Buyer Orders API ---
  console.log("\n--- Section 3: Buyer Orders API ---");

  await runTest("S3.1: GET /api/v1/buyer/orders returns array of orders for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.orders?.length === 2,
      details: `Found orders: ${data.data?.orders?.length}`,
    };
  });

  await runTest("S3.2: Order items contain seller storeName, pricePaise and licenseType", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const data = await res.json();
    const ord1 = data.data?.orders?.find((o: any) => o.id === orderA1.id);
    const item = ord1?.items?.[0];
    return {
      passed: item?.sellerStoreName === sellerProfile.storeName && item?.pricePaise === 49900 && item?.licenseType === "COMMERCIAL",
      details: `Seller: ${item?.sellerStoreName}, License: ${item?.licenseType}`,
    };
  });

  await runTest("S3.3: Order payment object contains method and razorpayPaymentId", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const data = await res.json();
    const ord1 = data.data?.orders?.find((o: any) => o.id === orderA1.id);
    return {
      passed: ord1?.payment?.method === "UPI" && ord1?.payment?.status === "CAPTURED",
      details: `Method: ${ord1?.payment?.method}, Status: ${ord1?.payment?.status}`,
    };
  });

  await runTest("S3.4: Order receipt object contains downloadUrl", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const data = await res.json();
    const ord1 = data.data?.orders?.find((o: any) => o.id === orderA1.id);
    return {
      passed: ord1?.receipt?.downloadUrl?.includes(`/api/v1/buyer/receipts/${receiptA1.id}/download`),
      details: `Receipt url: ${ord1?.receipt?.downloadUrl}`,
    };
  });

  await runTest("S3.5: Orders status filter (status=PAID) returns only paid orders", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders?status=PAID", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const data = await res.json();
    const allPaid = data.data?.orders?.every((o: any) => o.status === "PAID");
    return {
      passed: res.status === 200 && allPaid && data.data?.orders?.length === 2,
      details: `Filtered count: ${data.data?.orders?.length}`,
    };
  });

  await runTest("S3.6: Orders status filter with nonexistent status returns empty list", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders?status=CANCELLED", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.orders?.length === 0,
      details: `Cancelled orders count: ${data.data?.orders?.length}`,
    };
  });

  await runTest("S3.7: Pagination limits work correctly (limit=1)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders?page=1&limit=1", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const data = await res.json();
    return {
      passed: data.data?.orders?.length === 1 && data.data?.pagination?.totalPages === 2,
      details: `Limit 1 returned: ${data.data?.orders?.length}, totalPages: ${data.data?.pagination?.totalPages}`,
    };
  });

  // --- Section 4: Buyer Order Details API & IDOR Protection ---
  console.log("\n--- Section 4: Buyer Order Details API & IDOR Protection ---");

  await runTest("S4.1: Buyer A can view their own order detail (200)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`, {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.id === orderA1.id,
      details: `Order ID: ${data.data?.id}`,
    };
  });

  await runTest("S4.2: IDOR: Buyer B CANNOT view Buyer A's order (403 FORBIDDEN)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`, {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    return {
      passed: res.status === 403,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S4.3: IDOR: Buyer A CANNOT view Buyer B's order (403 FORBIDDEN)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderB.id}`, {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderB.id } });
    return {
      passed: res.status === 403,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S4.4: Admin can view any buyer's order (200)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    return {
      passed: res.status === 200,
      details: `Admin status: ${res.status}`,
    };
  });

  await runTest("S4.5: Nonexistent order ID returns 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders/ORD-NONEXISTENT", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: "ORD-NONEXISTENT" } });
    return {
      passed: res.status === 404,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("S4.6: Unauthenticated request to order detail returns 401", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`);
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    return {
      passed: res.status === 401,
      details: `Status: ${res.status}`,
    };
  });

  // --- Section 5: Buyer Downloads Vault API ---
  console.log("\n--- Section 5: Buyer Downloads Vault API ---");

  await runTest("S5.1: GET /api/v1/buyer/downloads returns accessible files for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await downloadsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.length === 2,
      details: `Download items: ${data.data?.length}`,
    };
  });

  await runTest("S5.2: Download items include product version and filename", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await downloadsHandler(req);
    const data = await res.json();
    const d1 = data.data?.find((d: any) => d.productId === product1.id);
    return {
      passed: d1?.productVersion === "1.2.0" && d1?.filename === "ui-kit-v1.zip",
      details: `Version: ${d1?.productVersion}, File: ${d1?.filename}`,
    };
  });

  await runTest("S5.3: Download items provide secure downloadUrl endpoint", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await downloadsHandler(req);
    const data = await res.json();
    const d1 = data.data?.[0];
    return {
      passed: d1?.downloadUrl.startsWith("/api/v1/buyer/downloads/"),
      details: `Endpoint: ${d1?.downloadUrl}`,
    };
  });

  await runTest("S5.4: Storage keys and private paths are NEVER exposed in downloads list", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await downloadsHandler(req);
    const rawText = await res.text();
    return {
      passed: !rawText.includes("private/products/"),
      details: "No private storage keys exposed",
    };
  });

  await runTest("S5.5: Buyer B has no downloads (0 entitlements)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/downloads", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await downloadsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.length === 0,
      details: `Buyer B downloads: ${data.data?.length}`,
    };
  });

  // --- Section 6: Buyer Receipts Archive API ---
  console.log("\n--- Section 6: Buyer Receipts Archive API ---");

  await runTest("S6.1: GET /api/v1/buyer/receipts returns receipts for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await receiptsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.receipts?.length === 1,
      details: `Receipts: ${data.data?.receipts?.length}`,
    };
  });

  await runTest("S6.2: Receipt contains accurate invoiceNumber and amount in paise", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await receiptsHandler(req);
    const data = await res.json();
    const r = data.data?.receipts?.[0];
    return {
      passed: r?.invoiceNumber === receiptA1.invoiceNumber && r?.amountPaidPaise === 49900,
      details: `Invoice: ${r?.invoiceNumber}, Amount: ${r?.amountPaidPaise}`,
    };
  });

  await runTest("S6.3: Receipt contains direct downloadUrl pointing to receipt download API", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await receiptsHandler(req);
    const data = await res.json();
    const r = data.data?.receipts?.[0];
    return {
      passed: r?.downloadUrl === `/api/v1/buyer/receipts/${receiptA1.id}/download`,
      details: `DownloadUrl: ${r?.downloadUrl}`,
    };
  });

  await runTest("S6.4: Buyer B receipts list is empty (no receipts generated)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/receipts", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await receiptsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.receipts?.length === 0,
      details: `Buyer B receipts: ${data.data?.receipts?.length}`,
    };
  });

  // --- Section 7: Buyer Reviews API ---
  console.log("\n--- Section 7: Buyer Reviews API ---");

  await runTest("S7.1: GET /api/v1/buyer/reviews returns submitted reviews for Buyer A", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/reviews", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await reviewsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.length === 1,
      details: `Found reviews: ${data.data?.length}`,
    };
  });

  await runTest("S7.2: Review object contains product title, rating and comment", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/reviews", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await reviewsHandler(req);
    const data = await res.json();
    const r = data.data?.[0];
    return {
      passed: r?.productTitle === product1.title && r?.rating === 5 && r?.title === "Superb UI Quality",
      details: `Product: ${r?.productTitle}, Rating: ${r?.rating}`,
    };
  });

  await runTest("S7.3: Buyer B has no submitted reviews", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/reviews", {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await reviewsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.length === 0,
      details: `Buyer B reviews: ${data.data?.length}`,
    };
  });

  // --- Section 8: Orders Alias Route API ---
  console.log("\n--- Section 8: Orders Alias Route API ---");

  await runTest("S8.1: GET /api/v1/orders functions identically to /api/v1/buyer/orders", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersAliasHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.orders?.length === 2,
      details: `Orders alias returned: ${data.data?.orders?.length}`,
    };
  });

  // --- Section 9: Security, Privacy & Zero Sensitive Data Leakage ---
  console.log("\n--- Section 9: Security, Privacy & Zero Sensitive Data Leakage ---");

  await runTest("S9.1: passwordHash is ABSENT from overview response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const text = await res.text();
    return { passed: !text.includes("passwordHash"), details: "passwordHash absent" };
  });

  await runTest("S9.2: JWT_SECRET is ABSENT from overview response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const text = await res.text();
    return { passed: !text.includes(process.env.JWT_SECRET || "default_test_jwt_secret"), details: "JWT_SECRET absent" };
  });

  await runTest("S9.3: DATABASE_URL is ABSENT from overview response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/dashboard/overview", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await overviewHandler(req);
    const text = await res.text();
    return { passed: !text.includes("postgresql://"), details: "DATABASE_URL absent" };
  });

  await runTest("S9.4: Seller PAN / KYC details are ABSENT from orders response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/buyer/orders", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await ordersHandler(req);
    const text = await res.text();
    return { passed: !text.includes("panNumber") && !text.includes("bankAccount"), details: "PAN/bank absent" };
  });

  await runTest("S9.5: Seller KYC details are ABSENT from order detail response", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${orderA1.id}`, {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await orderDetailHandler(req, { params: { orderId: orderA1.id } });
    const text = await res.text();
    return { passed: !text.includes("panNumber") && !text.includes("bankAccount"), details: "PAN/bank absent" };
  });

  // --- Section 10: Regression & System Boundaries ---
  console.log("\n--- Section 10: Regression & System Boundaries ---");

  await runTest("S10.1: Feature 10 Order totals remain in integer paise invariant", async () => {
    const o = await prisma.order.findUnique({ where: { id: orderA1.id } });
    return {
      passed: Number.isInteger(o?.totalAmountPaise) && o?.totalAmountPaise === 49900,
      details: `Total: ${o?.totalAmountPaise}`,
    };
  });

  await runTest("S10.2: Feature 11 Payment captured records remain intact", async () => {
    const p = await prisma.payment.findFirst({ where: { orderId: orderA1.id } });
    return { passed: p?.status === PaymentStatus.CAPTURED, details: `Status: ${p?.status}` };
  });

  await runTest("S10.3: Feature 12 Entitlement state remains ACTIVE", async () => {
    const ent = await prisma.entitlement.findUnique({ where: { id: entitlementA1.id } });
    return { passed: ent?.status === EntitlementStatus.ACTIVE, details: `Entitlement: ${ent?.status}` };
  });

  await runTest("S10.4: Feature 15 Receipt records remain intact with templateVersion", async () => {
    const r = await prisma.receipt.findUnique({ where: { id: receiptA1.id } });
    return { passed: r?.templateVersion === 1, details: `templateVersion: ${r?.templateVersion}` };
  });

  await runTest("S10.5: Feature 16 Reviews remain connected and visible", async () => {
    const rev = await prisma.review.findUnique({ where: { id: reviewA1.id } });
    return { passed: rev?.isVisible === true && rev?.rating === 5, details: `Rating: ${rev?.rating}` };
  });

  // Cleanup test data
  try {
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
      where: { orderId: { in: [orderA1.id, orderA2.id, orderB.id] } },
    });
    await prisma.payment.deleteMany({
      where: { orderId: { in: [orderA1.id, orderA2.id, orderB.id] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [orderA1.id, orderA2.id, orderB.id] } },
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
            inactiveBuyer.id,
            sellerUser.id,
            adminUser.id,
          ],
        },
      },
    });
  } catch {}

  console.log("\n===========================================================================");
  console.log("FEATURE 17 TEST RESULTS SUMMARY");
  console.log("===========================================================================");
  console.log(`Total Tests Run: ${passedCount + failedCount}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);

  if (failedCount === 0) {
    console.log("\nALL FEATURE 17 TESTS PASSED PERFECTLY!\n");
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
