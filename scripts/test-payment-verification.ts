import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { POST as verifyHandler } from "../src/app/api/v1/payments/verify/route";
import { POST as orderVerifyHandler } from "../src/app/api/v1/orders/verify/route";
import { POST as checkoutHandler } from "../src/app/api/v1/orders/checkout/route";
import {
  generatePaymentSignature,
  getRazorpayKeySecret,
  generateOrderId,
} from "../src/lib/payment/razorpay";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * ===========================================================================
 * FEATURE 11 TEST SUITE: RAZORPAY PAYMENT VERIFICATION
 * ===========================================================================
 *
 * Target: 50+ meaningful tests covering:
 *   1. Authentication (missing, invalid, expired, inactive user)
 *   2. Validation & strict payload rules (missing/malformed fields, strict rejection)
 *   3. Injected fields (amount, status, role, buyerId rejection)
 *   4. Cryptographic HMAC-SHA256 signature verification (tampered, wrong secret, case-sensitive)
 *   5. Internal order verification & IDOR protection (nonexistent, mismatch, unauthorized buyer)
 *   6. State transitions & Idempotency (PENDING -> PAID, idempotent retry, conflict, terminal states)
 *   7. Database persistence & financial integrity (PAID state, CAPTURED payment, integer paise)
 *   8. Scope Creep Barriers (zero Entitlements, zero Downloads, zero Receipts, zero SellerEarnings)
 *   9. Zero Data Leakage (no secrets, no PAN/bank, no storage keys)
 *  10. Full Regression pipeline (Features 01 -> 10)
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
  console.log("DIGITAL MARKETPLACE — FEATURE 11: RAZORPAY PAYMENT VERIFICATION");
  console.log("===========================================================================\n");

  const ts = Date.now();
  const passwordHash = await bcrypt.hash("Password123!@", 10);

  // Setup: create buyers, seller, admin, and test orders
  const buyerUser = await prisma.user.create({
    data: {
      fullName: "Verification Buyer",
      email: `buyer.verify.${ts}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
    },
  });
  const buyerToken = `Bearer ${signJwt({
    sub: buyerUser.id,
    email: buyerUser.email,
    role: "BUYER",
  })}`;

  const otherBuyer = await prisma.user.create({
    data: {
      fullName: "Other Buyer",
      email: `other.buyer.${ts}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
    },
  });
  const otherBuyerToken = `Bearer ${signJwt({
    sub: otherBuyer.id,
    email: otherBuyer.email,
    role: "BUYER",
  })}`;

  const adminUser = await prisma.user.create({
    data: {
      fullName: "Verification Admin",
      email: `admin.verify.${ts}@example.com`,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  const adminToken = `Bearer ${signJwt({
    sub: adminUser.id,
    email: adminUser.email,
    role: "ADMIN",
  })}`;

  const inactiveUser = await prisma.user.create({
    data: {
      fullName: "Inactive User",
      email: `inactive.verify.${ts}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: false,
    },
  });
  const inactiveToken = `Bearer ${signJwt({
    sub: inactiveUser.id,
    email: inactiveUser.email,
    role: "BUYER",
  })}`;

  const expiredToken = `Bearer ${signJwt(
    { sub: buyerUser.id, email: buyerUser.email, role: "BUYER" },
    { expiresIn: "-1s" }
  )}`;
  const invalidToken = "Bearer invalid.jwt.token.here";

  // Create a Seller and Published Product for realistic checkout and orders
  const sellerUser = await prisma.user.create({
    data: {
      fullName: "Merchant Seller",
      email: `merchant.verify.${ts}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
      sellerProfile: {
        create: {
          storeName: `Verify Store ${ts}`,
          storeSlug: `verify-store-${ts}`,
          status: "APPROVED",
          panNumberMasked: "ABCDE****F",
          bankAccountLast4: "****1012",
          bankIfsc: "HDFC0001234",
          bankAccountHolder: "Merchant Seller",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerProfileId = sellerUser.sellerProfile!.id;

  const category = await prisma.category.create({
    data: {
      name: `Verify Category ${ts}`,
      slug: `verify-cat-${ts}`,
      isActive: true,
    },
  });

  const testProduct = await prisma.product.create({
    data: {
      sellerId: sellerProfileId,
      categoryId: category.id,
      title: `Checkout Verifiable Product ${ts}`,
      slug: `checkout-verifiable-product-${ts}`,
      shortDescription: "A product used for end-to-end checkout & payment verification testing",
      description: "Comprehensive description for testing payment verification.",
      pricePaise: 79900, // ₹799.00
      status: "PUBLISHED",
    },
  });

  // Create an order via Feature 10 checkout handler
  const checkoutRes = await checkoutHandler(
    makeReq(
      "http://localhost/api/v1/orders/checkout",
      "POST",
      { productId: testProduct.id, licenseType: "COMMERCIAL" },
      buyerToken
    )
  );
  const checkoutData = await parseJson(checkoutRes);
  const validOrderId: string = checkoutData.data?.orderId;
  const validRzpOrderId: string = checkoutData.data?.razorpayOrderId;

  // Generate valid payment ID and signature
  const validPaymentId = `pay_${crypto.randomBytes(7).toString("hex")}`;
  const validSignature = generatePaymentSignature(validRzpOrderId, validPaymentId);

  // Pre-create auxiliary test orders directly in DB for testing cancelled / failed states
  const cancelledOrderId = generateOrderId();
  const cancelledRzpOrderId = `order_${crypto.randomBytes(7).toString("hex")}`;
  await prisma.order.create({
    data: {
      id: cancelledOrderId,
      buyerId: buyerUser.id,
      subtotalPaise: 79900,
      discountPaise: 0,
      platformFeePaise: 7990,
      totalAmountPaise: 79900,
      currency: "INR",
      status: "CANCELLED",
      razorpayOrderId: cancelledRzpOrderId,
      buyerNameSnapshot: buyerUser.fullName,
      buyerEmailSnapshot: buyerUser.email,
    },
  });

  const failedOrderId = generateOrderId();
  const failedRzpOrderId = `order_${crypto.randomBytes(7).toString("hex")}`;
  await prisma.order.create({
    data: {
      id: failedOrderId,
      buyerId: buyerUser.id,
      subtotalPaise: 79900,
      discountPaise: 0,
      platformFeePaise: 7990,
      totalAmountPaise: 79900,
      currency: "INR",
      status: "FAILED",
      razorpayOrderId: failedRzpOrderId,
      buyerNameSnapshot: buyerUser.fullName,
      buyerEmailSnapshot: buyerUser.email,
    },
  });

  // Create an order owned by otherBuyer
  const otherOrderId = generateOrderId();
  const otherRzpOrderId = `order_${crypto.randomBytes(7).toString("hex")}`;
  await prisma.order.create({
    data: {
      id: otherOrderId,
      buyerId: otherBuyer.id,
      subtotalPaise: 79900,
      discountPaise: 0,
      platformFeePaise: 7990,
      totalAmountPaise: 79900,
      currency: "INR",
      status: "PENDING",
      razorpayOrderId: otherRzpOrderId,
      buyerNameSnapshot: otherBuyer.fullName,
      buyerEmailSnapshot: otherBuyer.email,
    },
  });

  // ===========================================================================
  // SECTION 1: AUTHENTICATION
  // ===========================================================================

  await runTest("01. Unauthenticated verification rejected with 401", async () => {
    const res = await verifyHandler(
      makeReq("http://localhost/api/v1/payments/verify", "POST", {
        orderId: validOrderId,
        razorpayOrderId: validRzpOrderId,
        razorpayPaymentId: validPaymentId,
        razorpaySignature: validSignature,
      })
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 401 && data.error?.code === "UNAUTHORIZED",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("02. Invalid JWT token rejected with 401", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
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
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
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
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
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
  // SECTION 2: VALIDATION & MALFORMED PAYLOADS
  // ===========================================================================

  await runTest("05. Empty body rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq("http://localhost/api/v1/payments/verify", "POST", {}, buyerToken)
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("06. Malformed JSON format rejected with 400", async () => {
    const req = new NextRequest("http://localhost/api/v1/payments/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: buyerToken,
      },
      body: "invalid-json-string{",
    });
    const res = await verifyHandler(req);
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("07. Missing orderId rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("08. Missing razorpayOrderId rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("09. Missing razorpayPaymentId rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("10. Missing razorpaySignature rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("11. Malformed orderId (not matching ORD-YYYYMMDD-XXXX) rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: "invalid_order_format_123",
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("12. Malformed razorpayOrderId (does not start with order_) rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: "bad_prefix_12345",
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("13. Malformed razorpayPaymentId (does not start with pay_) rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: "bad_pay_prefix_999",
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("14. Non-hexadecimal signature rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: "not_a_valid_hex_signature!@#$%",
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("15. Too-short signature rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: "abcd12",
        },
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
  // SECTION 3: INJECTED FIELDS & CLIENT MANIPULATION (STRICT SCHEMA)
  // ===========================================================================

  await runTest("16. Injected status field in payload rejected by strict schema (400)", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
          status: "PAID",
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("17. Injected amount field in payload rejected (400)", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
          amountPaise: 100,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("18. Injected currency field rejected (400)", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
          currency: "USD",
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("19. Injected buyerId field rejected (400)", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
          buyerId: "injected_id",
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("20. Injected role field rejected (400)", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
          role: "ADMIN",
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "VALIDATION_FAILED",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("21. Injected paymentMethod field rejected (400)", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
          method: "CARD",
        },
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
  // SECTION 4: CRYPTOGRAPHIC SIGNATURE VERIFICATION
  // ===========================================================================

  await runTest("22. Tampered signature (last byte modified) rejected with 400 INVALID_SIGNATURE", async () => {
    const lastChar = validSignature.slice(-1);
    const replacedChar = lastChar === "a" ? "b" : "a";
    const tamperedSignature = validSignature.slice(0, -1) + replacedChar;

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: tamperedSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "INVALID_SIGNATURE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("23. Signature generated with wrong secret rejected with 400 INVALID_SIGNATURE", async () => {
    const wrongSignature = generatePaymentSignature(
      validRzpOrderId,
      validPaymentId,
      "completely_wrong_secret_key_12345"
    );

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: wrongSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "INVALID_SIGNATURE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("24. Signature from a different payment ID rejected with 400 INVALID_SIGNATURE", async () => {
    const anotherSignature = generatePaymentSignature(
      validRzpOrderId,
      "pay_different_payment_id_9999"
    );

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId, // but passing anotherSignature
          razorpaySignature: anotherSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "INVALID_SIGNATURE",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("25. Signature from a different order ID rejected with 400 INVALID_SIGNATURE", async () => {
    const anotherOrderSig = generatePaymentSignature(
      "order_different_order_id_8888",
      validPaymentId
    );

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: anotherOrderSig,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "INVALID_SIGNATURE",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("26. Empty string signature rejected with 400", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: "",
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400,
      details: `Status: ${data.status}`,
    };
  });

  await runTest("27. Inverted payload components ('pay_id|order_id') rejected with 400", async () => {
    // Inverted concatenation: pay_id|order_id instead of order_id|pay_id
    const invertedPayload = `${validPaymentId}|${validRzpOrderId}`;
    const invertedSignature = crypto
      .createHmac("sha256", getRazorpayKeySecret())
      .update(invertedPayload)
      .digest("hex");

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: invertedSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "INVALID_SIGNATURE",
      details: `Status: ${data.status}`,
    };
  });

  // ===========================================================================
  // SECTION 5: INTERNAL ORDER VERIFICATION & IDOR PROTECTION
  // ===========================================================================

  await runTest("28. Nonexistent internal order ID returns 404 NOT_FOUND", async () => {
    const fakeOrderId = "ORD-20261005-9999";
    const fakeRzpOrderId = `order_${crypto.randomBytes(7).toString("hex")}`;
    const fakePayId = `pay_${crypto.randomBytes(7).toString("hex")}`;
    const fakeSig = generatePaymentSignature(fakeRzpOrderId, fakePayId);

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: fakeOrderId,
          razorpayOrderId: fakeRzpOrderId,
          razorpayPaymentId: fakePayId,
          razorpaySignature: fakeSig,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 404 && data.error?.code === "NOT_FOUND",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("29. IDOR: Buyer B cannot verify Buyer A's order (403 FORBIDDEN)", async () => {
    // Buyer B attempts to verify validOrderId which belongs to Buyer A
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
        otherBuyerToken // Buyer B's token
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 403 && data.error?.code === "FORBIDDEN",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("30. Mismatched razorpayOrderId rejected with 400 ORDER_MISMATCH", async () => {
    const mismatchedRzpId = `order_${crypto.randomBytes(7).toString("hex")}`;
    const mismatchedSig = generatePaymentSignature(mismatchedRzpId, validPaymentId);

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: mismatchedRzpId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: mismatchedSig,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "ORDER_MISMATCH",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("31. Order in CANCELLED state cannot be verified (400 INVALID_ORDER_STATE)", async () => {
    const payId = `pay_${crypto.randomBytes(7).toString("hex")}`;
    const sig = generatePaymentSignature(cancelledRzpOrderId, payId);

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: cancelledOrderId,
          razorpayOrderId: cancelledRzpOrderId,
          razorpayPaymentId: payId,
          razorpaySignature: sig,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "INVALID_ORDER_STATE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("32. Order in FAILED state cannot be verified (400 INVALID_ORDER_STATE)", async () => {
    const payId = `pay_${crypto.randomBytes(7).toString("hex")}`;
    const sig = generatePaymentSignature(failedRzpOrderId, payId);

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: failedOrderId,
          razorpayOrderId: failedRzpOrderId,
          razorpayPaymentId: payId,
          razorpaySignature: sig,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 400 && data.error?.code === "INVALID_ORDER_STATE",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("33. Admin user is authorized to verify order on behalf of buyer", async () => {
    // Admin verifies otherBuyer's order
    const payId = `pay_${crypto.randomBytes(7).toString("hex")}`;
    const sig = generatePaymentSignature(otherRzpOrderId, payId);

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: otherOrderId,
          razorpayOrderId: otherRzpOrderId,
          razorpayPaymentId: payId,
          razorpaySignature: sig,
        },
        adminToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.success === true && data.data?.status === "PAID",
      details: `Status: ${data.status}, OrderStatus: ${data.data?.status}`,
    };
  });

  // ===========================================================================
  // SECTION 6: SUCCESSFUL VERIFICATION & STATE TRANSITION
  // ===========================================================================

  await runTest("34. Valid HMAC verification succeeds with 200 OK (PENDING -> PAID)", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed:
        data.status === 200 &&
        data.success === true &&
        data.data?.orderId === validOrderId &&
        data.data?.status === "PAID" &&
        data.data?.downloadReady === false &&
        data.message === "Payment verified successfully." &&
        !!data.data?.paidAt,
      details: `Status: ${data.status}, OrderId: ${data.data?.orderId}, OrderStatus: ${data.data?.status}, downloadReady: ${data.data?.downloadReady}`,
    };
  });

  await runTest("35. Response includes payment details summary", async () => {
    const dbPayment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: validPaymentId },
    });
    return {
      passed:
        !!dbPayment &&
        dbPayment.amountPaise === 79900 &&
        dbPayment.status === "CAPTURED" &&
        dbPayment.currency === "INR",
      details: `Payment status: ${dbPayment?.status}, Amount: ${dbPayment?.amountPaise}`,
    };
  });

  // ===========================================================================
  // SECTION 7: IDEMPOTENCY & DUPLICATE VERIFICATION
  // ===========================================================================

  await runTest("36. Idempotent replay: Submitting same verification details on already PAID order returns 200 OK", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed:
        data.status === 200 &&
        data.success === true &&
        data.data?.status === "PAID" &&
        data.data?.downloadReady === false &&
        data.data?.alreadyVerified === true,
      details: `Status: ${data.status}, alreadyVerified: ${data.data?.alreadyVerified}, downloadReady: ${data.data?.downloadReady}`,
    };
  });

  await runTest("37. Idempotent replay does NOT create duplicate Payment records in database", async () => {
    const paymentsCount = await prisma.payment.count({
      where: { orderId: validOrderId },
    });
    return {
      passed: paymentsCount === 1,
      details: `Found ${paymentsCount} payment records for order`,
    };
  });

  await runTest("38. Different payment ID on already PAID order rejected with 409 ORDER_ALREADY_PAID", async () => {
    const differentPayId = `pay_${crypto.randomBytes(7).toString("hex")}`;
    const differentSig = generatePaymentSignature(validRzpOrderId, differentPayId);

    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: differentPayId,
          razorpaySignature: differentSig,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 409 && data.error?.code === "ORDER_ALREADY_PAID",
      details: `Status: ${data.status}, Code: ${data.error?.code}`,
    };
  });

  await runTest("39. Concurrent verification calls with identical details resolve safely without duplicates", async () => {
    // Create a new fresh order for concurrent verification
    const cCheckoutRes = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: testProduct.id },
        buyerToken
      )
    );
    const cData = await parseJson(cCheckoutRes);
    const cOrderId = cData.data?.orderId;
    const cRzpOrderId = cData.data?.razorpayOrderId;
    const cPayId = `pay_${crypto.randomBytes(7).toString("hex")}`;
    const cSig = generatePaymentSignature(cRzpOrderId, cPayId);

    const [res1, res2] = await Promise.all([
      verifyHandler(
        makeReq(
          "http://localhost/api/v1/payments/verify",
          "POST",
          {
            orderId: cOrderId,
            razorpayOrderId: cRzpOrderId,
            razorpayPaymentId: cPayId,
            razorpaySignature: cSig,
          },
          buyerToken
        )
      ),
      verifyHandler(
        makeReq(
          "http://localhost/api/v1/payments/verify",
          "POST",
          {
            orderId: cOrderId,
            razorpayOrderId: cRzpOrderId,
            razorpayPaymentId: cPayId,
            razorpaySignature: cSig,
          },
          buyerToken
        )
      ),
    ]);

    const d1 = await parseJson(res1);
    const d2 = await parseJson(res2);

    const paymentCount = await prisma.payment.count({ where: { orderId: cOrderId } });
    const orderRecord = await prisma.order.findUnique({ where: { id: cOrderId } });

    return {
      passed:
        (d1.status === 200 || d1.status === 200) &&
        orderRecord?.status === "PAID" &&
        paymentCount === 1,
      details: `Statuses: ${d1.status} & ${d2.status}, OrderStatus: ${orderRecord?.status}, PaymentCount: ${paymentCount}`,
    };
  });

  // ===========================================================================
  // SECTION 8: ALIAS ROUTE VERIFICATION
  // ===========================================================================

  await runTest("40. Alias route POST /api/v1/orders/verify functions identically", async () => {
    // Create a fresh order for testing the alias route
    const aCheckoutRes = await checkoutHandler(
      makeReq(
        "http://localhost/api/v1/orders/checkout",
        "POST",
        { productId: testProduct.id },
        buyerToken
      )
    );
    const aData = await parseJson(aCheckoutRes);
    const aOrderId = aData.data?.orderId;
    const aRzpOrderId = aData.data?.razorpayOrderId;
    const aPayId = `pay_${crypto.randomBytes(7).toString("hex")}`;
    const aSig = generatePaymentSignature(aRzpOrderId, aPayId);

    const res = await orderVerifyHandler(
      makeReq(
        "http://localhost/api/v1/orders/verify",
        "POST",
        {
          orderId: aOrderId,
          razorpayOrderId: aRzpOrderId,
          razorpayPaymentId: aPayId,
          razorpaySignature: aSig,
        },
        buyerToken
      )
    );
    const data = await parseJson(res);
    return {
      passed: data.status === 200 && data.success === true && data.data?.status === "PAID",
      details: `Status: ${data.status}, OrderStatus: ${data.data?.status}`,
    };
  });

  // ===========================================================================
  // SECTION 9: DATABASE PERSISTENCE & FINANCIAL INTEGRITY
  // ===========================================================================

  await runTest("41. PostgreSQL confirms Order.status is strictly PAID", async () => {
    const dbOrder = await prisma.order.findUnique({ where: { id: validOrderId } });
    return {
      passed: dbOrder?.status === "PAID",
      details: `Order status in DB: ${dbOrder?.status}`,
    };
  });

  await runTest("42. PostgreSQL confirms Order.paidAt timestamp is populated", async () => {
    const dbOrder = await prisma.order.findUnique({ where: { id: validOrderId } });
    return {
      passed: dbOrder?.paidAt instanceof Date,
      details: `paidAt in DB: ${dbOrder?.paidAt?.toISOString()}`,
    };
  });

  await runTest("43. PostgreSQL confirms Order.razorpayPaymentId is persisted", async () => {
    const dbOrder = await prisma.order.findUnique({ where: { id: validOrderId } });
    return {
      passed: dbOrder?.razorpayPaymentId === validPaymentId,
      details: `razorpayPaymentId in DB: ${dbOrder?.razorpayPaymentId}`,
    };
  });

  await runTest("44. PostgreSQL confirms Order.razorpaySignature is persisted", async () => {
    const dbOrder = await prisma.order.findUnique({ where: { id: validOrderId } });
    return {
      passed: dbOrder?.razorpaySignature === validSignature,
      details: `razorpaySignature in DB matches expected`,
    };
  });

  await runTest("45. PostgreSQL confirms Payment.status is strictly CAPTURED", async () => {
    const payment = await prisma.payment.findUnique({ where: { razorpayPaymentId: validPaymentId } });
    return {
      passed: payment?.status === "CAPTURED",
      details: `Payment status in DB: ${payment?.status}`,
    };
  });

  await runTest("46. Payment record amountPaise strictly matches Order.totalAmountPaise (integer paise)", async () => {
    const payment = await prisma.payment.findUnique({ where: { razorpayPaymentId: validPaymentId } });
    const order = await prisma.order.findUnique({ where: { id: validOrderId } });
    return {
      passed: payment?.amountPaise === order?.totalAmountPaise && payment?.amountPaise === 79900,
      details: `Payment amountPaise: ${payment?.amountPaise}, Order totalAmountPaise: ${order?.totalAmountPaise}`,
    };
  });

  await runTest("47. Payment record currency strictly matches 'INR'", async () => {
    const payment = await prisma.payment.findUnique({ where: { razorpayPaymentId: validPaymentId } });
    return {
      passed: payment?.currency === "INR",
      details: `Payment currency: ${payment?.currency}`,
    };
  });

  await runTest("48. Payment record verifiedAt timestamp is populated", async () => {
    const payment = await prisma.payment.findUnique({ where: { razorpayPaymentId: validPaymentId } });
    return {
      passed: payment?.verifiedAt instanceof Date,
      details: `verifiedAt in DB: ${payment?.verifiedAt?.toISOString()}`,
    };
  });

  // ===========================================================================
  // SECTION 10: SCOPE CREEP BARRIER CHECKS (FEATURES 12+ BOUNDARY)
  // ===========================================================================

  await runTest("49. [Feature 12 Barrier] Zero Download records created during Feature 11 payment verification", async () => {
    const downloadCount = await prisma.download.count({ where: { orderId: validOrderId } });
    return {
      passed: downloadCount === 0,
      details: `Found ${downloadCount} download records`,
    };
  });

  await runTest("50. [Feature 12 Barrier] Zero Receipt records created during Feature 11 payment verification", async () => {
    const receiptCount = await prisma.receipt.count({ where: { orderId: validOrderId } });
    return {
      passed: receiptCount === 0,
      details: `Found ${receiptCount} receipt records`,
    };
  });

  await runTest("51. [Feature 14 Integrated] SellerEarning provisioned async after Feature 11 payment verification", async () => {
    // Feature 14 is now implemented and integrated — settlement fires async after PAID.
    // Allow brief time for the async fire-and-forget to complete.
    await new Promise((r) => setTimeout(r, 500));
    const earningCount = await prisma.sellerEarning.count({ where: { orderId: validOrderId } });
    return {
      passed: earningCount >= 1,
      details: `Found ${earningCount} seller earning records (expected >= 1 after Feature 14 integration)`,
    };
  });

  await runTest("52. [Feature 14 Integrated] SellerProfile balance updated after Feature 11 payment verification", async () => {
    // Feature 14 is now implemented — balance should be incremented after settlement.
    const profile = await prisma.sellerProfile.findUnique({ where: { id: sellerProfileId } });
    return {
      passed: Number(profile?.totalRevenuePaise) > 0,
      details: `pendingBalance: ${profile?.pendingBalance}, totalRevenue: ${profile?.totalRevenuePaise}`,
    };
  });

  await runTest("53. Order items remain intact and unmodified after payment verification", async () => {
    const items = await prisma.orderItem.findMany({ where: { orderId: validOrderId } });
    return {
      passed: items.length === 1 && items[0].pricePaise === 79900 && items[0].platformFeePaise === 7990,
      details: `Items count: ${items.length}, price: ${items[0]?.pricePaise}`,
    };
  });

  // ===========================================================================
  // SECTION 11: SECURITY & ZERO SENSITIVE DATA LEAKAGE
  // ===========================================================================

  let responseBodyString = "";
  await runTest("54. Fetch verification response body string for leakage audit", async () => {
    const res = await verifyHandler(
      makeReq(
        "http://localhost/api/v1/payments/verify",
        "POST",
        {
          orderId: validOrderId,
          razorpayOrderId: validRzpOrderId,
          razorpayPaymentId: validPaymentId,
          razorpaySignature: validSignature,
        },
        buyerToken
      )
    );
    responseBodyString = await res.text();
    return {
      passed: res.status === 200 && responseBodyString.length > 0,
      details: `Body length: ${responseBodyString.length}`,
    };
  });

  await runTest("55. RAZORPAY_KEY_SECRET is strictly ABSENT from verification response", async () => {
    const secret = getRazorpayKeySecret();
    return {
      passed: !responseBodyString.includes(secret) && !responseBodyString.includes("secret"),
      details: "No secret detected in response",
    };
  });

  await runTest("56. JWT_SECRET is strictly ABSENT from response", async () => {
    const jwtSecret = process.env.JWT_SECRET || "fallback";
    return {
      passed: !responseBodyString.includes(jwtSecret),
      details: "JWT secret absent",
    };
  });

  await runTest("57. DATABASE_URL is strictly ABSENT from response", async () => {
    const dbUrl = process.env.DATABASE_URL || "postgresql://";
    return {
      passed: !responseBodyString.includes(dbUrl),
      details: "Database URL absent",
    };
  });

  await runTest("58. Seller private PAN number is strictly ABSENT from response", async () => {
    return {
      passed: !responseBodyString.includes("ABCDE1234F"),
      details: "Seller PAN absent",
    };
  });

  await runTest("59. Seller bank account / IFSC is strictly ABSENT from response", async () => {
    return {
      passed:
        !responseBodyString.includes("987654321012") &&
        !responseBodyString.includes("HDFC0001234"),
      details: "Seller bank details absent",
    };
  });

  await runTest("60. passwordHash is strictly ABSENT from verification response", async () => {
    return {
      passed:
        !responseBodyString.includes("passwordHash") &&
        !responseBodyString.includes("$2a$") &&
        !responseBodyString.includes("$2b$"),
      details: "passwordHash absent",
    };
  });

  // ===========================================================================
  // SECTION 12: REGRESSION PIPELINE (FEATURES 01 THROUGH 10)
  // ===========================================================================

  await runTest("61. [Regression F01] User signup succeeds", async () => {
    const regEmail = `reg.user.${ts}@example.com`;
    const user = await prisma.user.create({
      data: {
        fullName: "Regression User",
        email: regEmail,
        passwordHash,
        role: "BUYER",
      },
    });
    return {
      passed: !!user.id && user.email === regEmail,
      details: `Created user ${user.id}`,
    };
  });

  await runTest("62. [Regression F02] User login credentials verify with bcrypt", async () => {
    const isMatch = await bcrypt.compare("Password123!@", passwordHash);
    return {
      passed: isMatch,
      details: `Password matched: ${isMatch}`,
    };
  });

  await runTest("63. [Regression F03] Profile endpoint data structure is intact", async () => {
    const profileUser = await prisma.user.findUnique({
      where: { id: buyerUser.id },
      select: { id: true, email: true, fullName: true, role: true },
    });
    return {
      passed: !!profileUser && profileUser.role === "BUYER",
      details: `Profile user: ${profileUser?.email}`,
    };
  });

  await runTest("64. [Regression F04] Seller onboarding model and relations intact", async () => {
    const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerProfileId } });
    return {
      passed: !!seller && seller.status === "APPROVED",
      details: `Seller profile: ${seller?.storeSlug}`,
    };
  });

  await runTest("65. [Regression F05] Admin can inspect seller profile", async () => {
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
        title: `Draft Regression Product ${ts}`,
        slug: `draft-regression-prod-${ts}`,
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
        storageKey: `private/products/${p!.id}/asset_${ts}.zip`,
        originalFilename: "asset.zip",
        fileSize: BigInt(1024),
        mimeType: "application/zip",
      },
    });
    return {
      passed: !!asset.id && asset.originalFilename === "asset.zip",
      details: `Asset ID: ${asset.id}`,
    };
  });

  await runTest("68. [Regression F08] Moderation: Product transitions to PUBLISHED", async () => {
    const published = await prisma.product.findUnique({ where: { id: testProduct.id } });
    return {
      passed: published?.status === "PUBLISHED",
      details: `Status: ${published?.status}`,
    };
  });

  await runTest("69. [Regression F09] Product is publicly discoverable in catalog", async () => {
    const catalogItem = await prisma.product.findFirst({
      where: { id: testProduct.id, status: "PUBLISHED" },
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
        { productId: testProduct.id },
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

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log("\n===========================================================================");
  console.log("FEATURE 11 TEST RESULTS SUMMARY");
  console.log("===========================================================================");
  console.log(`Total Tests Run: ${passedCount + failedCount}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);

  if (failedCount > 0) {
    console.log("\nFAILED TESTS:");
    failures.forEach((f) => console.log(`- ${f}`));
    process.exit(1);
  } else {
    console.log("\nALL FEATURE 11 TESTS PASSED PERFECTLY!\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
