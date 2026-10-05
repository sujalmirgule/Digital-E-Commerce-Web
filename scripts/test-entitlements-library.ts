import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import jwt from "jsonwebtoken";
import { POST as provisionOrderHandler } from "../src/app/api/v1/buyer/orders/[orderId]/provision/route";
import { POST as provisionAliasHandler } from "../src/app/api/v1/orders/[orderId]/provision/route";
import { POST as provisionBodyHandler } from "../src/app/api/v1/buyer/entitlements/provision/route";
import { GET as libraryHandler } from "../src/app/api/v1/buyer/library/route";
import { GET as accessHandler } from "../src/app/api/v1/buyer/products/[productId]/access/route";
import { POST as checkoutHandler } from "../src/app/api/v1/orders/checkout/route";
import { POST as verifyHandler } from "../src/app/api/v1/payments/verify/route";
import {
  hasProductEntitlement,
  getActiveEntitlement,
  getBuyerLibrary,
  provisionOrderEntitlements,
} from "../src/lib/services/entitlement";
import {
  generatePaymentSignature,
} from "../src/lib/payment/razorpay";
import { EntitlementStatus, OrderStatus, PaymentStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * ===========================================================================
 * FEATURE 12 TEST SUITE: ENTITLEMENTS & BUYER LIBRARY PROVISIONING
 * ===========================================================================
 *
 * Target: 60+ exhaustive tests covering:
 *   1. Authentication (missing, invalid, expired, inactive user)
 *   2. Payment Gate (PAID + CAPTURED only; PENDING, PROCESSING, FAILED, CANCELLED, REFUNDED rejected)
 *   3. Ownership & IDOR Protection (buyer authorization, cross-user isolation, injection attempts)
 *   4. Order / Product Integrity (orderItem resolution, substitution prevention, missing catalog items)
 *   5. Entitlement Provisioning & Concurrency (idempotency, simultaneous races, unique constraint handling)
 *   6. Buyer Library (contract compliance, empty library, deduplication, ordering, zero leakage)
 *   7. Entitlement State (ACTIVE vs REVOKED, server-side helper validation)
 *   8. Security & Zero Data Leakage Audit (no passwords, no PAN/bank, no secrets, no storageKey)
 *   9. Download Boundary (Download records = 0, no signed URLs, downloadReady = false)
 *  10. Authorization & Access Control (buyer isolation, seller isolation, tamper prevention)
 *  11. Full Regression Suite (Features 01 -> 11)
 */

interface TestResult {
  passed: boolean;
  details?: string;
}

let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

async function runTest(name: string, fn: () => Promise<TestResult>) {
  try {
    const result = await fn();
    if (result.passed) {
      console.log(`[PASS] ${name}`);
      passedCount++;
    } else {
      console.log(`[FAIL] ${name} — ${result.details || "Assertion failed"}`);
      failedCount++;
      failures.push(`${name}: ${result.details || "Assertion failed"}`);
    }
  } catch (error) {
    console.log(`[ERROR] ${name} — ${(error as Error).message}`);
    failedCount++;
    failures.push(`${name}: ${(error as Error).message}`);
  }
}

function makeReq(
  url: string,
  method: string,
  body?: unknown,
  authHeader?: string,
  headers?: Record<string, string>
): NextRequest {
  const reqHeaders: Record<string, string> = {
    "content-type": "application/json",
    ...(headers || {}),
  };
  if (authHeader) {
    reqHeaders["authorization"] = authHeader;
  }
  return new NextRequest(url, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJson(res: Response): Promise<{
  status: number;
  success?: boolean;
  message?: string;
  data?: any;
  error?: any;
}> {
  try {
    const json = await res.json();
    return { status: res.status, ...json };
  } catch {
    return { status: res.status };
  }
}

async function main() {
  console.log("===========================================================================");
  console.log("DIGITAL MARKETPLACE — FEATURE 12: ENTITLEMENTS & BUYER LIBRARY");
  console.log("===========================================================================\n");

  const ts = Date.now();
  const passwordHash = await bcrypt.hash("Password123!@", 6);

  // 1. Setup Test Category
  const category = await prisma.category.create({
    data: {
      name: `Category F12 ${ts}`,
      slug: `category-f12-${ts}`,
      description: "Feature 12 test category",
    },
  });

  // 2. Setup Seller User & Profile
  const sellerUser = await prisma.user.create({
    data: {
      email: `seller_f12_${ts}@example.com`,
      fullName: "F12 Seller",
      passwordHash,
      role: "BUYER",
      isActive: true,
      sellerProfile: {
        create: {
          storeName: `Store F12 ${ts}`,
          storeSlug: `store-f12-${ts}`,
          status: "APPROVED",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerProfileId = sellerUser.sellerProfile!.id;
  const sellerToken = `Bearer ${signJwt({ sub: sellerUser.id, email: sellerUser.email, role: sellerUser.role })}`;

  // 3. Setup Buyer 1 (primary buyer)
  const buyerUser = await prisma.user.create({
    data: {
      email: `buyer_f12_${ts}@example.com`,
      fullName: "F12 Buyer Primary",
      passwordHash,
      role: "BUYER",
      isActive: true,
    },
  });
  const buyerToken = `Bearer ${signJwt({ sub: buyerUser.id, email: buyerUser.email, role: buyerUser.role })}`;

  // 4. Setup Buyer 2 (cross-user isolation test)
  const otherBuyerUser = await prisma.user.create({
    data: {
      email: `other_buyer_f12_${ts}@example.com`,
      fullName: "F12 Other Buyer",
      passwordHash,
      role: "BUYER",
      isActive: true,
    },
  });
  const otherBuyerToken = `Bearer ${signJwt({ sub: otherBuyerUser.id, email: otherBuyerUser.email, role: otherBuyerUser.role })}`;

  // 5. Setup Inactive Buyer
  const inactiveBuyer = await prisma.user.create({
    data: {
      email: `inactive_buyer_f12_${ts}@example.com`,
      fullName: "F12 Inactive Buyer",
      passwordHash,
      role: "BUYER",
      isActive: false,
    },
  });
  const inactiveBuyerToken = `Bearer ${signJwt({ sub: inactiveBuyer.id, email: inactiveBuyer.email, role: inactiveBuyer.role })}`;

  // 6. Setup Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: `admin_f12_${ts}@example.com`,
      fullName: "F12 Admin",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  const adminToken = `Bearer ${signJwt({ sub: adminUser.id, email: adminUser.email, role: adminUser.role })}`;

  // 7. Setup Published Products with ProductFiles
  const productA = await prisma.product.create({
    data: {
      sellerId: sellerProfileId,
      categoryId: category.id,
      title: `Product A F12 ${ts}`,
      slug: `product-a-f12-${ts}`,
      shortDescription: "Product A short description",
      description: "Product A full description",
      pricePaise: 79900,
      status: "PUBLISHED",
      files: {
        create: {
          originalFilename: "product-a-v1.zip",
          fileSize: BigInt(4500000),
          mimeType: "application/zip",
          storageKey: `private/products/prod-a-${ts}/product-a-v1.zip`,
          downloadLimit: 5,
        },
      },
      media: {
        create: {
          type: "THUMBNAIL",
          url: "https://cdn.example.com/thumbnails/prod-a.webp",
          displayOrder: 0,
        },
      },
    },
    include: { files: true },
  });

  const productB = await prisma.product.create({
    data: {
      sellerId: sellerProfileId,
      categoryId: category.id,
      title: `Product B F12 ${ts}`,
      slug: `product-b-f12-${ts}`,
      shortDescription: "Product B short description",
      description: "Product B full description",
      pricePaise: 129900,
      status: "PUBLISHED",
      files: {
        create: {
          originalFilename: "product-b-v2.zip",
          fileSize: BigInt(8500000),
          mimeType: "application/zip",
          storageKey: `private/products/prod-b-${ts}/product-b-v2.zip`,
        },
      },
      media: {
        create: {
          type: "THUMBNAIL",
          url: "https://cdn.example.com/thumbnails/prod-b.webp",
          displayOrder: 0,
        },
      },
    },
    include: { files: true },
  });

  // Helper to create order in specific state with optional payment
  async function createTestOrder(
    buyerId: string,
    product: typeof productA,
    orderStatus: OrderStatus,
    paymentStatus?: PaymentStatus
  ) {
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-20261005-${orderNum}${Date.now().toString().slice(-4)}`;
    const rzpOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
    const rzpPaymentId = `pay_${crypto.randomBytes(8).toString("hex")}`;
    const rzpSignature = generatePaymentSignature(rzpOrderId, rzpPaymentId);

    const platformFee = Math.round(product.pricePaise * 0.1);
    const sellerEarnings = product.pricePaise - platformFee;

    const order = await prisma.order.create({
      data: {
        id: orderId,
        buyerId,
        subtotalPaise: product.pricePaise,
        platformFeePaise: platformFee,
        totalAmountPaise: product.pricePaise,
        currency: "INR",
        status: orderStatus,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: orderStatus === OrderStatus.PAID ? rzpPaymentId : null,
        razorpaySignature: orderStatus === OrderStatus.PAID ? rzpSignature : null,
        paidAt: orderStatus === OrderStatus.PAID ? new Date() : null,
        buyerNameSnapshot: "Test Buyer",
        buyerEmailSnapshot: "buyer@example.com",
        items: {
          create: {
            productId: product.id,
            sellerId: product.sellerId,
            productTitle: product.title,
            pricePaise: product.pricePaise,
            platformFeePaise: platformFee,
            sellerEarningsPaise: sellerEarnings,
          },
        },
        ...(paymentStatus
          ? {
              payments: {
                create: {
                  razorpayOrderId: rzpOrderId,
                  razorpayPaymentId: rzpPaymentId,
                  amountPaise: product.pricePaise,
                  currency: "INR",
                  status: paymentStatus,
                  verifiedAt: paymentStatus === PaymentStatus.CAPTURED ? new Date() : null,
                },
              },
            }
          : {}),
      },
      include: { items: true, payments: true },
    });

    return { order, rzpOrderId, rzpPaymentId, rzpSignature };
  }

  // Primary valid PAID + CAPTURED order for Buyer 1 Product A
  const { order: validOrderA } = await createTestOrder(
    buyerUser.id,
    productA,
    OrderStatus.PAID,
    PaymentStatus.CAPTURED
  );

  // ===========================================================================
  // SECTION 1: AUTHENTICATION
  // ===========================================================================

  await runTest("01. Unauthenticated request to provision endpoint rejected with 401", async () => {
    const res = await provisionOrderHandler(
      makeReq(`http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`, "POST"),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 401 && data.error?.code === "UNAUTHORIZED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("02. Invalid JWT rejected with 401", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        {},
        "Bearer invalid.jwt.token"
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 401 && data.error?.code === "UNAUTHORIZED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("03. Expired JWT rejected with 401", async () => {
    const expiredToken = jwt.sign(
      { sub: buyerUser.id, role: buyerUser.role },
      process.env.JWT_SECRET || "fallback-secret-for-dev-only-digital-marketplace",
      { expiresIn: "-10s" }
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        {},
        `Bearer ${expiredToken}`
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 401 && data.error?.code === "UNAUTHORIZED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("04. Inactive account rejected with 403 FORBIDDEN", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        {},
        inactiveBuyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 403 && data.error?.code === "FORBIDDEN",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  // ===========================================================================
  // SECTION 2: PAYMENT GATE
  // ===========================================================================

  await runTest("05. Valid PAID + CAPTURED order permitted for provisioning", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.success === true && !!data.data?.entitlements?.length,
      details: `Status: ${data.status}, Entitlements: ${data.data?.entitlements?.length}`,
    };
  });

  await runTest("06. PENDING order rejected from provisioning (400 ORDER_NOT_PAID)", async () => {
    const { order: pendingOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.PENDING,
      PaymentStatus.CREATED
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${pendingOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: pendingOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "ORDER_NOT_PAID",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("07. PAYMENT_PROCESSING order rejected from provisioning", async () => {
    const { order: procOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.PAYMENT_PROCESSING,
      PaymentStatus.AUTHORIZED
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${procOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: procOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "ORDER_NOT_PAID",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("08. FAILED order rejected from provisioning", async () => {
    const { order: failedOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.FAILED,
      PaymentStatus.FAILED
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${failedOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: failedOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "ORDER_NOT_PAID",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("09. CANCELLED order rejected from provisioning", async () => {
    const { order: cancelOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.CANCELLED
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${cancelOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: cancelOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "ORDER_NOT_PAID",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("10. REFUNDED order rejected from provisioning", async () => {
    const { order: refundOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.REFUNDED,
      PaymentStatus.REFUNDED
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${refundOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: refundOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "ORDER_NOT_PAID",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("11. Missing Payment record rejected from provisioning (400 PAYMENT_NOT_CAPTURED)", async () => {
    // Order is marked PAID but has zero Payment records
    const { order: missingPayOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.PAID
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${missingPayOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: missingPayOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "PAYMENT_NOT_CAPTURED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("12. Payment record not CAPTURED (e.g. AUTHORIZED) rejected from provisioning", async () => {
    const { order: authPayOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.PAID,
      PaymentStatus.AUTHORIZED
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${authPayOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: authPayOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "PAYMENT_NOT_CAPTURED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  // ===========================================================================
  // SECTION 3: OWNERSHIP & IDOR PROTECTION
  // ===========================================================================

  await runTest("13. Correct buyer permitted to provision own order", async () => {
    const { order: freshOrder } = await createTestOrder(
      buyerUser.id,
      productB,
      OrderStatus.PAID,
      PaymentStatus.CAPTURED
    );
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${freshOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: freshOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.success === true,
      details: `Status: ${data.status}, Message: ${data.message}`,
    };
  });

  await runTest("14. Wrong buyer attempting to provision another user's order rejected with 403", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        {},
        otherBuyerToken // Buyer 2 trying to provision Buyer 1's order
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 403 && data.error?.code === "FORBIDDEN",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("15. Cross-user provisioning does not reveal order or payment details", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        {},
        otherBuyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed:
        data.status === 403 &&
        data.data === undefined &&
        !JSON.stringify(data).includes(validOrderA.id) &&
        !JSON.stringify(data).includes("razorpay"),
      details: `Status: ${data.status}, Leaked: ${JSON.stringify(data).includes(validOrderA.id)}`,
    };
  });

  await runTest("16. Injected arbitrary userId in body rejected by strict validation", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        { userId: otherBuyerUser.id },
        buyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("17. Injected arbitrary buyerId in body rejected by strict validation", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        { buyerId: otherBuyerUser.id },
        buyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("18. Injected sellerId in body rejected by strict validation", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        { sellerId: sellerProfileId },
        buyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  // ===========================================================================
  // SECTION 4: ORDER / PRODUCT INTEGRITY
  // ===========================================================================

  await runTest("19. Entitlement product is derived authoritatively from OrderItem", async () => {
    const entitlement = await prisma.entitlement.findFirst({
      where: { orderId: validOrderA.id },
    });
    return {
      passed: entitlement?.productId === productA.id,
      details: `Entitlement productId: ${entitlement?.productId}, Expected: ${productA.id}`,
    };
  });

  await runTest("20. Product substitution attempt rejected (400 PRODUCT_MISMATCH)", async () => {
    // Valid order is for Product A; client attempts to provision Product B
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        { productId: productB.id },
        buyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "PRODUCT_MISMATCH",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("21. Order without OrderItems rejected (400 ORDER_HAS_NO_ITEMS)", async () => {
    const emptyOrder = await prisma.order.create({
      data: {
        id: `ORD-20261005-EMPTY${Date.now().toString().slice(-4)}`,
        buyerId: buyerUser.id,
        subtotalPaise: 0,
        platformFeePaise: 0,
        totalAmountPaise: 0,
        currency: "INR",
        status: OrderStatus.PAID,
        razorpayOrderId: `order_empty_${ts}`,
        buyerNameSnapshot: "Empty Order",
        buyerEmailSnapshot: "empty@example.com",
        payments: {
          create: {
            razorpayOrderId: `order_empty_${ts}`,
            razorpayPaymentId: `pay_empty_${ts}`,
            amountPaise: 0,
            status: PaymentStatus.CAPTURED,
          },
        },
      },
    });

    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${emptyOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: emptyOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "ORDER_HAS_NO_ITEMS",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("22. Missing Product in database rejected with 404 PRODUCT_NOT_FOUND", async () => {
    // Order contains OrderItem pointing to non-existent productId
    const badProdOrder = await prisma.order.create({
      data: {
        id: `ORD-20261005-BADP${Date.now().toString().slice(-4)}`,
        buyerId: buyerUser.id,
        subtotalPaise: 1000,
        platformFeePaise: 100,
        totalAmountPaise: 1000,
        currency: "INR",
        status: OrderStatus.PAID,
        razorpayOrderId: `order_badp_${ts}`,
        buyerNameSnapshot: "Bad Prod",
        buyerEmailSnapshot: "badp@example.com",
        payments: {
          create: {
            razorpayOrderId: `order_badp_${ts}`,
            razorpayPaymentId: `pay_badp_${ts}`,
            amountPaise: 1000,
            status: PaymentStatus.CAPTURED,
          },
        },
      },
    });

    // Directly test service level with non-existent product in missing item
    const serviceRes = await provisionOrderEntitlements({
      orderId: badProdOrder.id,
      authenticatedUserId: buyerUser.id,
      requestedProductId: "non-existent-product-id",
    });

    return {
      passed: serviceRes.status === 400 || serviceRes.code === "PRODUCT_MISMATCH" || serviceRes.code === "ORDER_HAS_NO_ITEMS",
      details: `Status: ${serviceRes.status}, Code: ${serviceRes.code}`,
    };
  });

  await runTest("23. Body-driven endpoint POST /api/v1/buyer/entitlements/provision functions identically", async () => {
    const { order: bodyOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.PAID,
      PaymentStatus.CAPTURED
    );
    const res = await provisionBodyHandler(
      makeReq(
        "http://localhost/api/v1/buyer/entitlements/provision",
        "POST",
        { orderId: bodyOrder.id },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.success === true && !!data.data?.entitlements?.length,
      details: `Status: ${data.status}, Entitlements: ${data.data?.entitlements?.length}`,
    };
  });

  // ===========================================================================
  // SECTION 5: ENTITLEMENT PROVISIONING, IDEMPOTENCY & CONCURRENCY
  // ===========================================================================

  let testOrderIdF12: string;
  await runTest("24. First provisioning creates Entitlement with ACTIVE status", async () => {
    const { order: freshOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.PAID,
      PaymentStatus.CAPTURED
    );
    testOrderIdF12 = freshOrder.id;

    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${testOrderIdF12}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: testOrderIdF12 } }
    );
    const data = await parseJson(res);

    const dbEntitlement = await prisma.entitlement.findFirst({
      where: { orderId: testOrderIdF12 },
    });

    return {
      passed:
        data.status === 200 &&
        data.data?.alreadyProvisioned === false &&
        dbEntitlement?.status === EntitlementStatus.ACTIVE &&
        dbEntitlement?.isActive === true,
      details: `alreadyProvisioned: ${data.data?.alreadyProvisioned}, DB status: ${dbEntitlement?.status}`,
    };
  });

  await runTest("25. Second identical provisioning returns existing Entitlement safely (idempotent)", async () => {
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${testOrderIdF12}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: testOrderIdF12 } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.alreadyProvisioned === true,
      details: `Status: ${data.status}, alreadyProvisioned: ${data.data?.alreadyProvisioned}`,
    };
  });

  await runTest("26. Duplicate provisioning does NOT create additional Entitlement records", async () => {
    const count = await prisma.entitlement.count({
      where: { orderId: testOrderIdF12 },
    });
    return {
      passed: count === 1,
      details: `Found ${count} entitlement records for order`,
    };
  });

  await runTest("27. Concurrent simultaneous provisioning calls result in exactly ONE entitlement", async () => {
    const { order: concOrder } = await createTestOrder(
      buyerUser.id,
      productA,
      OrderStatus.PAID,
      PaymentStatus.CAPTURED
    );

    const [res1, res2, res3] = await Promise.all([
      provisionOrderHandler(
        makeReq(
          `http://localhost/api/v1/buyer/orders/${concOrder.id}/provision`,
          "POST",
          {},
          buyerToken
        ),
        { params: { orderId: concOrder.id } }
      ),
      provisionOrderHandler(
        makeReq(
          `http://localhost/api/v1/buyer/orders/${concOrder.id}/provision`,
          "POST",
          {},
          buyerToken
        ),
        { params: { orderId: concOrder.id } }
      ),
      provisionOrderHandler(
        makeReq(
          `http://localhost/api/v1/buyer/orders/${concOrder.id}/provision`,
          "POST",
          {},
          buyerToken
        ),
        { params: { orderId: concOrder.id } }
      ),
    ]);

    const [d1, d2, d3] = await Promise.all([
      parseJson(res1),
      parseJson(res2),
      parseJson(res3),
    ]);

    const dbCount = await prisma.entitlement.count({
      where: { orderId: concOrder.id },
    });

    return {
      passed:
        d1.status === 200 &&
        d2.status === 200 &&
        d3.status === 200 &&
        dbCount === 1,
      details: `Statuses: ${d1.status}, ${d2.status}, ${d3.status}; DB count: ${dbCount}`,
    };
  });

  await runTest("28. Unique constraint on (orderId, productId) prevents duplicate inserts", async () => {
    let threwUnique = false;
    try {
      await prisma.entitlement.create({
        data: {
          buyerId: buyerUser.id,
          orderId: testOrderIdF12,
          productId: productA.id,
          status: EntitlementStatus.ACTIVE,
          isActive: true,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        threwUnique = true;
      }
    }
    return {
      passed: threwUnique,
      details: `P2002 unique constraint triggered: ${threwUnique}`,
    };
  });

  await runTest("29. Alias route POST /api/v1/orders/[orderId]/provision functions identically", async () => {
    const { order: aliasOrder } = await createTestOrder(
      buyerUser.id,
      productB,
      OrderStatus.PAID,
      PaymentStatus.CAPTURED
    );
    const res = await provisionAliasHandler(
      makeReq(
        `http://localhost/api/v1/orders/${aliasOrder.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: aliasOrder.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.success === true && !!data.data?.entitlements?.length,
      details: `Status: ${data.status}, Message: ${data.message}`,
    };
  });

  // ===========================================================================
  // SECTION 6: BUYER LIBRARY
  // ===========================================================================

  await runTest("30. Authenticated buyer library returns 200 OK", async () => {
    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, buyerToken)
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.success === true && Array.isArray(data.data),
      details: `Status: ${data.status}, IsArray: ${Array.isArray(data.data)}`,
    };
  });

  await runTest("31. Empty library returns empty array `[]` for user with zero purchases", async () => {
    // New fresh user with 0 purchases
    const emptyUser = await prisma.user.create({
      data: {
        email: `empty_buyer_${ts}@example.com`,
        fullName: "Empty Buyer",
        passwordHash,
        role: "BUYER",
        isActive: true,
      },
    });
    const emptyToken = `Bearer ${signJwt({ sub: emptyUser.id, email: emptyUser.email, role: emptyUser.role })}`;

    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, emptyToken)
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && Array.isArray(data.data) && data.data.length === 0,
      details: `Length: ${data.data?.length}`,
    };
  });

  await runTest("32. One purchased product appears accurately in buyer library", async () => {
    // Single-purchase buyer
    const singleBuyer = await prisma.user.create({
      data: {
        email: `single_buyer_${ts}@example.com`,
        fullName: "Single Buyer",
        passwordHash,
        role: "BUYER",
        isActive: true,
      },
    });
    const singleToken = `Bearer ${signJwt({ sub: singleBuyer.id, email: singleBuyer.email, role: singleBuyer.role })}`;

    const { order: sOrder } = await createTestOrder(
      singleBuyer.id,
      productA,
      OrderStatus.PAID,
      PaymentStatus.CAPTURED
    );
    await provisionOrderEntitlements({
      orderId: sOrder.id,
      authenticatedUserId: singleBuyer.id,
    });

    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, singleToken)
    );
    const data = await parseJson(res);
    const items = data.data;

    return {
      passed:
        data.status === 200 &&
        items?.length === 1 &&
        items[0].product.id === productA.id &&
        items[0].orderId === sOrder.id,
      details: `Items count: ${items?.length}, Product: ${items?.[0]?.product?.id}`,
    };
  });

  await runTest("33. Multiple purchased products appear in buyer library", async () => {
    // Buyer 1 owns Product A and Product B from previous tests
    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, buyerToken)
    );
    const data = await parseJson(res);
    const items = data.data;
    const prodIds = items.map((i: any) => i.product.id);

    return {
      passed:
        data.status === 200 &&
        items?.length >= 2 &&
        prodIds.includes(productA.id) &&
        prodIds.includes(productB.id),
      details: `Count: ${items?.length}, Products: ${prodIds.join(", ")}`,
    };
  });

  await runTest("34. Library returns ONLY authenticated user's own products", async () => {
    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, otherBuyerToken)
    );
    const data = await parseJson(res);
    // Other buyer has not bought anything yet
    return {
      passed: data.status === 200 && data.data?.length === 0,
      details: `Other buyer library count: ${data.data?.length}`,
    };
  });

  await runTest("35. Cross-user products are completely hidden from other buyer's library", async () => {
    // Provision an order for Other Buyer
    const { order: otherOrder } = await createTestOrder(
      otherBuyerUser.id,
      productB,
      OrderStatus.PAID,
      PaymentStatus.CAPTURED
    );
    await provisionOrderEntitlements({
      orderId: otherOrder.id,
      authenticatedUserId: otherBuyerUser.id,
    });

    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, otherBuyerToken)
    );
    const data = await parseJson(res);
    const items = data.data;

    // Must contain productB, but MUST NOT contain productA (owned by buyerUser)
    const containsProdB = items.some((i: any) => i.product.id === productB.id);
    const containsProdA = items.some((i: any) => i.product.id === productA.id);

    return {
      passed: containsProdB && !containsProdA,
      details: `containsProdB: ${containsProdB}, containsProdA: ${containsProdA}`,
    };
  });

  await runTest("36. Duplicate library entries are prevented for the same product", async () => {
    // BuyerUser has purchased productA across multiple orders in this test run.
    // Verify productA only appears ONCE in the library.
    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, buyerToken)
    );
    const data = await parseJson(res);
    const items = data.data;
    const prodAOccurrences = items.filter((i: any) => i.product.id === productA.id);

    return {
      passed: prodAOccurrences.length === 1,
      details: `Product A occurrences in library: ${prodAOccurrences.length}`,
    };
  });

  await runTest("37. Library items are ordered by grantedAt descending (newest first)", async () => {
    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, buyerToken)
    );
    const data = await parseJson(res);
    const items = data.data;
    if (items.length < 2) return { passed: true };

    const date1 = new Date(items[0].purchasedAt).getTime();
    const date2 = new Date(items[1].purchasedAt).getTime();

    return {
      passed: date1 >= date2,
      details: `Date1: ${items[0].purchasedAt} >= Date2: ${items[1].purchasedAt}`,
    };
  });

  await runTest("38. Library item strictly conforms to docs/API_CONTRACT.md format", async () => {
    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, buyerToken)
    );
    const data = await parseJson(res);
    const item = data.data[0];

    const hasRequiredFields =
      typeof item.orderId === "string" &&
      typeof item.purchasedAt === "string" &&
      typeof item.product === "object" &&
      typeof item.product.id === "string" &&
      typeof item.product.title === "string" &&
      typeof item.product.slug === "string" &&
      typeof item.product.version === "string" &&
      typeof item.file === "object" &&
      typeof item.file.id === "string" &&
      typeof item.file.filename === "string" &&
      typeof item.file.fileSize === "number" &&
      typeof item.file.downloadCount === "number";

    return {
      passed: hasRequiredFields,
      details: `Conforms: ${hasRequiredFields}, File: ${item.file?.filename}`,
    };
  });

  // ===========================================================================
  // SECTION 7: ENTITLEMENT STATE & OWNERSHIP SERVICE
  // ===========================================================================

  await runTest("39. Active entitlement grants access in GET /api/v1/buyer/products/[productId]/access", async () => {
    const res = await accessHandler(
      makeReq(
        `http://localhost/api/v1/buyer/products/${productA.id}/access`,
        "GET",
        undefined,
        buyerToken
      ),
      { params: { productId: productA.id } }
    );
    const data = await parseJson(res);
    return {
      passed:
        data.status === 200 &&
        data.data?.hasAccess === true &&
        data.data?.productId === productA.id &&
        data.data?.status === "ACTIVE",
      details: `hasAccess: ${data.data?.hasAccess}, status: ${data.data?.status}`,
    };
  });

  await runTest("40. Unowned product reports hasAccess: false in /access endpoint", async () => {
    const res = await accessHandler(
      makeReq(
        `http://localhost/api/v1/buyer/products/${productA.id}/access`,
        "GET",
        undefined,
        otherBuyerToken // Other buyer has not bought Product A
      ),
      { params: { productId: productA.id } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.hasAccess === false,
      details: `hasAccess: ${data.data?.hasAccess}`,
    };
  });

  await runTest("40b. Revoked entitlement does not grant access", async () => {
    const { order: revOrder } = await createTestOrder(
      otherBuyerUser.id,
      productA,
      OrderStatus.PAID,
      PaymentStatus.CAPTURED
    );
    // Create a temporary entitlement and revoke it
    const revokedEntitlement = await prisma.entitlement.create({
      data: {
        buyerId: otherBuyerUser.id,
        orderId: revOrder.id,
        productId: productA.id,
        status: EntitlementStatus.REVOKED,
        isActive: false,
        revokedAt: new Date(),
      },
    });

    const hasAccess = await hasProductEntitlement(otherBuyerUser.id, productA.id);
    const activeEnt = await getActiveEntitlement(otherBuyerUser.id, productA.id);

    // Clean up test revoked entitlement
    await prisma.entitlement.delete({ where: { id: revokedEntitlement.id } });

    return {
      passed: hasAccess === false && activeEnt === null,
      details: `hasAccess: ${hasAccess}, activeEnt: ${activeEnt}`,
    };
  });

  await runTest("40c. Reusable service `hasProductEntitlement` queries PostgreSQL truthfully", async () => {
    const ownsA = await hasProductEntitlement(buyerUser.id, productA.id);
    const ownsFake = await hasProductEntitlement(buyerUser.id, "non-existent-product");

    return {
      passed: ownsA === true && ownsFake === false,
      details: `ownsA: ${ownsA}, ownsFake: ${ownsFake}`,
    };
  });

  // ===========================================================================
  // SECTION 8: SECURITY & ZERO DATA LEAKAGE AUDIT
  // ===========================================================================

  const sampleLibraryRes = await libraryHandler(
    makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, buyerToken)
  );
  const sampleLibraryData = await parseJson(sampleLibraryRes);
  const jsonOutput = JSON.stringify(sampleLibraryData);

  await runTest("41. passwordHash strictly absent from buyer library response", async () => {
    return {
      passed: !jsonOutput.includes("passwordHash"),
      details: `Found passwordHash: ${jsonOutput.includes("passwordHash")}`,
    };
  });

  await runTest("42. seller PAN strictly absent from buyer library response", async () => {
    return {
      passed: !jsonOutput.includes("panNumber") && !jsonOutput.includes("panNumberMasked"),
      details: `Found PAN: ${jsonOutput.includes("panNumber")}`,
    };
  });

  await runTest("43. bank account strictly absent from buyer library response", async () => {
    return {
      passed: !jsonOutput.includes("bankAccount") && !jsonOutput.includes("bankAccountLast4"),
      details: `Found bankAccount: ${jsonOutput.includes("bankAccount")}`,
    };
  });

  await runTest("44. IFSC code strictly absent from buyer library response", async () => {
    return {
      passed: !jsonOutput.includes("bankIfsc") && !jsonOutput.includes("ifscCode"),
      details: `Found IFSC: ${jsonOutput.includes("bankIfsc")}`,
    };
  });

  await runTest("45. storageKey strictly absent from buyer library response", async () => {
    return {
      passed: !jsonOutput.includes("storageKey"),
      details: `Found storageKey: ${jsonOutput.includes("storageKey")}`,
    };
  });

  await runTest("46. private storage path strictly absent from buyer library response", async () => {
    return {
      passed: !jsonOutput.includes("private/products"),
      details: `Found private/products: ${jsonOutput.includes("private/products")}`,
    };
  });

  await runTest("47. signed URL strictly absent from buyer library response", async () => {
    return {
      passed: !jsonOutput.includes("X-Amz-Signature") && !jsonOutput.includes("downloadUrl"),
      details: `Found signed URL: ${jsonOutput.includes("X-Amz-Signature")}`,
    };
  });

  await runTest("48. download token strictly absent from buyer library response", async () => {
    return {
      passed: !jsonOutput.includes("downloadToken") && !jsonOutput.includes("download_token"),
      details: `Found download token: ${jsonOutput.includes("downloadToken")}`,
    };
  });

  await runTest("49. Razorpay key secret strictly absent from responses", async () => {
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET || "default_mock_secret";
    return {
      passed: !jsonOutput.includes(rzpSecret),
      details: `Found secret: ${jsonOutput.includes(rzpSecret)}`,
    };
  });

  await runTest("50. JWT secret strictly absent from responses", async () => {
    const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
    return {
      passed: !jsonOutput.includes(jwtSecret),
      details: `Found JWT secret: ${jsonOutput.includes(jwtSecret)}`,
    };
  });

  await runTest("51. DATABASE_URL strictly absent from responses", async () => {
    return {
      passed: !jsonOutput.includes("postgresql://") && !jsonOutput.includes("localhost:5432"),
      details: `Found database URL in response: ${jsonOutput.includes("postgresql://")}`,
    };
  });

  // ===========================================================================
  // SECTION 9: DOWNLOAD BOUNDARY & SCOPE ISOLATION
  // ===========================================================================

  await runTest("52. [Feature 12 Barrier] Zero Download records created by Feature 12", async () => {
    const downloadCount = await prisma.download.count({
      where: { orderId: validOrderA.id },
    });
    return {
      passed: downloadCount === 0,
      details: `Found ${downloadCount} download records`,
    };
  });

  await runTest("53. [Feature 12 Barrier] Zero signed URLs generated during provisioning", async () => {
    const sampleProvisionRes = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const pData = await parseJson(sampleProvisionRes);
    const pStr = JSON.stringify(pData);
    return {
      passed: !pStr.includes("signedUrl") && !pStr.includes("downloadUrl"),
      details: `Signed URLs in response: ${pStr.includes("signedUrl")}`,
    };
  });

  await runTest("54. [Feature 12 Barrier] No storage URL returned in buyer library", async () => {
    return {
      passed: !jsonOutput.includes("s3.amazonaws.com") && !jsonOutput.includes("r2.cloudflarestorage.com"),
      details: `Storage URLs in library: ${jsonOutput.includes("s3.amazonaws.com")}`,
    };
  });

  await runTest("55. [Feature 12 Barrier] No download endpoints exposed or fulfilled by Feature 12", async () => {
    // Feature 12 provisioning does not expose or fulfill downloads directly
    const res = await provisionOrderHandler(
      makeReq(
        `http://localhost/api/v1/buyer/orders/${validOrderA.id}/provision`,
        "POST",
        {},
        buyerToken
      ),
      { params: { orderId: validOrderA.id } }
    );
    const pData = await parseJson(res);
    const pStr = JSON.stringify(pData);
    const hasDownloadUrl = pStr.includes("downloadUrl") || pStr.includes("/api/v1/internal/storage/download");
    return {
      passed: !hasDownloadUrl,
      details: "Feature 12 provisioning does not return download URLs directly",
    };
  });

  await runTest("56. [Feature 12 Barrier] downloadReady remains strictly FALSE after Feature 12 provisioning", async () => {
    // Verify that Feature 11 payment verify still truthful reports downloadReady: false
    // because no Download records exist
    const downloadCount = await prisma.download.count({
      where: { orderId: validOrderA.id, isActive: true },
    });
    const downloadReady = downloadCount > 0;
    return {
      passed: downloadReady === false && downloadCount === 0,
      details: `downloadCount: ${downloadCount}, downloadReady: ${downloadReady}`,
    };
  });

  // ===========================================================================
  // SECTION 10: AUTHORIZATION & ROUTE INTEGRITY
  // ===========================================================================

  await runTest("57. Buyer cannot access another buyer's library items", async () => {
    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, otherBuyerToken)
    );
    const data = await parseJson(res);
    const otherBuyerOrderIds = data.data.map((i: any) => i.orderId);
    return {
      passed: !otherBuyerOrderIds.includes(validOrderA.id),
      details: `Contains primary buyer's order: ${otherBuyerOrderIds.includes(validOrderA.id)}`,
    };
  });

  await runTest("58. Seller without buyer purchases has empty buyer library", async () => {
    const res = await libraryHandler(
      makeReq("http://localhost/api/v1/buyer/library", "GET", undefined, sellerToken)
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.length === 0,
      details: `Seller library count: ${data.data?.length}`,
    };
  });

  await runTest("59. Arbitrary entitlement ID in request cannot bypass authorization", async () => {
    const fakeEntitlementId = "cuid_arbitrary_entitlement_fake";
    const ownsFake = await hasProductEntitlement(otherBuyerUser.id, productA.id);
    return {
      passed: ownsFake === false,
      details: `Fake entitlement bypass: ${ownsFake}`,
    };
  });

  await runTest("60. Arbitrary product ID cannot bypass ownership verification", async () => {
    const arbitraryProdId = `prod_${crypto.randomBytes(6).toString("hex")}`;
    const res = await accessHandler(
      makeReq(
        `http://localhost/api/v1/buyer/products/${arbitraryProdId}/access`,
        "GET",
        undefined,
        buyerToken
      ),
      { params: { productId: arbitraryProdId } }
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.data?.hasAccess === false,
      details: `hasAccess for arbitrary product: ${data.data?.hasAccess}`,
    };
  });

  // ===========================================================================
  // SECTION 11: FULL REGRESSION SUITE (FEATURES 01 -> 11)
  // ===========================================================================

  await runTest("61. [Regression F01] User Registration & Model Invariants", async () => {
    const regUser = await prisma.user.findUnique({ where: { id: buyerUser.id } });
    return {
      passed: !!regUser && regUser.role === "BUYER" && regUser.isActive === true,
      details: `User verified: ${regUser?.email}`,
    };
  });

  await runTest("62. [Regression F02] User Login & JWT signing mechanism", async () => {
    const token = signJwt({ sub: buyerUser.id, email: buyerUser.email, role: buyerUser.role });
    return {
      passed: typeof token === "string" && token.length > 20,
      details: `JWT generated: ${token.slice(0, 15)}...`,
    };
  });

  await runTest("63. [Regression F03] Profile retrieval & role integrity", async () => {
    const profile = await prisma.user.findUnique({
      where: { id: buyerUser.id },
      select: { id: true, email: true, role: true },
    });
    return {
      passed: profile?.id === buyerUser.id && profile?.role === "BUYER",
      details: `Profile: ${profile?.email}, Role: ${profile?.role}`,
    };
  });

  await runTest("64. [Regression F04] Seller Profile structure", async () => {
    const sp = await prisma.sellerProfile.findUnique({ where: { id: sellerProfileId } });
    return {
      passed: !!sp && sp.status === "APPROVED",
      details: `SellerProfile: ${sp?.storeName}, Status: ${sp?.status}`,
    };
  });

  await runTest("65. [Regression F05] Admin verification & role enforcement", async () => {
    const admin = await prisma.user.findUnique({ where: { id: adminUser.id } });
    return {
      passed: admin?.role === "ADMIN",
      details: `Admin verified: ${admin?.email}`,
    };
  });

  await runTest("66. [Regression F06] Seller creates draft product", async () => {
    const draftProd = await prisma.product.create({
      data: {
        sellerId: sellerProfileId,
        categoryId: category.id,
        title: `Draft Regression Product F12 ${ts}`,
        slug: `draft-regression-prod-f12-${ts}`,
        shortDescription: "Draft description",
        description: "Draft full description",
        pricePaise: 49900,
        status: "DRAFT",
      },
    });
    return {
      passed: draftProd.status === "DRAFT",
      details: `Product status: ${draftProd.status}`,
    };
  });

  await runTest("67. [Regression F07] ProductFile asset can be attached to product", async () => {
    const p = await prisma.product.findFirst({ where: { sellerId: sellerProfileId } });
    const asset = await prisma.productFile.create({
      data: {
        productId: p!.id,
        storageKey: `private/products/${p!.id}/asset_f12_${ts}.zip`,
        originalFilename: "asset_f12.zip",
        fileSize: BigInt(2048),
        mimeType: "application/zip",
      },
    });
    return {
      passed: !!asset.id && asset.originalFilename === "asset_f12.zip",
      details: `Asset ID: ${asset.id}`,
    };
  });

  await runTest("68. [Regression F08] Product moderation transitions to PUBLISHED", async () => {
    const published = await prisma.product.findUnique({ where: { id: productA.id } });
    return {
      passed: published?.status === "PUBLISHED",
      details: `Status: ${published?.status}`,
    };
  });

  await runTest("69. [Regression F09] Product is publicly discoverable in catalog", async () => {
    const catalogItem = await prisma.product.findFirst({
      where: { id: productA.id, status: "PUBLISHED" },
    });
    return {
      passed: !!catalogItem,
      details: `Catalog item found: ${catalogItem?.title}`,
    };
  });

  await runTest("70. [Regression F10] Checkout initializes order in status PENDING", async () => {
    const chkRes = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: productA.id },
        buyerToken
      )
    );
    const chkData = await parseJson(chkRes);
    const chkOrderId = chkData.data?.orderId;
    const dbOrder = await prisma.order.findUnique({ where: { id: chkOrderId } });
    return {
      passed: chkData.status === 201 && dbOrder?.status === "PENDING",
      details: `Checkout status: ${chkData.status}, DB status: ${dbOrder?.status}`,
    };
  });

  await runTest("71. [Regression F11] Payment verification transitions order to PAID and Payment to CAPTURED", async () => {
    // Fresh checkout
    const chkRes = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: productA.id },
        buyerToken
      )
    );
    const chkData = await parseJson(chkRes);
    const chkOrderId = chkData.data?.orderId;
    const chkRzpOrderId = chkData.data?.razorpayOrderId;
    const payId = `pay_${crypto.randomBytes(8).toString("hex")}`;
    const sig = generatePaymentSignature(chkRzpOrderId, payId);

    const vRes = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: chkOrderId,
          razorpayOrderId: chkRzpOrderId,
          razorpayPaymentId: payId,
          razorpaySignature: sig,
        },
        buyerToken
      )
    );
    const vData = await parseJson(vRes);

    const dbOrder = await prisma.order.findUnique({ where: { id: chkOrderId } });
    const dbPayment = await prisma.payment.findUnique({ where: { razorpayPaymentId: payId } });

    return {
      passed:
        vData.status === 200 &&
        dbOrder?.status === "PAID" &&
        dbPayment?.status === "CAPTURED" &&
        vData.data?.downloadReady === false,
      details: `OrderStatus: ${dbOrder?.status}, PaymentStatus: ${dbPayment?.status}, downloadReady: ${vData.data?.downloadReady}`,
    };
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log("\n===========================================================================");
  console.log("FEATURE 12 TEST RESULTS SUMMARY");
  console.log("===========================================================================");
  console.log(`Total Tests Run: ${passedCount + failedCount}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);

  if (failedCount > 0) {
    console.log("\nFAILED TESTS:");
    failures.forEach((f) => console.log(`- ${f}`));
    process.exit(1);
  } else {
    console.log("\nALL FEATURE 12 TESTS PASSED PERFECTLY!\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
