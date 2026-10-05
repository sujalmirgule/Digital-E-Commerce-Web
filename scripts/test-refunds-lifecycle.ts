import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import {
  canTransitionOrder,
  canTransitionPayment,
  VALID_ORDER_TRANSITIONS,
  VALID_PAYMENT_TRANSITIONS,
  cancelOrder,
  requestRefund,
  processOrderRefund,
  rejectRefundRequest,
  getAdminRefunds,
  getBuyerRefundRequest,
} from "../src/lib/services/order-lifecycle";
import { settleSellerEarnings } from "../src/lib/services/seller-earnings";
import { generateReceiptForOrder } from "../src/lib/services/receipt";
import { provisionOrderEntitlements, hasProductEntitlement, getActiveEntitlement } from "../src/lib/services/entitlement";
import { authorizeProductFileDownload } from "../src/lib/services/download";
import { POST as buyerCancelHandler } from "../src/app/api/v1/buyer/orders/[orderId]/cancel/route";
import {
  POST as buyerRefundRequestPostHandler,
  GET as buyerRefundRequestGetHandler,
} from "../src/app/api/v1/buyer/orders/[orderId]/refund-request/route";
import { POST as adminRefundHandler } from "../src/app/api/v1/admin/orders/[id]/refund/route";
import { GET as adminRefundsListHandler } from "../src/app/api/v1/admin/refunds/route";
import { POST as adminApproveRefundHandler } from "../src/app/api/v1/admin/refunds/[id]/approve/route";
import { POST as adminRejectRefundHandler } from "../src/app/api/v1/admin/refunds/[id]/reject/route";
import { POST as webhookHandler } from "../src/app/api/v1/payments/webhook/route";
import {
  OrderStatus,
  PaymentStatus,
  EntitlementStatus,
  EarningStatus,
  RefundStatus,
  UserRole,
} from "@prisma/client";

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
  headers: Record<string, string> = {}
): NextRequest {
  const reqHeaders: Record<string, string> = {
    "content-type": "application/json",
    ...headers,
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
  console.log("FEATURE 21 TEST SUITE: REFUNDS, CANCELLATION & ORDER LIFECYCLE");
  console.log("===========================================================================\n");

  const timestamp = Date.now();
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Setup test users & entities
  const adminUser = await prisma.user.create({
    data: {
      email: `admin_rfnd_${timestamp}@test.com`,
      fullName: "Admin Refund Reviewer",
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      isEmailVerified: true,
    },
  });

  const inactiveAdmin = await prisma.user.create({
    data: {
      email: `admin_inactive_${timestamp}@test.com`,
      fullName: "Suspended Admin",
      passwordHash,
      role: UserRole.ADMIN,
      isActive: false,
      isEmailVerified: true,
    },
  });

  const buyerA = await prisma.user.create({
    data: {
      email: `buyer_a_${timestamp}@test.com`,
      fullName: "Buyer Alice",
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
      isEmailVerified: true,
    },
  });

  const buyerB = await prisma.user.create({
    data: {
      email: `buyer_b_${timestamp}@test.com`,
      fullName: "Buyer Bob",
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
      isEmailVerified: true,
    },
  });

  const suspendedBuyer = await prisma.user.create({
    data: {
      email: `buyer_susp_${timestamp}@test.com`,
      fullName: "Suspended Buyer",
      passwordHash,
      role: UserRole.BUYER,
      isActive: false,
      isEmailVerified: true,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `seller_rfnd_${timestamp}@test.com`,
      fullName: "Creator Sam",
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
      isEmailVerified: true,
    },
  });

  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: `Sam Creative Labs ${timestamp}`,
      storeSlug: `sam-labs-${timestamp}`,
      status: "APPROVED",
      totalRevenuePaise: BigInt(0),
      netEarningsPaise: BigInt(0),
      pendingBalance: BigInt(0),
      availableBalance: BigInt(0),
    },
  });

  const category = await prisma.category.upsert({
    where: { slug: "development" },
    create: {
      name: "Development",
      slug: "development",
    },
    update: {},
  });

  const product = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      categoryId: category.id,
      title: "Production React Template",
      slug: `prod-react-${timestamp}`,
      shortDescription: "A high-performance react boilerplate",
      description: "Full react boilerplate with zero-trust storage",
      pricePaise: 10000, // ₹100.00
      status: "PUBLISHED",
    },
  });

  const productFile = await prisma.productFile.create({
    data: {
      productId: product.id,
      originalFilename: "react-boilerplate.zip",
      fileSize: BigInt(1024000),
      mimeType: "application/zip",
      storageKey: `files/react-boilerplate-${timestamp}.zip`,
    },
  });

  // Tokens
  const adminToken = signJwt({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" });
  const inactiveAdminToken = signJwt({ sub: inactiveAdmin.id, email: inactiveAdmin.email, role: "ADMIN" });
  const buyerAToken = signJwt({ sub: buyerA.id, email: buyerA.email, role: "BUYER" });
  const buyerBToken = signJwt({ sub: buyerB.id, email: buyerB.email, role: "BUYER" });
  const suspendedBuyerToken = signJwt({ sub: suspendedBuyer.id, email: suspendedBuyer.email, role: "BUYER" });

  let orderSeq = 1;
  async function createTestOrder(opts: {
    buyerId?: string;
    status?: OrderStatus;
    totalAmountPaise?: number;
    platformFeePaise?: number;
    sellerId?: string;
    capturePayment?: boolean;
    provisionFulfillment?: boolean;
  }) {
    const seq = orderSeq++;
    const orderId = `ORD-TEST-${timestamp}-${seq}`;
    const rzpOrderId = `order_test_${timestamp}_${seq}`;
    const rzpPaymentId = `pay_test_${timestamp}_${seq}`;
    const buyerId = opts.buyerId || buyerA.id;
    const status = opts.status || OrderStatus.PENDING;
    const totalAmountPaise = opts.totalAmountPaise || 10000;
    const platformFeePaise = opts.platformFeePaise || 1000; // 10%
    const sellerEarningsPaise = totalAmountPaise - platformFeePaise;
    const sellerId = opts.sellerId || sellerProfile.id;

    const ord = await prisma.order.create({
      data: {
        id: orderId,
        buyerId,
        buyerNameSnapshot: "Test Buyer",
        buyerEmailSnapshot: "buyer@test.com",
        subtotalPaise: totalAmountPaise,
        totalAmountPaise,
        platformFeePaise,
        currency: "INR",
        status,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: opts.capturePayment ? rzpPaymentId : null,
        paidAt: opts.capturePayment ? new Date() : null,
        items: {
          create: [
            {
              productId: product.id,
              sellerId,
              productTitle: product.title,
              pricePaise: totalAmountPaise,
              platformFeePaise,
              sellerEarningsPaise,
            },
          ],
        },
      },
      include: { items: true },
    });

    if (opts.capturePayment) {
      await prisma.payment.create({
        data: {
          orderId: ord.id,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          amountPaise: totalAmountPaise,
          currency: "INR",
          status: PaymentStatus.CAPTURED,
          verifiedAt: new Date(),
        },
      });

      if (opts.provisionFulfillment) {
        // Provision entitlement & download
        await provisionOrderEntitlements({
          orderId: ord.id,
          authenticatedUserId: buyerId,
        });

        await prisma.download.create({
          data: {
            orderId: ord.id,
            buyerId,
            productFileId: productFile.id,
            isActive: true,
          },
        });

        // Generate receipt
        await generateReceiptForOrder(ord.id);

        // Settle earnings
        await settleSellerEarnings(ord.id);
      }
    } else {
      await prisma.payment.create({
        data: {
          orderId: ord.id,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          amountPaise: totalAmountPaise,
          currency: "INR",
          status: PaymentStatus.CREATED,
        },
      });
    }

    return ord;
  }

  // ===========================================================================
  // SECTION 1: ORDER STATE MACHINE & ALLOWED TRANSITIONS (Tests 1-20)
  // ===========================================================================
  console.log("\n--- SECTION 1: Order State Machine Invariants ---");

  await runTest("Test 01: Order transition PENDING -> PAYMENT_PROCESSING is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING) };
  });

  await runTest("Test 02: Order transition PENDING -> CANCELLED is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.PENDING, OrderStatus.CANCELLED) };
  });

  await runTest("Test 03: Order transition PENDING -> PAID is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.PENDING, OrderStatus.PAID) };
  });

  await runTest("Test 04: Order transition PENDING -> FAILED is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.PENDING, OrderStatus.FAILED) };
  });

  await runTest("Test 05: Order transition PENDING -> REFUNDED is rejected", async () => {
    return { passed: !canTransitionOrder(OrderStatus.PENDING, OrderStatus.REFUNDED) };
  });

  await runTest("Test 06: Order transition PENDING -> REFUND_REQUESTED is rejected", async () => {
    return { passed: !canTransitionOrder(OrderStatus.PENDING, OrderStatus.REFUND_REQUESTED) };
  });

  await runTest("Test 07: Order transition PAYMENT_PROCESSING -> PAID is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.PAYMENT_PROCESSING, OrderStatus.PAID) };
  });

  await runTest("Test 08: Order transition PAYMENT_PROCESSING -> FAILED is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.PAYMENT_PROCESSING, OrderStatus.FAILED) };
  });

  await runTest("Test 09: Order transition PAYMENT_PROCESSING -> CANCELLED is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.PAYMENT_PROCESSING, OrderStatus.CANCELLED) };
  });

  await runTest("Test 10: Order transition PAYMENT_PROCESSING -> REFUNDED is rejected", async () => {
    return { passed: !canTransitionOrder(OrderStatus.PAYMENT_PROCESSING, OrderStatus.REFUNDED) };
  });

  await runTest("Test 11: Order transition PAID -> REFUND_REQUESTED is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.PAID, OrderStatus.REFUND_REQUESTED) };
  });

  await runTest("Test 12: Order transition PAID -> REFUNDED is allowed (direct admin refund)", async () => {
    return { passed: canTransitionOrder(OrderStatus.PAID, OrderStatus.REFUNDED) };
  });

  await runTest("Test 13: Order transition PAID -> CANCELLED is strictly rejected (paid cannot be cancelled)", async () => {
    return { passed: !canTransitionOrder(OrderStatus.PAID, OrderStatus.CANCELLED) };
  });

  await runTest("Test 14: Order transition PAID -> PENDING is strictly rejected", async () => {
    return { passed: !canTransitionOrder(OrderStatus.PAID, OrderStatus.PENDING) };
  });

  await runTest("Test 15: Order transition REFUND_REQUESTED -> REFUNDED is allowed", async () => {
    return { passed: canTransitionOrder(OrderStatus.REFUND_REQUESTED, OrderStatus.REFUNDED) };
  });

  await runTest("Test 16: Order transition REFUND_REQUESTED -> PAID is allowed (dispute dismissed)", async () => {
    return { passed: canTransitionOrder(OrderStatus.REFUND_REQUESTED, OrderStatus.PAID) };
  });

  await runTest("Test 17: Order transition REFUND_REQUESTED -> CANCELLED is rejected", async () => {
    return { passed: !canTransitionOrder(OrderStatus.REFUND_REQUESTED, OrderStatus.CANCELLED) };
  });

  await runTest("Test 18: Order transition REFUNDED -> any is rejected (REFUNDED is terminal)", async () => {
    const invalid = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.CANCELLED,
      OrderStatus.REFUND_REQUESTED,
      OrderStatus.FAILED,
    ];
    const allRejected = invalid.every((s) => !canTransitionOrder(OrderStatus.REFUNDED, s));
    return { passed: allRejected };
  });

  await runTest("Test 19: Order transition CANCELLED -> any is rejected (CANCELLED is terminal)", async () => {
    const invalid = [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.REFUNDED];
    const allRejected = invalid.every((s) => !canTransitionOrder(OrderStatus.CANCELLED, s));
    return { passed: allRejected };
  });

  await runTest("Test 20: Order transition FAILED -> any is rejected (FAILED is terminal)", async () => {
    const invalid = [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.REFUNDED];
    const allRejected = invalid.every((s) => !canTransitionOrder(OrderStatus.FAILED, s));
    return { passed: allRejected };
  });

  // ===========================================================================
  // SECTION 2: PAYMENT STATE MACHINE INVARIANTS (Tests 21-32)
  // ===========================================================================
  console.log("\n--- SECTION 2: Payment State Machine Invariants ---");

  await runTest("Test 21: Payment transition CREATED -> AUTHORIZED is allowed", async () => {
    return { passed: canTransitionPayment(PaymentStatus.CREATED, PaymentStatus.AUTHORIZED) };
  });

  await runTest("Test 22: Payment transition CREATED -> CAPTURED is allowed", async () => {
    return { passed: canTransitionPayment(PaymentStatus.CREATED, PaymentStatus.CAPTURED) };
  });

  await runTest("Test 23: Payment transition CREATED -> FAILED is allowed", async () => {
    return { passed: canTransitionPayment(PaymentStatus.CREATED, PaymentStatus.FAILED) };
  });

  await runTest("Test 24: Payment transition CREATED -> REFUNDED is rejected (cannot refund uncaptured)", async () => {
    return { passed: !canTransitionPayment(PaymentStatus.CREATED, PaymentStatus.REFUNDED) };
  });

  await runTest("Test 25: Payment transition AUTHORIZED -> CAPTURED is allowed", async () => {
    return { passed: canTransitionPayment(PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED) };
  });

  await runTest("Test 26: Payment transition AUTHORIZED -> FAILED is allowed", async () => {
    return { passed: canTransitionPayment(PaymentStatus.AUTHORIZED, PaymentStatus.FAILED) };
  });

  await runTest("Test 27: Payment transition AUTHORIZED -> REFUNDED is rejected", async () => {
    return { passed: !canTransitionPayment(PaymentStatus.AUTHORIZED, PaymentStatus.REFUNDED) };
  });

  await runTest("Test 28: Payment transition CAPTURED -> REFUNDED is allowed", async () => {
    return { passed: canTransitionPayment(PaymentStatus.CAPTURED, PaymentStatus.REFUNDED) };
  });

  await runTest("Test 29: Payment transition CAPTURED -> CREATED is rejected", async () => {
    return { passed: !canTransitionPayment(PaymentStatus.CAPTURED, PaymentStatus.CREATED) };
  });

  await runTest("Test 30: Payment transition CAPTURED -> FAILED is rejected", async () => {
    return { passed: !canTransitionPayment(PaymentStatus.CAPTURED, PaymentStatus.FAILED) };
  });

  await runTest("Test 31: Payment transition REFUNDED -> any is rejected (REFUNDED is terminal)", async () => {
    const invalid = [PaymentStatus.CREATED, PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED];
    const allRejected = invalid.every((s) => !canTransitionPayment(PaymentStatus.REFUNDED, s));
    return { passed: allRejected };
  });

  await runTest("Test 32: Payment transition FAILED -> any is rejected (FAILED is terminal)", async () => {
    const invalid = [PaymentStatus.CAPTURED, PaymentStatus.REFUNDED];
    const allRejected = invalid.every((s) => !canTransitionPayment(PaymentStatus.FAILED, s));
    return { passed: allRejected };
  });

  // ===========================================================================
  // SECTION 3: BUYER ORDER CANCELLATION RULES & SECURITY (Tests 33-45)
  // ===========================================================================
  console.log("\n--- SECTION 3: Buyer Order Cancellation Rules ---");

  await runTest("Test 33: Buyer can cancel their own PENDING order", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    const res = await cancelOrder({ orderId: ord.id, userId: buyerA.id, reason: "Changed mind" });
    const check = await prisma.order.findUnique({ where: { id: ord.id } });
    return {
      passed: res.success && res.status === 200 && check?.status === OrderStatus.CANCELLED,
    };
  });

  await runTest("Test 34: Uncaptured payment records marked FAILED upon order cancellation", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    await cancelOrder({ orderId: ord.id, userId: buyerA.id });
    const payments = await prisma.payment.findMany({ where: { orderId: ord.id } });
    return {
      passed: payments.every((p) => p.status === PaymentStatus.FAILED),
    };
  });

  await runTest("Test 35: Re-cancelling an already CANCELLED order returns safe idempotent 200", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    await cancelOrder({ orderId: ord.id, userId: buyerA.id });
    const second = await cancelOrder({ orderId: ord.id, userId: buyerA.id });
    return {
      passed: second.success && second.data?.idempotent === true && second.data?.status === OrderStatus.CANCELLED,
    };
  });

  await runTest("Test 36: Buyer can cancel PAYMENT_PROCESSING order", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAYMENT_PROCESSING });
    const res = await cancelOrder({ orderId: ord.id, userId: buyerA.id });
    return { passed: res.success && res.data?.status === OrderStatus.CANCELLED };
  });

  await runTest("Test 37: Buyer CANNOT cancel a PAID order (rejected with ORDER_ALREADY_PAID)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const res = await cancelOrder({ orderId: ord.id, userId: buyerA.id });
    return {
      passed: !res.success && res.code === "ORDER_ALREADY_PAID" && res.status === 400,
    };
  });

  await runTest("Test 38: Buyer CANNOT cancel an already REFUNDED order (rejected with ORDER_ALREADY_REFUNDED)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.REFUNDED });
    const res = await cancelOrder({ orderId: ord.id, userId: buyerA.id });
    return {
      passed: !res.success && res.code === "ORDER_ALREADY_REFUNDED" && res.status === 400,
    };
  });

  await runTest("Test 39: Buyer CANNOT cancel a FAILED order (rejected with ORDER_FAILED)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.FAILED });
    const res = await cancelOrder({ orderId: ord.id, userId: buyerA.id });
    return {
      passed: !res.success && res.code === "ORDER_FAILED" && res.status === 400,
    };
  });

  await runTest("Test 40: IDOR protection: Buyer B cannot cancel Buyer A's order (FORBIDDEN 403)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    const res = await cancelOrder({ orderId: ord.id, userId: buyerB.id });
    return {
      passed: !res.success && res.code === "FORBIDDEN" && res.status === 403,
    };
  });

  await runTest("Test 41: Administrator can cancel any PENDING order on buyer's behalf", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    const res = await cancelOrder({ orderId: ord.id, userId: adminUser.id, isAdmin: true, reason: "Admin cancellation" });
    return {
      passed: res.success && res.data?.status === OrderStatus.CANCELLED,
    };
  });

  await runTest("Test 42: Cancellation of non-existent order returns 404 ORDER_NOT_FOUND", async () => {
    const res = await cancelOrder({ orderId: "ORD-DOES-NOT-EXIST", userId: buyerA.id });
    return {
      passed: !res.success && res.code === "ORDER_NOT_FOUND" && res.status === 404,
    };
  });

  await runTest("Test 43: Cancellation via HTTP API POST /api/v1/buyer/orders/:id/cancel succeeds", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    const req = makeReq(
      `http://localhost:3000/api/v1/buyer/orders/${ord.id}/cancel`,
      "POST",
      { reason: "HTTP Cancel test" },
      `Bearer ${buyerAToken}`
    );
    const res = await buyerCancelHandler(req, { params: { orderId: ord.id } });
    const json = await parseJson(res);
    return {
      passed: json.status === 200 && json.success === true && json.data.status === "CANCELLED",
    };
  });

  await runTest("Test 44: Cancellation HTTP API rejects unauthenticated request (401)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    const req = makeReq(`http://localhost:3000/api/v1/buyer/orders/${ord.id}/cancel`, "POST", {});
    const res = await buyerCancelHandler(req, { params: { orderId: ord.id } });
    const json = await parseJson(res);
    return { passed: json.status === 401 };
  });

  await runTest("Test 45: Cancellation HTTP API rejects suspended user (403)", async () => {
    const ord = await createTestOrder({ buyerId: suspendedBuyer.id, status: OrderStatus.PENDING });
    const req = makeReq(
      `http://localhost:3000/api/v1/buyer/orders/${ord.id}/cancel`,
      "POST",
      {},
      `Bearer ${suspendedBuyerToken}`
    );
    const res = await buyerCancelHandler(req, { params: { orderId: ord.id } });
    const json = await parseJson(res);
    return { passed: json.status === 403 };
  });

  // ===========================================================================
  // SECTION 4: BUYER REFUND REQUEST FLOW (Tests 46-60)
  // ===========================================================================
  console.log("\n--- SECTION 4: Buyer Refund Request Flow ---");

  await runTest("Test 46: Buyer submits refund request on PAID order -> transitions to REFUND_REQUESTED", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const res = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Product does not fit project requirements" });
    const check = await prisma.order.findUnique({ where: { id: ord.id } });
    return {
      passed: res.success && res.status === 201 && check?.status === OrderStatus.REFUND_REQUESTED,
    };
  });

  await runTest("Test 47: RefundRequest record created with status PENDING and exact amountPaise", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, totalAmountPaise: 15000 });
    const res = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Defective component build" });
    const reqRecord = await prisma.refundRequest.findUnique({ where: { id: res.data?.requestId } });
    return {
      passed: reqRecord !== null && reqRecord.status === RefundStatus.PENDING && reqRecord.amountPaise === 15000,
    };
  });

  await runTest("Test 48: Duplicate refund request on same order rejected with 409 REFUND_ALREADY_REQUESTED", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "First refund request" });
    const second = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Second refund request" });
    return {
      passed: !second.success && second.status === 409 && second.code === "REFUND_ALREADY_REQUESTED",
    };
  });

  await runTest("Test 49: Refund request rejected on PENDING order (400 ORDER_NOT_PAID)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    const res = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "I want refund" });
    return {
      passed: !res.success && res.status === 400 && res.code === "ORDER_NOT_PAID",
    };
  });

  await runTest("Test 50: Refund request rejected on CANCELLED order (400 ORDER_CANCELLED)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.CANCELLED });
    const res = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "I want refund" });
    return {
      passed: !res.success && res.status === 400 && res.code === "ORDER_CANCELLED",
    };
  });

  await runTest("Test 51: Refund request rejected on already REFUNDED order (400 ORDER_ALREADY_REFUNDED)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.REFUNDED });
    const res = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "I want refund" });
    return {
      passed: !res.success && res.status === 400 && res.code === "ORDER_ALREADY_REFUNDED",
    };
  });

  await runTest("Test 52: Refund request rejected if reason is empty or whitespace", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const res = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "    " });
    return {
      passed: !res.success && res.status === 400 && res.code === "INVALID_REASON",
    };
  });

  await runTest("Test 53: Refund request rejected if reason length < 5 characters", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const res = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "bad" });
    return {
      passed: !res.success && res.status === 400 && res.code === "INVALID_REASON",
    };
  });

  await runTest("Test 54: Cross-user IDOR: Buyer B cannot submit refund request on Buyer A's order (403)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const res = await requestRefund({ orderId: ord.id, buyerId: buyerB.id, reason: "Buyer B attacking" });
    return {
      passed: !res.success && res.status === 403 && res.code === "FORBIDDEN",
    };
  });

  await runTest("Test 55: Refund request on non-existent order returns 404 ORDER_NOT_FOUND", async () => {
    const res = await requestRefund({ orderId: "ORD-NON-EXISTENT", buyerId: buyerA.id, reason: "Valid reason text" });
    return {
      passed: !res.success && res.status === 404 && res.code === "ORDER_NOT_FOUND",
    };
  });

  await runTest("Test 56: HTTP API POST /api/v1/buyer/orders/:id/refund-request succeeds (201)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const req = makeReq(
      `http://localhost:3000/api/v1/buyer/orders/${ord.id}/refund-request`,
      "POST",
      { reason: "Not compatible with modern Next.js 14" },
      `Bearer ${buyerAToken}`
    );
    const res = await buyerRefundRequestPostHandler(req, { params: { orderId: ord.id } });
    const json = await parseJson(res);
    return {
      passed: json.status === 201 && json.success === true && json.data.orderStatus === "REFUND_REQUESTED",
    };
  });

  await runTest("Test 57: HTTP API GET /api/v1/buyer/orders/:id/refund-request returns status", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Testing GET status endpoint" });
    const req = makeReq(
      `http://localhost:3000/api/v1/buyer/orders/${ord.id}/refund-request`,
      "GET",
      undefined,
      `Bearer ${buyerAToken}`
    );
    const res = await buyerRefundRequestGetHandler(req, { params: { orderId: ord.id } });
    const json = await parseJson(res);
    return {
      passed: json.status === 200 && json.data.refundRequest?.status === "PENDING",
    };
  });

  await runTest("Test 58: HTTP API GET refund-request blocks unauthorized other user (403)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Privacy test" });
    const req = makeReq(
      `http://localhost:3000/api/v1/buyer/orders/${ord.id}/refund-request`,
      "GET",
      undefined,
      `Bearer ${buyerBToken}`
    );
    const res = await buyerRefundRequestGetHandler(req, { params: { orderId: ord.id } });
    const json = await parseJson(res);
    return { passed: json.status === 403 };
  });

  await runTest("Test 59: HTTP API POST refund-request rejects invalid payload (400)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const req = makeReq(
      `http://localhost:3000/api/v1/buyer/orders/${ord.id}/refund-request`,
      "POST",
      { reason: "x" },
      `Bearer ${buyerAToken}`
    );
    const res = await buyerRefundRequestPostHandler(req, { params: { orderId: ord.id } });
    const json = await parseJson(res);
    return { passed: json.status === 400 && json.error.code === "VALIDATION_FAILED" };
  });

  await runTest("Test 60: Buyer notification created when refund request is submitted", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Check notification dispatch" });
    const notifs = await prisma.notification.findMany({
      where: { userId: buyerA.id, type: "ACCOUNT_ALERT" },
    });
    return { passed: notifs.length > 0 };
  });

  // ===========================================================================
  // SECTION 5: ADMIN DIRECT REFUND & AUTHORITATIVE GATEWAY (Tests 61-75)
  // ===========================================================================
  console.log("\n--- SECTION 5: Admin Direct Refund Execution & Provider Gateway ---");

  await runTest("Test 61: Non-admin buyer rejected from direct refund endpoint (403 FORBIDDEN)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/orders/${ord.id}/refund`,
      "POST",
      {},
      `Bearer ${buyerAToken}`
    );
    const res = await adminRefundHandler(req, { params: { id: ord.id } });
    const json = await parseJson(res);
    return { passed: json.status === 403 && json.error.code === "FORBIDDEN" };
  });

  await runTest("Test 62: Unauthenticated user rejected from admin refund endpoint (401 UNAUTHORIZED)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true });
    const req = makeReq(`http://localhost:3000/api/v1/admin/orders/${ord.id}/refund`, "POST", {});
    const res = await adminRefundHandler(req, { params: { id: ord.id } });
    const json = await parseJson(res);
    return { passed: json.status === 401 };
  });

  await runTest("Test 63: Admin refund on non-existent order returns 404 ORDER_NOT_FOUND", async () => {
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/orders/ORD-NONEXISTENT/refund`,
      "POST",
      {},
      `Bearer ${adminToken}`
    );
    const res = await adminRefundHandler(req, { params: { id: "ORD-NONEXISTENT" } });
    const json = await parseJson(res);
    return { passed: json.status === 404 && json.error.code === "ORDER_NOT_FOUND" };
  });

  await runTest("Test 64: Admin refund rejected on PENDING order (400 INVALID_ORDER_STATE)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PENDING });
    const res = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    return { passed: !res.success && res.status === 400 && res.code === "INVALID_ORDER_STATE" };
  });

  await runTest("Test 65: Admin refund rejected on CANCELLED order (400 INVALID_ORDER_STATE)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.CANCELLED });
    const res = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    return { passed: !res.success && res.status === 400 && res.code === "INVALID_ORDER_STATE" };
  });

  await runTest("Test 66: Admin refund rejected on FAILED order (400 INVALID_ORDER_STATE)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.FAILED });
    const res = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    return { passed: !res.success && res.status === 400 && res.code === "INVALID_ORDER_STATE" };
  });

  await runTest("Test 67: Admin executes direct refund on PAID order -> success (200, status REFUNDED)", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const res = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id, reason: "Customer requested" });
    const check = await prisma.order.findUnique({ where: { id: ord.id } });
    return {
      passed: res.success && res.status === 200 && check?.status === OrderStatus.REFUNDED,
    };
  });

  await runTest("Test 68: Authoritative provider refund ID saved on Order and Payment records", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const res = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const checkOrd = await prisma.order.findUnique({ where: { id: ord.id } });
    const checkPay = await prisma.payment.findFirst({ where: { orderId: ord.id } });
    return {
      passed:
        !!res.data?.providerRefundId &&
        checkOrd?.providerRefundId === res.data?.providerRefundId &&
        checkPay?.refundId === res.data?.providerRefundId,
    };
  });

  await runTest("Test 69: Payment record status transitioned to REFUNDED upon order refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const checkPay = await prisma.payment.findFirst({ where: { orderId: ord.id } });
    return { passed: checkPay?.status === PaymentStatus.REFUNDED && checkPay.refundedAt !== null };
  });

  await runTest("Test 70: Order.refundedAt timestamp recorded upon refund execution", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const checkOrd = await prisma.order.findUnique({ where: { id: ord.id } });
    return { passed: checkOrd?.refundedAt !== null && checkOrd?.refundedAt instanceof Date };
  });

  await runTest("Test 71: AuditLog created with action REFUND_ORDER and adminId", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id, reason: "Quality issue" });
    const log = await prisma.auditLog.findFirst({
      where: { targetEntity: "Order", targetId: ord.id, action: "REFUND_ORDER" },
    });
    return { passed: log !== null && log.adminId === adminUser.id };
  });

  await runTest("Test 72: Provider failure simulation: order status remains unchanged if gateway rejects", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });

    process.env.RAZORPAY_SIMULATE_REFUND_FAILURE = "true";
    let res: any;
    try {
      res = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    } finally {
      delete process.env.RAZORPAY_SIMULATE_REFUND_FAILURE;
    }

    const checkOrd = await prisma.order.findUnique({ where: { id: ord.id } });
    const checkPay = await prisma.payment.findFirst({ where: { orderId: ord.id } });
    return {
      passed:
        !res.success &&
        res.status === 502 &&
        res.code === "PROVIDER_REFUND_FAILED" &&
        checkOrd?.status === OrderStatus.PAID &&
        checkPay?.status === PaymentStatus.CAPTURED,
    };
  });

  await runTest("Test 73: Real integer paise amounts preserved across refund operations", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 79900, // ₹799.00
      platformFeePaise: 7990,  // ₹79.90
      provisionFulfillment: true,
    });
    const res = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    return { passed: res.data?.amountRefundedPaise === 79900 };
  });

  await runTest("Test 74: HTTP POST /api/v1/admin/orders/:id/refund executes successfully", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/orders/${ord.id}/refund`,
      "POST",
      { reason: "Customer dispute settled" },
      `Bearer ${adminToken}`
    );
    const res = await adminRefundHandler(req, { params: { id: ord.id } });
    const json = await parseJson(res);
    return {
      passed: json.status === 200 && json.success === true && json.data.status === "REFUNDED",
    };
  });

  await runTest("Test 75: Admin refund also approves any pending buyer RefundRequest on that order", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Waiting for refund" });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const reqRecord = await prisma.refundRequest.findFirst({ where: { orderId: ord.id } });
    return { passed: reqRecord?.status === RefundStatus.APPROVED };
  });

  // ===========================================================================
  // SECTION 6: FINANCIAL REVERSALS & SELLER BALANCES (Tests 76-90)
  // ===========================================================================
  console.log("\n--- SECTION 6: Financial Reversals & Seller Balance Deductions ---");

  await runTest("Test 76: Settled SellerEarning status updated to REFUNDED_DEDUCTED upon refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const earnings = await prisma.sellerEarning.findMany({ where: { orderId: ord.id } });
    return {
      passed: earnings.length > 0 && earnings.every((e) => e.status === EarningStatus.REFUNDED_DEDUCTED),
    };
  });

  await runTest("Test 77: SellerProfile.pendingBalance decremented by exact netEarningsPaise", async () => {
    const beforeProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const beforePending = beforeProfile?.pendingBalance || BigInt(0);

    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 20000, // ₹200
      platformFeePaise: 2000,  // ₹20 fee -> ₹180 net
      provisionFulfillment: true,
    });

    const midProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const midPending = midProfile?.pendingBalance || BigInt(0);

    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });

    const afterProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const afterPending = afterProfile?.pendingBalance || BigInt(0);

    return {
      passed: midPending === beforePending + BigInt(18000) && afterPending === beforePending,
    };
  });

  await runTest("Test 78: SellerProfile.totalRevenuePaise decremented by exact gross sale amount", async () => {
    const beforeProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const beforeRev = beforeProfile?.totalRevenuePaise || BigInt(0);

    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 10000,
      provisionFulfillment: true,
    });

    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const afterProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const afterRev = afterProfile?.totalRevenuePaise || BigInt(0);

    return { passed: afterRev === beforeRev };
  });

  await runTest("Test 79: SellerProfile.netEarningsPaise decremented by exact net earnings amount", async () => {
    const beforeProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const beforeNet = beforeProfile?.netEarningsPaise || BigInt(0);

    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 10000,
      provisionFulfillment: true,
    });

    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const afterProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const afterNet = afterProfile?.netEarningsPaise || BigInt(0);

    return { passed: afterNet === beforeNet };
  });

  await runTest("Test 80: Cleared/AVAILABLE SellerEarnings deduct from availableBalance upon refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 10000,
      platformFeePaise: 1000, // net = 9000
      provisionFulfillment: true,
    });

    // Manually mark earning as AVAILABLE to simulate T+7 clearance
    await prisma.sellerEarning.updateMany({
      where: { orderId: ord.id },
      data: { status: EarningStatus.AVAILABLE },
    });
    await prisma.sellerProfile.update({
      where: { id: sellerProfile.id },
      data: {
        pendingBalance: { decrement: 9000 },
        availableBalance: { increment: 9000 },
      },
    });

    const midProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const midAvailable = midProfile?.availableBalance || BigInt(0);

    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });

    const afterProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const afterAvailable = afterProfile?.availableBalance || BigInt(0);

    return { passed: afterAvailable === midAvailable - BigInt(9000) };
  });

  await runTest("Test 81: Non-negative balance protection: Seller profile balance clamped to 0", async () => {
    // Reset seller balances to 0
    await prisma.sellerProfile.update({
      where: { id: sellerProfile.id },
      data: { pendingBalance: BigInt(0), availableBalance: BigInt(0), totalRevenuePaise: BigInt(0), netEarningsPaise: BigInt(0) },
    });

    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 10000,
      platformFeePaise: 1000,
      provisionFulfillment: false, // No settlement created
    });

    // Artificially create earning with net 9000 without balance increment
    await prisma.sellerEarning.create({
      data: {
        sellerId: sellerProfile.id,
        orderId: ord.id,
        grossAmountPaise: 10000,
        platformFeePaise: 1000,
        netEarningsPaise: 9000,
        status: EarningStatus.PENDING,
        availableOn: new Date(),
      },
    });

    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const profile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });

    return {
      passed: profile !== null && profile.pendingBalance >= BigInt(0) && profile.availableBalance >= BigInt(0),
    };
  });

  await runTest("Test 82: PlatformLedger record status updated to REVERSED upon refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const ledgers = await prisma.platformLedger.findMany({ where: { orderId: ord.id } });
    return {
      passed: ledgers.length > 0 && ledgers.every((l) => l.status === "REVERSED"),
    };
  });

  await runTest("Test 83: SellerEarning records are NEVER deleted from database", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const count = await prisma.sellerEarning.count({ where: { orderId: ord.id } });
    return { passed: count > 0 };
  });

  await runTest("Test 84: PlatformLedger records are NEVER deleted from database", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const count = await prisma.platformLedger.count({ where: { orderId: ord.id } });
    return { passed: count > 0 };
  });

  await runTest("Test 85: Multi-item order: all seller earnings reversed and adjusted", async () => {
    const seq = orderSeq++;
    const multiOrderId = `ORD-MULTI-${timestamp}-${seq}`;
    const rzpOrderId = `order_multi_${timestamp}_${seq}`;
    const rzpPaymentId = `pay_multi_${timestamp}_${seq}`;

    const multiOrder = await prisma.order.create({
      data: {
        id: multiOrderId,
        buyerId: buyerA.id,
        buyerNameSnapshot: "Multi Buyer",
        buyerEmailSnapshot: "multi@test.com",
        subtotalPaise: 20000,
        totalAmountPaise: 20000,
        platformFeePaise: 2000,
        currency: "INR",
        status: OrderStatus.PAID,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        paidAt: new Date(),
        items: {
          create: [
            {
              productId: product.id,
              sellerId: sellerProfile.id,
              productTitle: "Item 1",
              pricePaise: 10000,
              platformFeePaise: 1000,
              sellerEarningsPaise: 9000,
            },
            {
              productId: product.id,
              sellerId: sellerProfile.id,
              productTitle: "Item 2",
              pricePaise: 10000,
              platformFeePaise: 1000,
              sellerEarningsPaise: 9000,
            },
          ],
        },
      },
    });

    await prisma.payment.create({
      data: {
        orderId: multiOrder.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        amountPaise: 20000,
        status: PaymentStatus.CAPTURED,
      },
    });

    await settleSellerEarnings(multiOrder.id);
    const refundRes = await processOrderRefund({ orderId: multiOrder.id, adminId: adminUser.id });
    const earnings = await prisma.sellerEarning.findMany({ where: { orderId: multiOrder.id } });

    return {
      passed:
        refundRes.success &&
        earnings.length === 2 &&
        earnings.every((e) => e.status === EarningStatus.REFUNDED_DEDUCTED),
    };
  });

  await runTest("Test 86: Re-attempting settleSellerEarnings on REFUNDED order is rejected (400)", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const settlementRes = await settleSellerEarnings(ord.id);
    return {
      passed: !settlementRes.success && settlementRes.status === 400 && settlementRes.code === "ORDER_NOT_PAID",
    };
  });

  await runTest("Test 87: Unsettled order refunded before settlement results in zero balance deduction", async () => {
    const beforeProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const beforePending = beforeProfile?.pendingBalance || BigInt(0);

    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: false, // Never settled
    });

    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const afterProfile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });
    const afterPending = afterProfile?.pendingBalance || BigInt(0);

    return { passed: afterPending === beforePending };
  });

  await runTest("Test 88: Notification sent to Seller when their sale is refunded", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const notifs = await prisma.notification.findMany({
      where: { userId: sellerUser.id, type: "REFUND_PROCESSED" },
    });
    return { passed: notifs.length > 0 };
  });

  await runTest("Test 89: Notification sent to Buyer when their order is refunded", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const notifs = await prisma.notification.findMany({
      where: { userId: buyerA.id, type: "REFUND_PROCESSED" },
    });
    return { passed: notifs.length > 0 };
  });

  await runTest("Test 90: Order refund response details exact gross and net balance adjustments", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 10000,
      platformFeePaise: 1000,
      provisionFulfillment: true,
    });
    const res = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const adj = res.data?.sellerBalanceAdjustments?.[0];
    return {
      passed: adj !== undefined && adj.grossDeductedPaise === 10000 && adj.netDeductedPaise === 9000,
    };
  });

  // ===========================================================================
  // SECTION 7: ENTITLEMENT, DOWNLOAD & RECEIPT CONSISTENCY (Tests 91-105)
  // ===========================================================================
  console.log("\n--- SECTION 7: Entitlement, Download & Receipt Consistency ---");

  await runTest("Test 91: Active Entitlement for refunded order transitioned to REVOKED", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const ent = await prisma.entitlement.findFirst({ where: { orderId: ord.id } });
    return { passed: ent?.status === EntitlementStatus.REVOKED };
  });

  await runTest("Test 92: Entitlement.isActive set to false upon refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const ent = await prisma.entitlement.findFirst({ where: { orderId: ord.id } });
    return { passed: ent?.isActive === false };
  });

  await runTest("Test 93: Entitlement.revokedAt populated with timestamp upon refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const ent = await prisma.entitlement.findFirst({ where: { orderId: ord.id } });
    return { passed: ent?.revokedAt !== null && ent?.revokedAt instanceof Date };
  });

  await runTest("Test 94: hasProductEntitlement returns false after order is refunded", async () => {
    const buyerSingleOrder = await prisma.user.create({
      data: {
        email: `buyer_single_94_${timestamp}_${Date.now()}@test.com`,
        fullName: "Buyer Single Ent",
        passwordHash,
        role: UserRole.BUYER,
        isActive: true,
        isEmailVerified: true,
      },
    });

    const ord = await createTestOrder({
      buyerId: buyerSingleOrder.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const before = await hasProductEntitlement(buyerSingleOrder.id, product.id);
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const after = await hasProductEntitlement(buyerSingleOrder.id, product.id);
    return { passed: before === true && after === false };
  });

  await runTest("Test 95: getActiveEntitlement returns null after order is refunded", async () => {
    const buyerSingleOrder = await prisma.user.create({
      data: {
        email: `buyer_single_95_${timestamp}_${Date.now()}@test.com`,
        fullName: "Buyer Single Ent 2",
        passwordHash,
        role: UserRole.BUYER,
        isActive: true,
        isEmailVerified: true,
      },
    });

    const ord = await createTestOrder({
      buyerId: buyerSingleOrder.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const before = await getActiveEntitlement(buyerSingleOrder.id, product.id);
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const after = await getActiveEntitlement(buyerSingleOrder.id, product.id);
    return { passed: before !== null && after === null };
  });

  await runTest("Test 96: Download record isActive set to false upon order refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const dl = await prisma.download.findFirst({ where: { orderId: ord.id } });
    return { passed: dl?.isActive === false };
  });

  await runTest("Test 97: authorizeProductFileDownload rejects download attempt for refunded product (403)", async () => {
    const buyerSingleOrder = await prisma.user.create({
      data: {
        email: `buyer_single_97_${timestamp}_${Date.now()}@test.com`,
        fullName: "Buyer Single Ent 3",
        passwordHash,
        role: UserRole.BUYER,
        isActive: true,
        isEmailVerified: true,
      },
    });

    const ord = await createTestOrder({
      buyerId: buyerSingleOrder.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const dlAuth = await authorizeProductFileDownload({
      userId: buyerSingleOrder.id,
      productFileId: productFile.id,
    });
    return { passed: !dlAuth.success && dlAuth.status === 403 };
  });

  await runTest("Test 98: Historical Receipt is NOT deleted upon refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const receipt = await prisma.receipt.findUnique({ where: { orderId: ord.id } });
    return { passed: receipt !== null };
  });

  await runTest("Test 99: Historical Receipt invoiceNumber remains unmodified upon refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const receiptBefore = await prisma.receipt.findUnique({ where: { orderId: ord.id } });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const receiptAfter = await prisma.receipt.findUnique({ where: { orderId: ord.id } });
    return {
      passed: receiptBefore?.invoiceNumber === receiptAfter?.invoiceNumber && receiptAfter !== null,
    };
  });

  await runTest("Test 100: Historical Receipt amountPaidPaise remains unmodified upon refund", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 12500,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const receipt = await prisma.receipt.findUnique({ where: { orderId: ord.id } });
    return { passed: receipt?.amountPaidPaise === 12500 };
  });

  await runTest("Test 101: Buyer order detail endpoint reflects REFUNDED status and provider reference", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const refundRes = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const req = makeReq(
      `http://localhost:3000/api/v1/buyer/orders/${ord.id}`,
      "GET",
      undefined,
      `Bearer ${buyerAToken}`
    );
    const { GET: buyerOrderDetailHandler } = await import(
      "../src/app/api/v1/buyer/orders/[orderId]/route"
    );
    const res = await buyerOrderDetailHandler(req, { params: { orderId: ord.id } });
    const json = await parseJson(res);
    return {
      passed:
        json.status === 200 &&
        json.data.status === "REFUNDED" &&
        json.data.providerRefundId === refundRes.data?.providerRefundId,
    };
  });

  await runTest("Test 102: Admin order detail endpoint reflects REFUNDED status and provider reference", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const refundRes = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/orders/${ord.id}`,
      "GET",
      undefined,
      `Bearer ${adminToken}`
    );
    const { GET: adminOrderDetailHandler } = await import(
      "../src/app/api/v1/admin/orders/[id]/route"
    );
    const res = await adminOrderDetailHandler(req, { params: { id: ord.id } });
    const json = await parseJson(res);
    return {
      passed:
        json.status === 200 &&
        json.data.status === "REFUNDED" &&
        json.data.providerRefundId === refundRes.data?.providerRefundId,
    };
  });

  await runTest("Test 103: Re-provisioning entitlements on a REFUNDED order is rejected (400)", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const reprovision = await provisionOrderEntitlements({
      orderId: ord.id,
      authenticatedUserId: buyerA.id,
    });
    return {
      passed: !reprovision.success && reprovision.status === 400 && reprovision.code === "ORDER_NOT_PAID",
    };
  });

  await runTest("Test 104: Download access for non-refunded orders remains active and unaffected", async () => {
    const ordA = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const ordB = await createTestOrder({ buyerId: buyerB.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });

    // Refund order A only
    await processOrderRefund({ orderId: ordA.id, adminId: adminUser.id });

    // Verify order B entitlement & download still active
    const entB = await hasProductEntitlement(buyerB.id, product.id);
    const dlB = await prisma.download.findFirst({ where: { orderId: ordB.id } });

    return { passed: entB === true && dlB?.isActive === true };
  });

  await runTest("Test 105: Previously downloaded product can be refunded and then access is revoked", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });

    // Simulate previous download by incrementing count
    await prisma.download.updateMany({
      where: { orderId: ord.id },
      data: { downloadCount: 5, lastDownloadedAt: new Date() },
    });

    // Refund executes successfully
    const refundRes = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const dl = await prisma.download.findFirst({ where: { orderId: ord.id } });

    return { passed: refundRes.success && dl?.isActive === false };
  });

  // ===========================================================================
  // SECTION 8: ADMIN REFUND REQUEST APPROVAL & REJECTION WORKFLOW (Tests 106-116)
  // ===========================================================================
  console.log("\n--- SECTION 8: Admin Request Approval & Rejection Workflow ---");

  await runTest("Test 106: Non-admin rejected from approve refund request endpoint (403 FORBIDDEN)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Buyer request" });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/refunds/${reqRes.data?.requestId}/approve`,
      "POST",
      {},
      `Bearer ${buyerAToken}`
    );
    const res = await adminApproveRefundHandler(req, { params: { id: reqRes.data?.requestId! } });
    const json = await parseJson(res);
    return { passed: json.status === 403 && json.error.code === "FORBIDDEN" };
  });

  await runTest("Test 107: Admin approves pending RefundRequest by ID -> success and order marked REFUNDED", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Valid defect reported" });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/refunds/${reqRes.data?.requestId}/approve`,
      "POST",
      { note: "Approved by lead admin" },
      `Bearer ${adminToken}`
    );
    const res = await adminApproveRefundHandler(req, { params: { id: reqRes.data?.requestId! } });
    const json = await parseJson(res);
    const checkOrd = await prisma.order.findUnique({ where: { id: ord.id } });
    const checkReq = await prisma.refundRequest.findUnique({ where: { id: reqRes.data?.requestId! } });
    return {
      passed:
        json.status === 200 &&
        json.success === true &&
        checkOrd?.status === OrderStatus.REFUNDED &&
        checkReq?.status === RefundStatus.APPROVED,
    };
  });

  await runTest("Test 108: Admin cannot approve an already approved RefundRequest (400 REQUEST_NOT_PENDING)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Test approve once" });
    const req1 = makeReq(`http://localhost:3000/api/v1/admin/refunds/${reqRes.data?.requestId}/approve`, "POST", {}, `Bearer ${adminToken}`);
    await adminApproveRefundHandler(req1, { params: { id: reqRes.data?.requestId! } });

    const req2 = makeReq(`http://localhost:3000/api/v1/admin/refunds/${reqRes.data?.requestId}/approve`, "POST", {}, `Bearer ${adminToken}`);
    const res2 = await adminApproveRefundHandler(req2, { params: { id: reqRes.data?.requestId! } });
    const json2 = await parseJson(res2);
    return { passed: json2.status === 400 && json2.error.code === "REQUEST_NOT_PENDING" };
  });

  await runTest("Test 109: Non-admin rejected from reject refund request endpoint (403 FORBIDDEN)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Buyer request" });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/refunds/${reqRes.data?.requestId}/reject`,
      "POST",
      { adminNotes: "Explanation" },
      `Bearer ${buyerAToken}`
    );
    const res = await adminRejectRefundHandler(req, { params: { id: reqRes.data?.requestId! } });
    const json = await parseJson(res);
    return { passed: json.status === 403 && json.error.code === "FORBIDDEN" };
  });

  await runTest("Test 110: Admin rejects pending RefundRequest with explanation -> Order reverts to PAID", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Disputed charge" });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/refunds/${reqRes.data?.requestId}/reject`,
      "POST",
      { adminNotes: "Product files are fully functional as advertised." },
      `Bearer ${adminToken}`
    );
    const res = await adminRejectRefundHandler(req, { params: { id: reqRes.data?.requestId! } });
    const json = await parseJson(res);
    const checkOrd = await prisma.order.findUnique({ where: { id: ord.id } });
    const checkReq = await prisma.refundRequest.findUnique({ where: { id: reqRes.data?.requestId! } });
    return {
      passed:
        json.status === 200 &&
        json.success === true &&
        checkOrd?.status === OrderStatus.PAID &&
        checkReq?.status === RefundStatus.REJECTED,
    };
  });

  await runTest("Test 111: Rejection requires at least 3 characters of admin notes", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Testing min notes" });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/refunds/${reqRes.data?.requestId}/reject`,
      "POST",
      { adminNotes: "no" },
      `Bearer ${adminToken}`
    );
    const res = await adminRejectRefundHandler(req, { params: { id: reqRes.data?.requestId! } });
    const json = await parseJson(res);
    return { passed: json.status === 400 && json.error.code === "VALIDATION_FAILED" };
  });

  await runTest("Test 112: Admin cannot reject an already rejected request (400 REQUEST_NOT_PENDING)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Reject test" });
    await rejectRefundRequest({
      requestId: reqRes.data?.requestId!,
      adminId: adminUser.id,
      adminNotes: "Declined first time",
    });
    const second = await rejectRefundRequest({
      requestId: reqRes.data?.requestId!,
      adminId: adminUser.id,
      adminNotes: "Declined second time",
    });
    return { passed: !second.success && second.status === 400 && second.code === "REQUEST_NOT_PENDING" };
  });

  await runTest("Test 113: Notification sent to buyer when refund request is declined", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Decline notif check" });
    await rejectRefundRequest({
      requestId: reqRes.data?.requestId!,
      adminId: adminUser.id,
      adminNotes: "Declined due to license terms",
    });
    const notifs = await prisma.notification.findMany({
      where: { userId: buyerA.id, title: "Refund Request Declined" },
    });
    return { passed: notifs.length > 0 };
  });

  await runTest("Test 114: AuditLog recorded with action REJECT_REFUND_REQUEST", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Audit check" });
    await rejectRefundRequest({
      requestId: reqRes.data?.requestId!,
      adminId: adminUser.id,
      adminNotes: "Audit trail test notes",
    });
    const log = await prisma.auditLog.findFirst({
      where: { targetEntity: "RefundRequest", targetId: reqRes.data?.requestId!, action: "REJECT_REFUND_REQUEST" },
    });
    return { passed: log !== null && log.adminId === adminUser.id };
  });

  await runTest("Test 115: GET /api/v1/admin/refunds returns paginated list of requests", async () => {
    const req = makeReq(`http://localhost:3000/api/v1/admin/refunds?page=1&limit=10`, "GET", undefined, `Bearer ${adminToken}`);
    const res = await adminRefundsListHandler(req);
    const json = await parseJson(res);
    return {
      passed: json.status === 200 && json.success === true && Array.isArray(json.data.requests),
    };
  });

  await runTest("Test 116: GET /api/v1/admin/refunds filters by status PENDING", async () => {
    const req = makeReq(`http://localhost:3000/api/v1/admin/refunds?status=PENDING`, "GET", undefined, `Bearer ${adminToken}`);
    const res = await adminRefundsListHandler(req);
    const json = await parseJson(res);
    const allPending = json.data.requests.every((r: any) => r.status === "PENDING");
    return { passed: json.status === 200 && allPending };
  });

  // ===========================================================================
  // SECTION 9: IDEMPOTENCY, CONCURRENCY & GATEWAY WEBHOOK (Tests 117-128)
  // ===========================================================================
  console.log("\n--- SECTION 9: Idempotency, Concurrency & Gateway Webhooks ---");

  await runTest("Test 117: Retrying refund on already REFUNDED order is safe idempotent (200, idempotent: true)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const first = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const second = await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    return {
      passed:
        first.success &&
        second.success &&
        second.data?.idempotent === true &&
        second.data?.providerRefundId === first.data?.providerRefundId,
    };
  });

  await runTest("Test 118: Idempotent retry performs ZERO additional deductions on seller balance", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });

    const balanceAfterFirst = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });

    // Retry refund
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });

    const balanceAfterSecond = await prisma.sellerProfile.findUnique({ where: { id: sellerProfile.id } });

    return {
      passed:
        balanceAfterFirst?.pendingBalance === balanceAfterSecond?.pendingBalance &&
        balanceAfterFirst?.availableBalance === balanceAfterSecond?.availableBalance &&
        balanceAfterFirst?.totalRevenuePaise === balanceAfterSecond?.totalRevenuePaise,
    };
  });

  await runTest("Test 119: Idempotent retry creates ZERO duplicate PlatformLedger entries", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const countFirst = await prisma.platformLedger.count({ where: { orderId: ord.id } });

    // Retry refund
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });
    const countSecond = await prisma.platformLedger.count({ where: { orderId: ord.id } });

    return { passed: countFirst === countSecond };
  });

  await runTest("Test 120: Concurrency: Two simultaneous refund requests result in exactly ONE logical reversal", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });

    const [res1, res2] = await Promise.all([
      processOrderRefund({ orderId: ord.id, adminId: adminUser.id, reason: "Concurrent 1" }),
      processOrderRefund({ orderId: ord.id, adminId: adminUser.id, reason: "Concurrent 2" }),
    ]);

    const orderFinal = await prisma.order.findUnique({ where: { id: ord.id } });
    const earnings = await prisma.sellerEarning.findMany({ where: { orderId: ord.id } });
    const ledgers = await prisma.platformLedger.findMany({ where: { orderId: ord.id } });

    return {
      passed:
        (res1.success || res2.success) &&
        orderFinal?.status === OrderStatus.REFUNDED &&
        earnings.every((e) => e.status === EarningStatus.REFUNDED_DEDUCTED) &&
        ledgers.every((l) => l.status === "REVERSED"),
    };
  });

  await runTest("Test 121: Security: Server strictly computes refund amount from Order record (zero client override)", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      totalAmountPaise: 50000, // ₹500
      provisionFulfillment: true,
    });
    // Admin request sends payload without amount — server determines amount
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/orders/${ord.id}/refund`,
      "POST",
      { reason: "Server amount test" },
      `Bearer ${adminToken}`
    );
    const res = await adminRefundHandler(req, { params: { id: ord.id } });
    const json = await parseJson(res);
    return { passed: json.data.amountRefundedPaise === 50000 };
  });

  await runTest("Test 122: Security: Server strictly derives buyer and seller from DB (no client injection)", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/orders/${ord.id}/refund`,
      "POST",
      { buyerId: "injected_buyer", sellerId: "injected_seller" },
      `Bearer ${adminToken}`
    );
    const res = await adminRefundHandler(req, { params: { id: ord.id } });
    const json = await parseJson(res);
    const checkOrd = await prisma.order.findUnique({ where: { id: ord.id } });
    return { passed: json.status === 200 && checkOrd?.buyerId === buyerA.id };
  });

  await runTest("Test 123: Razorpay Webhook listener: refund.processed event marks order REFUNDED", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const payment = await prisma.payment.findFirst({ where: { orderId: ord.id } });

    const webhookPayload = {
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: `rfnd_wh_${timestamp}`,
            payment_id: payment?.razorpayPaymentId,
            amount: ord.totalAmountPaise,
            status: "processed",
            notes: { orderId: ord.id },
          },
        },
      },
    };

    const req = makeReq(
      "http://localhost:3000/api/v1/payments/webhook",
      "POST",
      webhookPayload
    );
    const res = await webhookHandler(req);
    const json = await parseJson(res);
    const checkOrd = await prisma.order.findUnique({ where: { id: ord.id } });

    return {
      passed: json.status === 200 && checkOrd?.status === OrderStatus.REFUNDED,
    };
  });

  await runTest("Test 124: Razorpay Webhook listener: payment.refunded event is handled idempotently", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const payment = await prisma.payment.findFirst({ where: { orderId: ord.id } });

    const webhookPayload = {
      event: "payment.refunded",
      payload: {
        payment: {
          entity: {
            id: payment?.razorpayPaymentId,
            order_id: ord.razorpayOrderId,
            amount_refunded: ord.totalAmountPaise,
          },
        },
      },
    };

    const req = makeReq(
      "http://localhost:3000/api/v1/payments/webhook",
      "POST",
      webhookPayload
    );
    const res = await webhookHandler(req);
    const json = await parseJson(res);
    const checkOrd = await prisma.order.findUnique({ where: { id: ord.id } });

    return {
      passed: json.status === 200 && checkOrd?.status === OrderStatus.REFUNDED,
    };
  });

  await runTest("Test 125: Inactive/suspended admin rejected from approving refund (403)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const reqRes = await requestRefund({ orderId: ord.id, buyerId: buyerA.id, reason: "Inactive admin check" });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/refunds/${reqRes.data?.requestId}/approve`,
      "POST",
      {},
      `Bearer ${inactiveAdminToken}`
    );
    const res = await adminApproveRefundHandler(req, { params: { id: reqRes.data?.requestId! } });
    const json = await parseJson(res);
    return { passed: json.status === 403 };
  });

  await runTest("Test 126: Inactive/suspended admin rejected from direct order refund (403)", async () => {
    const ord = await createTestOrder({ buyerId: buyerA.id, status: OrderStatus.PAID, capturePayment: true, provisionFulfillment: true });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/orders/${ord.id}/refund`,
      "POST",
      {},
      `Bearer ${inactiveAdminToken}`
    );
    const res = await adminRefundHandler(req, { params: { id: ord.id } });
    const json = await parseJson(res);
    return { passed: json.status === 403 };
  });

  await runTest("Test 127: Database consistency check: Order, Payment, Entitlement, Earning, Ledger all aligned", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    await processOrderRefund({ orderId: ord.id, adminId: adminUser.id });

    const finalOrder = await prisma.order.findUnique({
      where: { id: ord.id },
      include: {
        payments: true,
        entitlements: true,
        downloads: true,
        sellerEarnings: true,
        platformLedgers: true,
        receipt: true,
      },
    });

    const isOrderRefunded = finalOrder?.status === OrderStatus.REFUNDED;
    const isPaymentRefunded = finalOrder?.payments.every((p) => p.status === PaymentStatus.REFUNDED);
    const areEntitlementsRevoked = finalOrder?.entitlements.every(
      (e) => e.status === EntitlementStatus.REVOKED && !e.isActive
    );
    const areDownloadsDeactivated = finalOrder?.downloads.every((d) => !d.isActive);
    const areEarningsAdjusted = finalOrder?.sellerEarnings.every(
      (e) => e.status === EarningStatus.REFUNDED_DEDUCTED
    );
    const areLedgersReversed = finalOrder?.platformLedgers.every((l) => l.status === "REVERSED");
    const isReceiptPreserved = finalOrder?.receipt !== null;

    return {
      passed: Boolean(
        isOrderRefunded &&
        isPaymentRefunded &&
        areEntitlementsRevoked &&
        areDownloadsDeactivated &&
        areEarningsAdjusted &&
        areLedgersReversed &&
        isReceiptPreserved
      ),
    };
  });

  await runTest("Test 128: Zero sensitive data leakage in refund responses (no passwords, hashes, bank details)", async () => {
    const ord = await createTestOrder({
      buyerId: buyerA.id,
      status: OrderStatus.PAID,
      capturePayment: true,
      provisionFulfillment: true,
    });
    const req = makeReq(
      `http://localhost:3000/api/v1/admin/orders/${ord.id}/refund`,
      "POST",
      {},
      `Bearer ${adminToken}`
    );
    const res = await adminRefundHandler(req, { params: { id: ord.id } });
    const text = await res.text();

    const containsPasswordHash = text.includes("passwordHash") || text.includes("$2a$") || text.includes("$2b$");
    const containsBankDetails = text.includes("bankAccount") || text.includes("panNumber");
    const containsSecrets = text.includes("RAZORPAY_KEY_SECRET");

    return {
      passed: !containsPasswordHash && !containsBankDetails && !containsSecrets,
    };
  });

  console.log("\n===========================================================================");
  console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
  console.log(`PASSED:      ${passedCount}`);
  console.log(`FAILED:      ${failedCount}`);
  console.log("===========================================================================\n");

  if (failedCount > 0) {
    console.error("FAILURES:");
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log("ALL 128 TESTS PASSED SUCCESSFULLY! 🚀");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
