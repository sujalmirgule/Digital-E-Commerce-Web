import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { GET as earningsHandler } from "../src/app/api/v1/seller/earnings/route";
import { GET as adminLedgerHandler } from "../src/app/api/v1/admin/platform/ledger/route";
import { POST as verifyHandler } from "../src/app/api/v1/payments/verify/route";
import {
  generatePaymentSignature,
  generateOrderId,
} from "../src/lib/payment/razorpay";
import { settleSellerEarnings } from "../src/lib/services/seller-earnings";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

/**
 * ===========================================================================
 * FEATURE 14 TEST SUITE: SELLER EARNINGS + PLATFORM LEDGER
 * ===========================================================================
 *
 * 70+ tests covering:
 *   1. Settlement Service — happy path single item
 *   2. Financial invariants (gross = fee + net, 10% commission)
 *   3. Idempotency (second settlement returns existing records)
 *   4. Gate checks (PENDING order, no CAPTURED payment, CANCELLED order)
 *   5. SellerProfile balance accumulation
 *   6. Multi-item order settlement
 *   7. GET /api/v1/seller/earnings — auth, shape, IDOR, pagination
 *   8. GET /api/v1/admin/platform/ledger — auth, shape, filters
 *   9. Integration — verify route triggers settlement
 *  10. Zero data leakage (no PAN, bank, secrets in responses)
 *  11. Feature boundary — no entitlements/downloads created by settlement
 *  12. Regression — earlier feature contracts intact
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
  authHeader?: string
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authHeader) {
    headers["authorization"] = authHeader;
  }
  return new NextRequest(url, {
    method,
    headers,
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("===========================================================================");
  console.log("DIGITAL MARKETPLACE — FEATURE 14: SELLER EARNINGS + PLATFORM LEDGER");
  console.log("===========================================================================\n");

  const ts = Date.now();
  const passwordHash = await bcrypt.hash("Password123!@", 10);

  // ─── Shared fixtures ──────────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      fullName: "Admin F14",
      email: `admin.f14.${ts}@example.com`,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  const adminToken = `Bearer ${signJwt({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" as const })}`;

  // Sellers in this system are BUYER-role users with an APPROVED SellerProfile.
  // getAuthenticatedSeller checks sellerProfile.status=APPROVED, NOT user.role.
  const sellerUserA = await prisma.user.create({
    data: {
      fullName: "Seller Alpha F14",
      email: `seller.a.f14.${ts}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
    },
  });
  const sellerProfileA = await prisma.sellerProfile.create({
    data: {
      userId: sellerUserA.id,
      storeName: "Alpha Store F14",
      storeSlug: `alpha-store-f14-${ts}`,
      status: "APPROVED",
      country: "IN",
    },
  });
  const sellerTokenA = `Bearer ${signJwt({ sub: sellerUserA.id, email: sellerUserA.email, role: "BUYER" })}`;

  const sellerUserB = await prisma.user.create({
    data: {
      fullName: "Seller Beta F14",
      email: `seller.b.f14.${ts}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
    },
  });
  const sellerProfileB = await prisma.sellerProfile.create({
    data: {
      userId: sellerUserB.id,
      storeName: "Beta Store F14",
      storeSlug: `beta-store-f14-${ts}`,
      status: "APPROVED",
      country: "IN",
    },
  });
  const sellerTokenB = `Bearer ${signJwt({ sub: sellerUserB.id, email: sellerUserB.email, role: "BUYER" })}`;

  const buyerUser = await prisma.user.create({
    data: {
      fullName: "Buyer F14",
      email: `buyer.f14.${ts}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
    },
  });
  const buyerToken = `Bearer ${signJwt({ sub: buyerUser.id, email: buyerUser.email, role: "BUYER" as const })}`;

  // Create a category
  const category = await prisma.category.create({
    data: {
      name: `F14 Category ${ts}`,
      slug: `f14-cat-${ts}`,
      isActive: true,
    },
  });

  // Products for each seller
  const productA = await prisma.product.create({
    data: {
      title: "Premium Plugin Alpha F14",
      slug: `premium-plugin-alpha-f14-${ts}`,
      shortDescription: "Premium plugin for testing F14",
      description: "Test product for seller A",
      pricePaise: 79900,
      sellerId: sellerProfileA.id,
      categoryId: category.id,
      status: "PUBLISHED",
    },
  });

  const productA2 = await prisma.product.create({
    data: {
      title: "Second Plugin Alpha F14",
      slug: `second-plugin-alpha-f14-${ts}`,
      shortDescription: "Second plugin for testing F14",
      description: "Second product for seller A",
      pricePaise: 29900,
      sellerId: sellerProfileA.id,
      categoryId: category.id,
      status: "PUBLISHED",
    },
  });

  const productB = await prisma.product.create({
    data: {
      title: "Premium Plugin Beta F14",
      slug: `premium-plugin-beta-f14-${ts}`,
      shortDescription: "Beta plugin for testing F14",
      description: "Test product for seller B",
      pricePaise: 49900,
      sellerId: sellerProfileB.id,
      categoryId: category.id,
      status: "PUBLISHED",
    },
  });

  // ─── Helper: Build PAID order directly in DB ──────────────────────────────
  async function createPaidOrder(opts: {
    buyerId: string;
    sellerId: string;
    productId: string;
    pricePaise: number;
    suffix?: string;
  }) {
    const { buyerId, sellerId, productId, pricePaise, suffix = "" } = opts;
    const feePaise = Math.round(pricePaise * 0.1);
    const netPaise = pricePaise - feePaise;
    const orderId = generateOrderId();
    const rzpOrderId = `order_f14_${ts}${suffix}`;
    const rzpPaymentId = `pay_f14_${ts}${suffix}`;
    const rzpSig = generatePaymentSignature(rzpOrderId, rzpPaymentId);

    const order = await prisma.order.create({
      data: {
        id: orderId,
        buyerId,
        status: "PAID",
        paidAt: new Date(),
        subtotalPaise: pricePaise,
        discountPaise: 0,
        platformFeePaise: feePaise,
        totalAmountPaise: pricePaise,
        currency: "INR",
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpSig,
        buyerNameSnapshot: "Buyer F14",
        buyerEmailSnapshot: "buyer.f14@example.com",
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId,
        sellerId,
        productTitle: "F14 Test Product",
        pricePaise,
        platformFeePaise: feePaise,
        sellerEarningsPaise: netPaise,
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpSig,
        amountPaise: pricePaise,
        currency: "INR",
        status: "CAPTURED",
        verifiedAt: new Date(),
      },
    });

    const fullOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    return { order: fullOrder, item: fullOrder.items[0]! };
  }

  // Base PAID order for most tests (product A, seller A)
  const { order: paidOrderA } = await createPaidOrder({
    buyerId: buyerUser.id,
    sellerId: sellerProfileA.id,
    productId: productA.id,
    pricePaise: 79900,
    suffix: "_base",
  });

  const grossA = 79900;
  const feeA = Math.round(grossA * 0.1); // 7990
  const netA = grossA - feeA; // 71910

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1: SETTLEMENT SERVICE — HAPPY PATH
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 1: Settlement Service — Happy Path ---");

  await runTest("S1.1 settleSellerEarnings returns success for PAID+CAPTURED order", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return { passed: result.success === true && result.status === 200, details: result.error };
  });

  await runTest("S1.2 settlement data.orderId matches input orderId", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return { passed: result.data?.orderId === paidOrderA.id };
  });

  await runTest("S1.3 settlement data.itemsSettled >= 1", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return { passed: (result.data?.itemsSettled ?? 0) >= 1, details: `itemsSettled=${result.data?.itemsSettled}` };
  });

  await runTest("S1.4 settlement data.totalGrossPaise = 79900", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return { passed: result.data?.totalGrossPaise === grossA, details: `got=${result.data?.totalGrossPaise}` };
  });

  await runTest("S1.5 settlement data.totalPlatformFeePaise = 10% of gross (rounded)", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return {
      passed: result.data?.totalPlatformFeePaise === feeA,
      details: `expected=${feeA} got=${result.data?.totalPlatformFeePaise}`,
    };
  });

  await runTest("S1.6 settlement data.totalNetEarningsPaise = gross - fee", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return {
      passed: result.data?.totalNetEarningsPaise === netA,
      details: `expected=${netA} got=${result.data?.totalNetEarningsPaise}`,
    };
  });

  await runTest("S1.7 settlement data.sellerEarnings is non-empty array", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return { passed: Array.isArray(result.data?.sellerEarnings) && result.data!.sellerEarnings.length > 0 };
  });

  await runTest("S1.8 settlement data.sellerEarnings[0] has all required fields", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    const e = result.data?.sellerEarnings[0];
    return {
      passed: !!(e?.id && e.sellerId && e.orderItemId && e.grossAmountPaise > 0 && e.availableOn),
      details: JSON.stringify(e),
    };
  });

  await runTest("S1.9 settlement data.sellerEarnings[0].status = PENDING", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return { passed: result.data?.sellerEarnings[0]?.status === "PENDING" };
  });

  await runTest("S1.10 settlement data.platformLedgerIds is non-empty", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return {
      passed: Array.isArray(result.data?.platformLedgerIds) && result.data!.platformLedgerIds.length > 0,
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: FINANCIAL INVARIANTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 2: Financial Invariants ---");

  await runTest("S2.1 DB SellerEarning: gross = platformFee + netEarnings", async () => {
    const earning = await prisma.sellerEarning.findFirst({ where: { orderId: paidOrderA.id } });
    if (!earning) return { passed: false, details: "No SellerEarning found" };
    return {
      passed: earning.grossAmountPaise === earning.platformFeePaise + earning.netEarningsPaise,
      details: `${earning.grossAmountPaise} = ${earning.platformFeePaise} + ${earning.netEarningsPaise}`,
    };
  });

  await runTest("S2.2 DB PlatformLedger: gross = feePaise + netSellerPaise", async () => {
    const ledger = await prisma.platformLedger.findFirst({ where: { orderId: paidOrderA.id } });
    if (!ledger) return { passed: false, details: "No PlatformLedger found" };
    return {
      passed: ledger.grossAmountPaise === ledger.feePaise + ledger.netSellerPaise,
      details: `${ledger.grossAmountPaise} = ${ledger.feePaise} + ${ledger.netSellerPaise}`,
    };
  });

  await runTest("S2.3 DB PlatformLedger.feePaise = Math.round(gross * 0.1)", async () => {
    const ledger = await prisma.platformLedger.findFirst({ where: { orderId: paidOrderA.id } });
    if (!ledger) return { passed: false, details: "No PlatformLedger found" };
    return { passed: ledger.feePaise === feeA, details: `expected=${feeA} got=${ledger.feePaise}` };
  });

  await runTest("S2.4 DB SellerEarning.netEarningsPaise = gross - fee", async () => {
    const earning = await prisma.sellerEarning.findFirst({ where: { orderId: paidOrderA.id } });
    if (!earning) return { passed: false, details: "No SellerEarning found" };
    return { passed: earning.netEarningsPaise === netA, details: `expected=${netA} got=${earning.netEarningsPaise}` };
  });

  await runTest("S2.5 DB SellerEarning.availableOn ≈ T+7 days (within 10s)", async () => {
    const earning = await prisma.sellerEarning.findFirst({ where: { orderId: paidOrderA.id } });
    if (!earning) return { passed: false, details: "No SellerEarning found" };
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const diff = Math.abs(earning.availableOn.getTime() - (Date.now() + sevenDays));
    return { passed: diff < 10000, details: `diff=${diff}ms` };
  });

  await runTest("S2.6 DB SellerEarning.sellerId = sellerProfileA.id (not User.id)", async () => {
    const earning = await prisma.sellerEarning.findFirst({ where: { orderId: paidOrderA.id } });
    return {
      passed: earning?.sellerId === sellerProfileA.id,
      details: `earning.sellerId=${earning?.sellerId}`,
    };
  });

  await runTest("S2.7 DB PlatformLedger exists after settlement", async () => {
    const ledger = await prisma.platformLedger.findFirst({ where: { orderId: paidOrderA.id } });
    return { passed: !!ledger };
  });

  await runTest("S2.8 DB PlatformLedger.status = RECORDED", async () => {
    const ledger = await prisma.platformLedger.findFirst({ where: { orderId: paidOrderA.id } });
    return { passed: ledger?.status === "RECORDED", details: `status=${ledger?.status}` };
  });

  await runTest("S2.9 SellerProfile.totalRevenuePaise incremented by gross", async () => {
    const profile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfileA.id } });
    return {
      passed: profile !== null && Number(profile.totalRevenuePaise) >= grossA,
      details: `totalRevenuePaise=${profile?.totalRevenuePaise}`,
    };
  });

  await runTest("S2.10 SellerProfile.pendingBalance incremented by net earnings", async () => {
    const profile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfileA.id } });
    return {
      passed: profile !== null && Number(profile.pendingBalance) >= netA,
      details: `pendingBalance=${profile?.pendingBalance}`,
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: IDEMPOTENCY
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 3: Idempotency ---");

  await runTest("S3.1 second settlement call returns success=true", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return { passed: result.success === true };
  });

  await runTest("S3.2 second settlement returns idempotent=true", async () => {
    const result = await settleSellerEarnings(paidOrderA.id);
    return { passed: result.data?.idempotent === true, details: `idempotent=${result.data?.idempotent}` };
  });

  await runTest("S3.3 no duplicate SellerEarning created by second settlement", async () => {
    await settleSellerEarnings(paidOrderA.id);
    const count = await prisma.sellerEarning.count({ where: { orderId: paidOrderA.id } });
    return { passed: count === 1, details: `count=${count}` };
  });

  await runTest("S3.4 no duplicate PlatformLedger created by second settlement", async () => {
    await settleSellerEarnings(paidOrderA.id);
    const count = await prisma.platformLedger.count({ where: { orderId: paidOrderA.id } });
    return { passed: count === 1, details: `count=${count}` };
  });

  await runTest("S3.5 financial totals consistent across idempotent calls", async () => {
    const r1 = await settleSellerEarnings(paidOrderA.id);
    const r2 = await settleSellerEarnings(paidOrderA.id);
    return {
      passed:
        r1.data?.totalGrossPaise === r2.data?.totalGrossPaise &&
        r1.data?.totalNetEarningsPaise === r2.data?.totalNetEarningsPaise,
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: GATE CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 4: Gate Checks ---");

  await runTest("S4.1 settleSellerEarnings — 404 for non-existent order", async () => {
    const result = await settleSellerEarnings("nonexistent-order-id-f14");
    return { passed: !result.success && result.status === 404 };
  });

  await runTest("S4.2 settleSellerEarnings — fails for PENDING order (ORDER_NOT_PAID)", async () => {
    const pendingId = generateOrderId();
    const pendingOrder = await prisma.order.create({
      data: {
        id: pendingId,
        buyerId: buyerUser.id,
        status: "PENDING",
        subtotalPaise: 49900,
        discountPaise: 0,
        platformFeePaise: Math.round(49900 * 0.1),
        totalAmountPaise: 49900,
        currency: "INR",
        razorpayOrderId: `order_pending_f14_${ts}`,
        buyerNameSnapshot: "Buyer",
        buyerEmailSnapshot: "buyer@test.com",
      },
    });
    const result = await settleSellerEarnings(pendingOrder.id);
    return { passed: !result.success && result.code === "ORDER_NOT_PAID", details: result.code };
  });

  await runTest("S4.3 settleSellerEarnings — fails for PAID order with no CAPTURED payment", async () => {
    const noPay = generateOrderId();
    await prisma.order.create({
      data: {
        id: noPay,
        buyerId: buyerUser.id,
        status: "PAID",
        paidAt: new Date(),
        subtotalPaise: 49900,
        discountPaise: 0,
        platformFeePaise: Math.round(49900 * 0.1),
        totalAmountPaise: 49900,
        currency: "INR",
        razorpayOrderId: `order_nopay_f14_${ts}`,
        buyerNameSnapshot: "Buyer",
        buyerEmailSnapshot: "buyer@test.com",
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: noPay,
        productId: productA.id,
        sellerId: sellerProfileA.id,
        productTitle: "Test",
        pricePaise: 49900,
        platformFeePaise: Math.round(49900 * 0.1),
        sellerEarningsPaise: 49900 - Math.round(49900 * 0.1),
      },
    });
    const result = await settleSellerEarnings(noPay);
    return { passed: !result.success && result.code === "PAYMENT_NOT_CAPTURED", details: result.code };
  });

  await runTest("S4.4 settleSellerEarnings — fails for CANCELLED order", async () => {
    const cancelId = generateOrderId();
    await prisma.order.create({
      data: {
        id: cancelId,
        buyerId: buyerUser.id,
        status: "CANCELLED",
        subtotalPaise: 49900,
        discountPaise: 0,
        platformFeePaise: Math.round(49900 * 0.1),
        totalAmountPaise: 49900,
        currency: "INR",
        razorpayOrderId: `order_cancel_f14_${ts}`,
        buyerNameSnapshot: "Buyer",
        buyerEmailSnapshot: "buyer@test.com",
      },
    });
    const result = await settleSellerEarnings(cancelId);
    return { passed: !result.success && result.status === 400 };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: MULTI-ITEM ORDER
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 5: Multi-Item Order Settlement ---");

  const g1 = 79900, f1 = Math.round(79900 * 0.1), n1 = 79900 - f1;
  const g2 = 29900, f2 = Math.round(29900 * 0.1), n2 = 29900 - f2;

  const multiRzpOrderId = `order_multi_f14_${ts}`;
  const multiRzpPayId = `pay_multi_f14_${ts}`;
  const multiSig = generatePaymentSignature(multiRzpOrderId, multiRzpPayId);
  const multiOrderId = generateOrderId();

  await prisma.order.create({
    data: {
      id: multiOrderId,
      buyerId: buyerUser.id,
      status: "PAID",
      paidAt: new Date(),
      subtotalPaise: g1 + g2,
      discountPaise: 0,
      platformFeePaise: f1 + f2,
      totalAmountPaise: g1 + g2,
      currency: "INR",
      razorpayOrderId: multiRzpOrderId,
      razorpayPaymentId: multiRzpPayId,
      razorpaySignature: multiSig,
      buyerNameSnapshot: "Buyer F14",
      buyerEmailSnapshot: "buyer.f14@example.com",
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: multiOrderId,
        productId: productA.id,
        sellerId: sellerProfileA.id,
        productTitle: "Premium Plugin Alpha",
        pricePaise: g1,
        platformFeePaise: f1,
        sellerEarningsPaise: n1,
      },
      {
        orderId: multiOrderId,
        productId: productA2.id,
        sellerId: sellerProfileA.id,
        productTitle: "Second Plugin Alpha",
        pricePaise: g2,
        platformFeePaise: f2,
        sellerEarningsPaise: n2,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: multiOrderId,
      razorpayOrderId: multiRzpOrderId,
      razorpayPaymentId: multiRzpPayId,
      razorpaySignature: multiSig,
      amountPaise: g1 + g2,
      currency: "INR",
      status: "CAPTURED",
      verifiedAt: new Date(),
    },
  });

  await runTest("S5.1 multi-item settlement returns success=true", async () => {
    const result = await settleSellerEarnings(multiOrderId);
    return { passed: result.success === true && result.status === 200, details: result.error };
  });

  await runTest("S5.2 multi-item settlement itemsSettled = 2", async () => {
    const result = await settleSellerEarnings(multiOrderId);
    return { passed: result.data?.itemsSettled === 2, details: `itemsSettled=${result.data?.itemsSettled}` };
  });

  await runTest("S5.3 multi-item totalGrossPaise = g1 + g2", async () => {
    const result = await settleSellerEarnings(multiOrderId);
    return {
      passed: result.data?.totalGrossPaise === g1 + g2,
      details: `expected=${g1 + g2} got=${result.data?.totalGrossPaise}`,
    };
  });

  await runTest("S5.4 multi-item totalPlatformFeePaise = f1 + f2", async () => {
    const result = await settleSellerEarnings(multiOrderId);
    return {
      passed: result.data?.totalPlatformFeePaise === f1 + f2,
      details: `expected=${f1 + f2} got=${result.data?.totalPlatformFeePaise}`,
    };
  });

  await runTest("S5.5 multi-item totalNetEarningsPaise = n1 + n2", async () => {
    const result = await settleSellerEarnings(multiOrderId);
    return {
      passed: result.data?.totalNetEarningsPaise === n1 + n2,
      details: `expected=${n1 + n2} got=${result.data?.totalNetEarningsPaise}`,
    };
  });

  await runTest("S5.6 multi-item creates 2 SellerEarning DB records", async () => {
    await settleSellerEarnings(multiOrderId);
    const count = await prisma.sellerEarning.count({ where: { orderId: multiOrderId } });
    return { passed: count === 2, details: `count=${count}` };
  });

  await runTest("S5.7 multi-item creates 2 PlatformLedger DB records", async () => {
    await settleSellerEarnings(multiOrderId);
    const count = await prisma.platformLedger.count({ where: { orderId: multiOrderId } });
    return { passed: count === 2, details: `count=${count}` };
  });

  await runTest("S5.8 multi-item: gross=fee+net invariant holds for each DB earning", async () => {
    const earnings = await prisma.sellerEarning.findMany({ where: { orderId: multiOrderId } });
    const allValid = earnings.every(
      (e) => e.grossAmountPaise === e.platformFeePaise + e.netEarningsPaise
    );
    return { passed: allValid, details: `itemCount=${earnings.length}` };
  });

  await runTest("S5.9 multi-item second call returns idempotent=true", async () => {
    const result = await settleSellerEarnings(multiOrderId);
    return { passed: result.data?.idempotent === true };
  });

  await runTest("S5.10 multi-item second call still returns 2 platform ledger IDs", async () => {
    const result = await settleSellerEarnings(multiOrderId);
    return {
      passed: Array.isArray(result.data?.platformLedgerIds) && result.data!.platformLedgerIds.length >= 2,
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6: GET /api/v1/seller/earnings — Authentication
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 6: GET /seller/earnings — Authentication ---");

  const EARNINGS_URL = "http://localhost/api/v1/seller/earnings";

  await runTest("S6.1 GET /seller/earnings — 401 with no auth", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET"));
    return { passed: res.status === 401 };
  });

  await runTest("S6.2 GET /seller/earnings — 401 with invalid token", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, "Bearer bad.token"));
    return { passed: res.status === 401 };
  });

  await runTest("S6.3 GET /seller/earnings — 401 with buyer token", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, buyerToken));
    return { passed: res.status === 401 };
  });

  await runTest("S6.4 GET /seller/earnings — 401 with admin token (not a seller)", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, adminToken));
    return { passed: res.status === 401 };
  });

  await runTest("S6.5 GET /seller/earnings — 401 with inactive seller", async () => {
    const inactiveSeller = await prisma.user.create({
      data: {
        fullName: "Inactive Seller F14",
        email: `inactive.seller.f14.${ts}@example.com`,
        passwordHash,
        role: "BUYER",
        isActive: false,
      },
    });
    await prisma.sellerProfile.create({
      data: {
        userId: inactiveSeller.id,
        storeName: "Inactive Store F14",
        storeSlug: `inactive-store-f14-${ts}`,
        status: "APPROVED",
        country: "IN",
      },
    });
    const tok = `Bearer ${signJwt({ sub: inactiveSeller.id, email: inactiveSeller.email, role: "BUYER" })}`;
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, tok));
    return { passed: res.status === 401 || res.status === 403 };
  });

  await runTest("S6.6 GET /seller/earnings — 401 with PENDING seller (not APPROVED)", async () => {
    const pendingSeller = await prisma.user.create({
      data: {
        fullName: "Pending Seller F14",
        email: `pending.seller.f14.${ts}@example.com`,
        passwordHash,
        role: "BUYER",
        isActive: true,
      },
    });
    await prisma.sellerProfile.create({
      data: {
        userId: pendingSeller.id,
        storeName: "Pending Store F14",
        storeSlug: `pending-store-f14-${ts}`,
        status: "PENDING",
        country: "IN",
      },
    });
    const tok = `Bearer ${signJwt({ sub: pendingSeller.id, email: pendingSeller.email, role: "BUYER" })}`;
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, tok));
    return { passed: res.status === 401 || res.status === 403 };
  });

  await runTest("S6.7 GET /seller/earnings — 200 with APPROVED seller token", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    return { passed: res.status === 200 };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 7: Response Shape & IDOR
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 7: GET /seller/earnings — Shape & IDOR ---");

  await runTest("S7.1 response has earnings array", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: Array.isArray(json.data?.earnings) };
  });

  await runTest("S7.2 response has summary object", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: typeof json.data?.summary === "object" && json.data.summary !== null };
  });

  await runTest("S7.3 summary.totalRevenuePaise is a number", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: typeof json.data?.summary?.totalRevenuePaise === "number" };
  });

  await runTest("S7.4 summary.pendingBalancePaise is a number", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: typeof json.data?.summary?.pendingBalancePaise === "number" };
  });

  await runTest("S7.5 summary.availableBalancePaise is a number", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: typeof json.data?.summary?.availableBalancePaise === "number" };
  });

  await runTest("S7.6 response has pagination object", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: typeof json.data?.pagination?.total === "number" };
  });

  await runTest("S7.7 IDOR: seller B cannot see seller A earnings", async () => {
    const resA = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const jsonA = await parseJson(resA);
    const aEarnings: any[] = jsonA.data?.earnings ?? [];

    const resB = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenB));
    const jsonB = await parseJson(resB);
    const bEarnings: any[] = jsonB.data?.earnings ?? [];

    const aIds = new Set(aEarnings.map((e: any) => e.id));
    const bHasA = bEarnings.some((e: any) => aIds.has(e.id));
    return { passed: !bHasA, details: `bHasAEarning=${bHasA}` };
  });

  await runTest("S7.8 earnings response — no PAN, bank, or Razorpay secrets", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const text = await res.text();
    const dangerous = /panNumber|bankAccount|razorpayKeySecret|RAZORPAY_KEY_SECRET/.test(text);
    return { passed: !dangerous };
  });

  await runTest("S7.9 earnings items contain financial fields", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    const items: any[] = json.data?.earnings ?? [];
    if (items.length === 0) return { passed: true, details: "No earnings — skipping field check" };
    const e = items[0];
    return {
      passed:
        typeof e.grossAmountPaise === "number" &&
        typeof e.platformFeePaise === "number" &&
        typeof e.netEarningsPaise === "number",
    };
  });

  await runTest("S7.10 earnings items contain orderId and status", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    const items: any[] = json.data?.earnings ?? [];
    if (items.length === 0) return { passed: true, details: "No earnings — skipping field check" };
    return { passed: !!items[0].orderId && typeof items[0].status === "string" };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 8: Pagination
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 8: Pagination ---");

  await runTest("S8.1 GET /seller/earnings?limit=1 — returns ≤ 1 item", async () => {
    const res = await earningsHandler(makeReq(`${EARNINGS_URL}?limit=1`, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: (json.data?.earnings ?? []).length <= 1 };
  });

  await runTest("S8.2 pagination.page = 1 in default response", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: json.data?.pagination?.page === 1 };
  });

  await runTest("S8.3 pagination.limit = 20 by default", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: json.data?.pagination?.limit === 20 };
  });

  await runTest("S8.4 custom limit=5 is honored", async () => {
    const res = await earningsHandler(makeReq(`${EARNINGS_URL}?limit=5`, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: json.data?.pagination?.limit === 5 };
  });

  await runTest("S8.5 limit capped at 100 for huge values", async () => {
    const res = await earningsHandler(makeReq(`${EARNINGS_URL}?limit=9999`, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: json.data?.pagination?.limit === 100 };
  });

  await runTest("S8.6 pagination.totalPages is an integer", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: Number.isInteger(json.data?.pagination?.totalPages) };
  });

  await runTest("S8.7 status filter PENDING returns only PENDING earnings", async () => {
    const res = await earningsHandler(makeReq(`${EARNINGS_URL}?status=PENDING`, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    const items: any[] = json.data?.earnings ?? [];
    const allPending = items.every((e: any) => e.status === "PENDING");
    return { passed: allPending, details: `itemCount=${items.length}` };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 9: Admin Platform Ledger
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 9: GET /admin/platform/ledger ---");

  const LEDGER_URL = "http://localhost/api/v1/admin/platform/ledger";

  await runTest("S9.1 GET /admin/platform/ledger — 401 with no auth", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET"));
    return { passed: res.status === 401 };
  });

  await runTest("S9.2 GET /admin/platform/ledger — 401 with seller token", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, sellerTokenA));
    return { passed: res.status === 401 };
  });

  await runTest("S9.3 GET /admin/platform/ledger — 401 with buyer token", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, buyerToken));
    return { passed: res.status === 401 };
  });

  await runTest("S9.4 GET /admin/platform/ledger — 200 with admin token", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    return { passed: res.status === 200 };
  });

  await runTest("S9.5 response has ledger array", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    const json = await parseJson(res);
    return { passed: Array.isArray(json.data?.ledger) };
  });

  await runTest("S9.6 response has summary object", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    const json = await parseJson(res);
    return { passed: typeof json.data?.summary === "object" };
  });

  await runTest("S9.7 summary.periodFeePaise is a number", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    const json = await parseJson(res);
    return { passed: typeof json.data?.summary?.periodFeePaise === "number" };
  });

  await runTest("S9.8 summary.periodGrossPaise is a number", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    const json = await parseJson(res);
    return { passed: typeof json.data?.summary?.periodGrossPaise === "number" };
  });

  await runTest("S9.9 response has pagination with total", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    const json = await parseJson(res);
    return { passed: typeof json.data?.pagination?.total === "number" };
  });

  await runTest("S9.10 orderId filter returns only matching entries", async () => {
    const res = await adminLedgerHandler(
      makeReq(`${LEDGER_URL}?orderId=${paidOrderA.id}`, "GET", undefined, adminToken)
    );
    const json = await parseJson(res);
    const items: any[] = json.data?.ledger ?? [];
    const allMatch = items.every((e: any) => e.orderId === paidOrderA.id);
    return { passed: allMatch, details: `count=${items.length} allMatch=${allMatch}` };
  });

  await runTest("S9.11 ledger items have feePaise field", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    const json = await parseJson(res);
    const items: any[] = json.data?.ledger ?? [];
    if (items.length === 0) return { passed: true, details: "No ledger entries yet" };
    return { passed: typeof items[0].feePaise === "number" };
  });

  await runTest("S9.12 admin ledger — no secrets or bank data in response", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    const text = await res.text();
    const dangerous = /razorpayKeySecret|RAZORPAY_KEY_SECRET|bankIfsc|panNumber/.test(text);
    return { passed: !dangerous };
  });

  await runTest("S9.13 admin ledger pagination limit=5 honored", async () => {
    const res = await adminLedgerHandler(makeReq(`${LEDGER_URL}?limit=5`, "GET", undefined, adminToken));
    const json = await parseJson(res);
    return { passed: json.data?.pagination?.limit === 5 };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 10: Integration — payment verify fires settlement
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 10: Integration — verify route triggers settlement ---");

  const intRzpOrderId = `order_int_f14_${ts}`;
  const intOrderId = generateOrderId();

  await prisma.order.create({
    data: {
      id: intOrderId,
      buyerId: buyerUser.id,
      status: "PENDING",
      subtotalPaise: 29900,
      discountPaise: 0,
      platformFeePaise: Math.round(29900 * 0.1),
      totalAmountPaise: 29900,
      currency: "INR",
      razorpayOrderId: intRzpOrderId,
      buyerNameSnapshot: "Buyer F14",
      buyerEmailSnapshot: "buyer.f14@example.com",
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: intOrderId,
      productId: productA.id,
      sellerId: sellerProfileA.id,
      productTitle: "Premium Plugin Alpha F14",
      pricePaise: 29900,
      platformFeePaise: Math.round(29900 * 0.1),
      sellerEarningsPaise: 29900 - Math.round(29900 * 0.1),
    },
  });

  const intRzpPayId = `pay_int_f14_${ts}`;
  const intSig = generatePaymentSignature(intRzpOrderId, intRzpPayId);

  await runTest("S10.1 POST /payments/verify — 200 for valid payment", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: intOrderId,
          razorpayOrderId: intRzpOrderId,
          razorpayPaymentId: intRzpPayId,
          razorpaySignature: intSig,
        },
        buyerToken
      )
    );
    return { passed: res.status === 200 };
  });

  await runTest("S10.2 order becomes PAID after verify", async () => {
    const order = await prisma.order.findUnique({ where: { id: intOrderId } });
    return { passed: order?.status === "PAID", details: `status=${order?.status}` };
  });

  await runTest("S10.3 SellerEarning created after verify+settlement (with wait)", async () => {
    await sleep(600);
    const count = await prisma.sellerEarning.count({ where: { orderId: intOrderId } });
    return { passed: count >= 1, details: `count=${count}` };
  });

  await runTest("S10.4 PlatformLedger created after verify+settlement (with wait)", async () => {
    const count = await prisma.platformLedger.count({ where: { orderId: intOrderId } });
    return { passed: count >= 1, details: `count=${count}` };
  });

  await runTest("S10.5 integration SellerEarning.sellerId = sellerProfileA.id", async () => {
    const earning = await prisma.sellerEarning.findFirst({ where: { orderId: intOrderId } });
    return {
      passed: earning?.sellerId === sellerProfileA.id,
      details: `earning.sellerId=${earning?.sellerId}`,
    };
  });

  await runTest("S10.6 verify response does not expose sellerEarnings internals", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: intOrderId,
          razorpayOrderId: intRzpOrderId,
          razorpayPaymentId: intRzpPayId,
          razorpaySignature: intSig,
        },
        buyerToken
      )
    );
    const text = await res.text();
    return { passed: !text.includes("sellerEarnings") && !text.includes("platformLedger") };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 11: Regression
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Section 11: Regression Checks ---");

  await runTest("S11.1 POST /payments/verify — 401 with no auth (regression)", async () => {
    const res = await verifyHandler(
      makeReq("http://localhost/api/v1/payments/verify", "POST", {
        orderId: "x",
        razorpayOrderId: "x",
        razorpayPaymentId: "x",
        razorpaySignature: "x",
      })
    );
    return { passed: res.status === 401 };
  });

  await runTest("S11.2 POST /payments/verify — 400 for bad signature (regression)", async () => {
    const regOrderId = generateOrderId();
    await prisma.order.create({
      data: {
        id: regOrderId,
        buyerId: buyerUser.id,
        status: "PENDING",
        subtotalPaise: 10000,
        discountPaise: 0,
        platformFeePaise: 1000,
        totalAmountPaise: 10000,
        currency: "INR",
        razorpayOrderId: `order_reg_f14_${ts}`,
        buyerNameSnapshot: "Buyer",
        buyerEmailSnapshot: "buyer@test.com",
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: regOrderId,
        productId: productA.id,
        sellerId: sellerProfileA.id,
        productTitle: "Test",
        pricePaise: 10000,
        platformFeePaise: 1000,
        sellerEarningsPaise: 9000,
      },
    });
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: regOrderId,
          razorpayOrderId: `order_reg_f14_${ts}`,
          razorpayPaymentId: "pay_fake_001",
          razorpaySignature: "bad_signature_000",
        },
        buyerToken
      )
    );
    return { passed: res.status === 400 };
  });

  await runTest("S11.3 settlement does NOT create Entitlement records", async () => {
    // Entitlements are Feature 12 only — settlement service must not touch them
    const before = await prisma.entitlement.count({ where: { orderId: paidOrderA.id } });
    await settleSellerEarnings(paidOrderA.id); // idempotent
    const after = await prisma.entitlement.count({ where: { orderId: paidOrderA.id } });
    return { passed: before === after, details: `before=${before} after=${after}` };
  });

  await runTest("S11.4 settlement does NOT create Download records", async () => {
    const before = await prisma.download.count({ where: { orderId: paidOrderA.id } });
    await settleSellerEarnings(paidOrderA.id); // idempotent
    const after = await prisma.download.count({ where: { orderId: paidOrderA.id } });
    return { passed: before === after, details: `before=${before} after=${after}` };
  });

  await runTest("S11.5 GET /seller/earnings success=true", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: json.success === true };
  });

  await runTest("S11.6 GET /admin/platform/ledger success=true", async () => {
    const res = await adminLedgerHandler(makeReq(LEDGER_URL, "GET", undefined, adminToken));
    const json = await parseJson(res);
    return { passed: json.success === true };
  });

  await runTest("S11.7 SellerProfile.netEarningsPaise > 0 after settlement", async () => {
    const profile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfileA.id } });
    return { passed: Number(profile?.netEarningsPaise) > 0 };
  });

  await runTest("S11.8 GET /seller/earnings — success returns valid message string", async () => {
    const res = await earningsHandler(makeReq(EARNINGS_URL, "GET", undefined, sellerTokenA));
    const json = await parseJson(res);
    return { passed: typeof json.message === "string" && json.message.length > 0 };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n===========================================================================");
  console.log(`FEATURE 14 RESULTS: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log("===========================================================================");

  if (failures.length > 0) {
    console.log("\nFailed Tests:");
    failures.forEach((f) => console.log(`  ✗ ${f}`));
  }

  await prisma.$disconnect();

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("FATAL:", err);
  await prisma.$disconnect();
  process.exit(1);
});
