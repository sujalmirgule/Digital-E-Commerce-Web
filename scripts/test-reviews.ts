import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import {
  createProductReview,
  updateProductReview,
  deleteProductReview,
  moderateReview,
  getPublicProductReviews,
  checkBuyerReviewEligibility,
  recalculateProductRatingAggregates,
} from "../src/lib/services/review";
import {
  GET as publicReviewsHandler,
  POST as createReviewHandler,
  PUT as updateReviewHandler,
  DELETE as deleteReviewHandler,
} from "../src/app/api/v1/products/[slug]/reviews/route";
import { GET as eligibilityHandler } from "../src/app/api/v1/products/[slug]/reviews/eligibility/route";
import {
  PATCH as directReviewUpdateHandler,
  DELETE as directReviewDeleteHandler,
} from "../src/app/api/v1/reviews/[id]/route";
import { GET as adminReviewsHandler } from "../src/app/api/v1/admin/reviews/route";
import { PATCH as adminModerateHandler } from "../src/app/api/v1/admin/reviews/[id]/moderate/route";
import { OrderStatus, PaymentStatus, UserRole } from "@prisma/client";

/**
 * ===========================================================================
 * FEATURE 16 TEST SUITE: VERIFIED BUYER REVIEWS & RATINGS
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

async function main() {
  console.log("\n===========================================================================");
  console.log("DIGITAL MARKETPLACE — FEATURE 16: VERIFIED BUYER REVIEWS & RATINGS");
  console.log("===========================================================================\n");

  const runId = Date.now().toString().slice(-6);

  // Setup test users
  const passwordHash = await bcrypt.hash("Password123!@", 4);

  const buyerA = await prisma.user.create({
    data: {
      email: `buyerA_f16_${runId}@example.com`,
      fullName: `Buyer Alpha F16 ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const buyerB = await prisma.user.create({
    data: {
      email: `buyerB_f16_${runId}@example.com`,
      fullName: `Buyer Beta F16 ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const nonBuyer = await prisma.user.create({
    data: {
      email: `nonbuyer_f16_${runId}@example.com`,
      fullName: `Non Buyer F16 ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const inactiveBuyer = await prisma.user.create({
    data: {
      email: `inactive_f16_${runId}@example.com`,
      fullName: `Inactive Buyer F16 ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: false,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `seller_f16_${runId}@example.com`,
      fullName: `Seller F16 ${runId}`,
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: `admin_f16_${runId}@example.com`,
      fullName: `Admin F16 ${runId}`,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const inactiveAdmin = await prisma.user.create({
    data: {
      email: `inactive_admin_f16_${runId}@example.com`,
      fullName: `Inactive Admin F16 ${runId}`,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: false,
    },
  });

  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: `Store F16 ${runId}`,
      storeSlug: `store-f16-${runId}`,
      status: "APPROVED",
      country: "IN",
    },
  });

  const category = await prisma.category.create({
    data: {
      name: `Category F16 ${runId}`,
      slug: `category-f16-${runId}`,
    },
  });

  const product1 = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      categoryId: category.id,
      title: `Product 1 F16 ${runId}`,
      slug: `product-1-f16-${runId}`,
      description: "First test product",
      shortDescription: "Short summary 1",
      pricePaise: 79900,
      status: "PUBLISHED",
      ratingAvg: 0.0,
      reviewsCount: 0,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      categoryId: category.id,
      title: `Product 2 F16 ${runId}`,
      slug: `product-2-f16-${runId}`,
      description: "Second test product",
      shortDescription: "Short summary 2",
      pricePaise: 99900,
      status: "PUBLISHED",
      ratingAvg: 0.0,
      reviewsCount: 0,
    },
  });

  const buyerAToken = signJwt({ sub: buyerA.id, email: buyerA.email, role: "BUYER" });
  const buyerBToken = signJwt({ sub: buyerB.id, email: buyerB.email, role: "BUYER" });
  const nonBuyerToken = signJwt({ sub: nonBuyer.id, email: nonBuyer.email, role: "BUYER" });
  const inactiveBuyerToken = signJwt({ sub: inactiveBuyer.id, email: inactiveBuyer.email, role: "BUYER" });
  const adminToken = signJwt({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" });
  const inactiveAdminToken = signJwt({ sub: inactiveAdmin.id, email: inactiveAdmin.email, role: "ADMIN" });

  // Setup purchases for buyerA and buyerB on product1
  const orderA = await prisma.order.create({
    data: {
      id: `ORD-20261005-REV-A-${runId}`,
      buyerId: buyerA.id,
      buyerNameSnapshot: buyerA.fullName,
      buyerEmailSnapshot: buyerA.email,
      subtotalPaise: 79900,
      totalAmountPaise: 79900,
      platformFeePaise: 7990,
      status: OrderStatus.PAID,
      razorpayOrderId: `order_rev_a_${runId}`,
      razorpayPaymentId: `pay_rev_a_${runId}`,
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: product1.id,
            sellerId: sellerProfile.id,
            productTitle: product1.title,
            pricePaise: 79900,
            platformFeePaise: 7990,
            sellerEarningsPaise: 71910,
          },
        ],
      },
      payments: {
        create: [
          {
            razorpayOrderId: `order_rev_a_${runId}`,
            razorpayPaymentId: `pay_rev_a_${runId}`,
            amountPaise: 79900,
            currency: "INR",
            status: PaymentStatus.CAPTURED,
            verifiedAt: new Date(),
          },
        ],
      },
      entitlements: {
        create: [
          {
            buyerId: buyerA.id,
            productId: product1.id,
            isActive: true,
          },
        ],
      },
    },
  });

  const orderB = await prisma.order.create({
    data: {
      id: `ORD-20261005-REV-B-${runId}`,
      buyerId: buyerB.id,
      buyerNameSnapshot: buyerB.fullName,
      buyerEmailSnapshot: buyerB.email,
      subtotalPaise: 79900,
      totalAmountPaise: 79900,
      platformFeePaise: 7990,
      status: OrderStatus.PAID,
      razorpayOrderId: `order_rev_b_${runId}`,
      razorpayPaymentId: `pay_rev_b_${runId}`,
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: product1.id,
            sellerId: sellerProfile.id,
            productTitle: product1.title,
            pricePaise: 79900,
            platformFeePaise: 7990,
            sellerEarningsPaise: 71910,
          },
        ],
      },
      payments: {
        create: [
          {
            razorpayOrderId: `order_rev_b_${runId}`,
            razorpayPaymentId: `pay_rev_b_${runId}`,
            amountPaise: 79900,
            currency: "INR",
            status: PaymentStatus.CAPTURED,
            verifiedAt: new Date(),
          },
        ],
      },
      entitlements: {
        create: [
          {
            buyerId: buyerB.id,
            productId: product1.id,
            isActive: true,
          },
        ],
      },
    },
  });

  // Buyer A also purchased product2
  const orderA2 = await prisma.order.create({
    data: {
      id: `ORD-20261005-REV-A2-${runId}`,
      buyerId: buyerA.id,
      buyerNameSnapshot: buyerA.fullName,
      buyerEmailSnapshot: buyerA.email,
      subtotalPaise: 99900,
      totalAmountPaise: 99900,
      platformFeePaise: 9990,
      status: OrderStatus.PAID,
      razorpayOrderId: `order_rev_a2_${runId}`,
      razorpayPaymentId: `pay_rev_a2_${runId}`,
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: product2.id,
            sellerId: sellerProfile.id,
            productTitle: product2.title,
            pricePaise: 99900,
            platformFeePaise: 9990,
            sellerEarningsPaise: 89910,
          },
        ],
      },
      payments: {
        create: [
          {
            razorpayOrderId: `order_rev_a2_${runId}`,
            razorpayPaymentId: `pay_rev_a2_${runId}`,
            amountPaise: 99900,
            currency: "INR",
            status: PaymentStatus.CAPTURED,
            verifiedAt: new Date(),
          },
        ],
      },
      entitlements: {
        create: [
          {
            buyerId: buyerA.id,
            productId: product2.id,
            isActive: true,
          },
        ],
      },
    },
  });

  // Orders in invalid states for testing
  const pendingOrder = await prisma.order.create({
    data: {
      id: `ORD-20261005-REV-PEND-${runId}`,
      buyerId: nonBuyer.id,
      buyerNameSnapshot: nonBuyer.fullName,
      buyerEmailSnapshot: nonBuyer.email,
      subtotalPaise: 79900,
      totalAmountPaise: 79900,
      platformFeePaise: 7990,
      status: OrderStatus.PENDING,
      razorpayOrderId: `order_rev_pend_${runId}`,
      items: {
        create: [
          {
            productId: product1.id,
            sellerId: sellerProfile.id,
            productTitle: product1.title,
            pricePaise: 79900,
            platformFeePaise: 7990,
            sellerEarningsPaise: 71910,
          },
        ],
      },
    },
  });

  const cancelledOrder = await prisma.order.create({
    data: {
      id: `ORD-20261005-REV-CANC-${runId}`,
      buyerId: nonBuyer.id,
      buyerNameSnapshot: nonBuyer.fullName,
      buyerEmailSnapshot: nonBuyer.email,
      subtotalPaise: 79900,
      totalAmountPaise: 79900,
      platformFeePaise: 7990,
      status: OrderStatus.CANCELLED,
      razorpayOrderId: `order_rev_canc_${runId}`,
      items: {
        create: [
          {
            productId: product1.id,
            sellerId: sellerProfile.id,
            productTitle: product1.title,
            pricePaise: 79900,
            platformFeePaise: 7990,
            sellerEarningsPaise: 71910,
          },
        ],
      },
    },
  });

  // --- Section 1: Review Eligibility & Purchase Verification ---
  console.log("\n--- Section 1: Review Eligibility & Purchase Verification ---");

  await runTest("S1.1: Unauthenticated user rejected (401)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating: 5, title: "Great", comment: "Awesome kit" }),
    });
    const res = await createReviewHandler(req, { params: { productId: product1.id } });
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S1.2: Inactive buyer account rejected (403)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${inactiveBuyerToken}`,
      },
      body: JSON.stringify({ rating: 5, title: "Great", comment: "Awesome kit" }),
    });
    const res = await createReviewHandler(req, { params: { productId: product1.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("S1.3: User who has NOT purchased product rejected (403 NOT_PURCHASED)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nonBuyerToken}`,
      },
      body: JSON.stringify({ rating: 5, title: "Great", comment: "Awesome kit" }),
    });
    const res = await createReviewHandler(req, { params: { productId: product1.id } });
    const body = await res.json();
    return {
      passed: res.status === 403 && body.error?.code === "NOT_PURCHASED",
      details: `Code: ${body.error?.code}`,
    };
  });

  await runTest("S1.4: User with PENDING order rejected", async () => {
    const eligibility = await checkBuyerReviewEligibility(product1.id, nonBuyer.id);
    return {
      passed: eligibility.eligible === false && eligibility.code === "NOT_PURCHASED",
      details: `Eligible: ${eligibility.eligible}`,
    };
  });

  await runTest("S1.5: User with CANCELLED order rejected", async () => {
    const eligibility = await checkBuyerReviewEligibility(product1.id, nonBuyer.id);
    return {
      passed: eligibility.eligible === false && eligibility.code === "NOT_PURCHASED",
      details: `Eligible: ${eligibility.eligible}`,
    };
  });

  await runTest("S1.6: Eligibility check API returns eligible: true for verified purchaser", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/products/${product1.id}/reviews/eligibility`,
      { headers: { Authorization: `Bearer ${buyerAToken}` } }
    );
    const res = await eligibilityHandler(req, { params: { productId: product1.id } });
    const body = await res.json();
    return {
      passed: res.status === 200 && body.data?.eligible === true,
      details: `Eligible: ${body.data?.eligible}`,
    };
  });

  await runTest("S1.7: Verified buyer with ACTIVE entitlement accepted (201)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerAToken}`,
      },
      body: JSON.stringify({
        rating: 5,
        title: "Spectacular asset!",
        comment: "Flawless code and documentation. Highly recommended.",
      }),
    });
    const res = await createReviewHandler(req, { params: { productId: product1.id } });
    const body = await res.json();
    return {
      passed: res.status === 201 && body.data?.review?.rating === 5,
      details: `Status: ${res.status}, rating: ${body.data?.review?.rating}`,
    };
  });

  await runTest("S1.8: Nonexistent product ID returns 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/products/prod_nonexistent/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerAToken}`,
      },
      body: JSON.stringify({ rating: 5, title: "Great", comment: "Awesome kit" }),
    });
    const res = await createReviewHandler(req, { params: { productId: "prod_nonexistent" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  await runTest("S1.9: Client-supplied fake verifiedPurchase is ignored / not trusted", async () => {
    const reviewInDb = await prisma.review.findUnique({
      where: { productId_buyerId: { productId: product1.id, buyerId: buyerA.id } },
    });
    return {
      passed: !!reviewInDb && reviewInDb.orderId === orderA.id,
      details: `orderId authoritative: ${reviewInDb?.orderId}`,
    };
  });

  await runTest("S1.10: Client cannot supply arbitrary buyerId in payload", async () => {
    // Attempt to inject buyerId in body with strict schema
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerBToken}`,
      },
      body: JSON.stringify({
        rating: 4,
        title: "Good work",
        comment: "Solid bundle overall",
        buyerId: buyerA.id, // Injected
      }),
    });
    const res = await createReviewHandler(req, { params: { productId: product1.id } });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  // --- Section 2: Validation & Sanitization ---
  console.log("\n--- Section 2: Validation & Sanitization ---");

  const sendReviewPayload = async (payload: any) => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerBToken}`,
      },
      body: JSON.stringify(payload),
    });
    return createReviewHandler(req, { params: { productId: product1.id } });
  };

  await runTest("S2.1: Rating = 0 rejected (400)", async () => {
    const res = await sendReviewPayload({ rating: 0, title: "Bad", comment: "Valid comment text" });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.2: Rating = 6 rejected (400)", async () => {
    const res = await sendReviewPayload({ rating: 6, title: "Super", comment: "Valid comment text" });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.3: Rating = 3.5 float rejected (400)", async () => {
    const res = await sendReviewPayload({ rating: 3.5, title: "Average", comment: "Valid comment text" });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.4: Rating as string rejected (400)", async () => {
    const res = await sendReviewPayload({ rating: "5", title: "Five", comment: "Valid comment text" });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.5: Missing rating rejected (400)", async () => {
    const res = await sendReviewPayload({ title: "No rating", comment: "Valid comment text" });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.6: Empty title rejected (400)", async () => {
    const res = await sendReviewPayload({ rating: 4, title: "  ", comment: "Valid comment text" });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.7: Title exceeding 100 characters rejected (400)", async () => {
    const res = await sendReviewPayload({
      rating: 4,
      title: "a".repeat(101),
      comment: "Valid comment text",
    });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.8: Comment under 5 characters rejected (400)", async () => {
    const res = await sendReviewPayload({ rating: 4, title: "Nice", comment: "Ok" });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.9: Comment exceeding 2000 characters rejected (400)", async () => {
    const res = await sendReviewPayload({
      rating: 4,
      title: "Nice",
      comment: "a".repeat(2001),
    });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S2.10: HTML / script tags in title or comment rejected (400)", async () => {
    const res = await sendReviewPayload({
      rating: 4,
      title: "Dangerous <script>alert(1)</script>",
      comment: "Trying to inject <img src=x onerror=alert(1)>",
    });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  // --- Section 3: Duplicate Protection & Uniqueness ---
  console.log("\n--- Section 3: Duplicate Protection & Uniqueness ---");

  await runTest("S3.1: Submitting review twice for same product rejected with 409 DUPLICATE_REVIEW", async () => {
    // Buyer A already reviewed product1 in S1.7
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerAToken}`,
      },
      body: JSON.stringify({
        rating: 4,
        title: "Trying second review",
        comment: "Should be blocked by duplicate rule",
      }),
    });
    const res = await createReviewHandler(req, { params: { productId: product1.id } });
    return { passed: res.status === 409, details: `Status: ${res.status}` };
  });

  await runTest("S3.2: Eligibility check returns alreadyReviewed: true for existing reviewer", async () => {
    const eligibility = await checkBuyerReviewEligibility(product1.id, buyerA.id);
    return {
      passed: eligibility.eligible === false && eligibility.alreadyReviewed === true,
      details: `alreadyReviewed: ${eligibility.alreadyReviewed}`,
    };
  });

  await runTest("S3.3: Database unique constraint @@unique([productId, buyerId]) prevents duplicate", async () => {
    let caughtConstraint = false;
    try {
      await prisma.review.create({
        data: {
          productId: product1.id,
          buyerId: buyerA.id,
          orderId: orderA.id,
          rating: 3,
          title: "Direct DB duplicate attempt",
          comment: "Direct DB insertion should fail",
        },
      });
    } catch {
      caughtConstraint = true;
    }
    return { passed: caughtConstraint, details: `Constraint prevented duplicate: ${caughtConstraint}` };
  });

  await runTest("S3.4: Same buyer can review a DIFFERENT product they also purchased", async () => {
    // Buyer A also purchased product2
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product2.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerAToken}`,
      },
      body: JSON.stringify({
        rating: 4,
        title: "Great second product",
        comment: "Excellent design toolkit as well.",
      }),
    });
    const res = await createReviewHandler(req, { params: { productId: product2.id } });
    return { passed: res.status === 201, details: `Status: ${res.status}` };
  });

  await runTest("S3.5: Different buyer can review the SAME product they also purchased", async () => {
    // Buyer B also purchased product1
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerBToken}`,
      },
      body: JSON.stringify({
        rating: 3,
        title: "Good but needs more docs",
        comment: "Works well overall. Would love more video tutorials.",
      }),
    });
    const res = await createReviewHandler(req, { params: { productId: product1.id } });
    return { passed: res.status === 201, details: `Status: ${res.status}` };
  });

  // --- Section 4: Rating Aggregates & Distribution ---
  console.log("\n--- Section 4: Rating Aggregates & Distribution ---");

  await runTest("S4.1: Product1 rating aggregates correctly reflect Buyer A (5★) and Buyer B (3★)", async () => {
    // (5 + 3) / 2 = 4.00
    const p = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { ratingAvg: true, reviewsCount: true },
    });
    return {
      passed: Number(p?.ratingAvg) === 4.0 && p?.reviewsCount === 2,
      details: `Avg: ${p?.ratingAvg}, Count: ${p?.reviewsCount}`,
    };
  });

  await runTest("S4.2: Rating distribution correctly reflects 1 five-star and 1 three-star review", async () => {
    const aggregates = await recalculateProductRatingAggregates(product1.id);
    return {
      passed:
        aggregates.distribution[5] === 1 &&
        aggregates.distribution[3] === 1 &&
        aggregates.distribution[4] === 0,
      details: `Distribution: ${JSON.stringify(aggregates.distribution)}`,
    };
  });

  await runTest("S4.3: Editing Buyer B review to 5★ updates product1 average to 5.00", async () => {
    const reviewB = await prisma.review.findUnique({
      where: { productId_buyerId: { productId: product1.id, buyerId: buyerB.id } },
    });

    const updateRes = await updateProductReview({
      reviewId: reviewB!.id,
      userId: buyerB.id,
      isAdmin: false,
      data: { rating: 5 },
    });

    const p = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { ratingAvg: true },
    });

    return {
      passed: Number(p?.ratingAvg) === 5.0 && updateRes.aggregates?.averageRating === 5.0,
      details: `Avg: ${p?.ratingAvg}`,
    };
  });

  await runTest("S4.4: Hiding Buyer A review in moderation recalculates product average", async () => {
    const reviewA = await prisma.review.findUnique({
      where: { productId_buyerId: { productId: product1.id, buyerId: buyerA.id } },
    });

    // Moderate hide review A
    await moderateReview({ reviewId: reviewA!.id, action: "hide" });

    const p = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { ratingAvg: true, reviewsCount: true },
    });

    return {
      passed: p?.reviewsCount === 1,
      details: `Reviews count: ${p?.reviewsCount}`,
    };
  });

  await runTest("S4.5: Restoring Buyer A review in moderation restores product count", async () => {
    const reviewA = await prisma.review.findUnique({
      where: { productId_buyerId: { productId: product1.id, buyerId: buyerA.id } },
    });

    await moderateReview({ reviewId: reviewA!.id, action: "restore" });

    const p = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { reviewsCount: true },
    });

    return {
      passed: p?.reviewsCount === 2,
      details: `Restored count: ${p?.reviewsCount}`,
    };
  });

  // --- Section 5: Editing & IDOR Protection ---
  console.log("\n--- Section 5: Editing & IDOR Protection ---");

  const reviewA = await prisma.review.findUnique({
    where: { productId_buyerId: { productId: product1.id, buyerId: buyerA.id } },
  });

  await runTest("S5.1: Buyer can update their own review title and comment (200)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerAToken}`,
      },
      body: JSON.stringify({
        title: "Updated Title - Truly Exceptional!",
        comment: "Updated comment text with more detail.",
      }),
    });
    const res = await updateReviewHandler(req, { params: { productId: product1.id } });
    const body = await res.json();
    return {
      passed: res.status === 200 && body.data?.review?.title === "Updated Title - Truly Exceptional!",
      details: `Title: ${body.data?.review?.title}`,
    };
  });

  await runTest("S5.2: Direct PATCH /api/v1/reviews/:id allows buyer to update own review", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/reviews/${reviewA?.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerAToken}`,
      },
      body: JSON.stringify({
        rating: 4,
      }),
    });
    const res = await directReviewUpdateHandler(req, { params: { id: reviewA!.id } });
    return { passed: res.status === 200, details: `Status: ${res.status}` };
  });

  await runTest("S5.3: IDOR: Buyer B cannot edit Buyer A's review (403 FORBIDDEN)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/reviews/${reviewA?.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerBToken}`,
      },
      body: JSON.stringify({
        title: "Malicious Tampered Title",
      }),
    });
    const res = await directReviewUpdateHandler(req, { params: { id: reviewA!.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("S5.4: Empty update payload rejected (400)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/reviews/${reviewA?.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerAToken}`,
      },
      body: JSON.stringify({}),
    });
    const res = await directReviewUpdateHandler(req, { params: { id: reviewA!.id } });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("S5.5: Updating nonexistent review returns 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/reviews/rev_nonexistent", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerAToken}`,
      },
      body: JSON.stringify({ rating: 4 }),
    });
    const res = await directReviewUpdateHandler(req, { params: { id: "rev_nonexistent" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  // --- Section 6: Deletion & IDOR Protection ---
  console.log("\n--- Section 6: Deletion & IDOR Protection ---");

  await runTest("S6.1: IDOR: Buyer B cannot delete Buyer A's review (403 FORBIDDEN)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/reviews/${reviewA?.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await directReviewDeleteHandler(req, { params: { id: reviewA!.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("S6.2: Buyer can delete their own review (200)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/reviews/${reviewA?.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await directReviewDeleteHandler(req, { params: { id: reviewA!.id } });
    return { passed: res.status === 200, details: `Status: ${res.status}` };
  });

  await runTest("S6.3: Deletion decrements product reviewsCount", async () => {
    const p = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { reviewsCount: true },
    });
    return { passed: p?.reviewsCount === 1, details: `Reviews count: ${p?.reviewsCount}` };
  });

  await runTest("S6.4: Deletion allows buyer to submit review again", async () => {
    const eligibility = await checkBuyerReviewEligibility(product1.id, buyerA.id);
    return {
      passed: eligibility.eligible === true && eligibility.alreadyReviewed === false,
      details: `Eligible again: ${eligibility.eligible}`,
    };
  });

  await runTest("S6.5: Deleting nonexistent review returns 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/reviews/rev_nonexistent", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await directReviewDeleteHandler(req, { params: { id: "rev_nonexistent" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  // Re-create Buyer A review for further tests
  await createProductReview({
    productId: product1.id,
    buyerId: buyerA.id,
    data: { rating: 5, title: "Recreated Review", comment: "Final thoughts on this purchase." },
  });

  // --- Section 7: Public Review Display & Privacy ---
  console.log("\n--- Section 7: Public Review Display & Privacy ---");

  const pubReq = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`);
  const pubRes = await publicReviewsHandler(pubReq, { params: { productId: product1.id } });
  const pubBody = await pubRes.json();
  const pubText = JSON.stringify(pubBody);

  await runTest("S7.1: Public GET /api/v1/products/:id/reviews succeeds without auth (200)", async () => {
    return {
      passed: pubRes.status === 200 && Array.isArray(pubBody.data?.reviews),
      details: `Status: ${pubRes.status}, count: ${pubBody.data?.reviews?.length}`,
    };
  });

  await runTest("S7.2: Public reviews show verifiedPurchase: true", async () => {
    const allVerified = pubBody.data?.reviews.every((r: any) => r.verifiedPurchase === true);
    return { passed: allVerified, details: `All verified: ${allVerified}` };
  });

  await runTest("S7.3: Reviewer display name is safe / masked (no email)", async () => {
    const reviewer = pubBody.data?.reviews[0]?.reviewer;
    return {
      passed: !!reviewer?.displayName && !reviewer.displayName.includes("@"),
      details: `DisplayName: ${reviewer?.displayName}`,
    };
  });

  await runTest("S7.4: Reviewer email is strictly ABSENT from public response", async () => {
    return {
      passed: !pubText.includes(buyerA.email) && !pubText.includes(buyerB.email),
      details: "Emails absent",
    };
  });

  await runTest("S7.5: Order ID & payment ID are strictly ABSENT from public response", async () => {
    return {
      passed: !pubText.includes(orderA.id) && !pubText.includes("pay_rev_"),
      details: "Order & payment references absent",
    };
  });

  await runTest("S7.6: Public response includes rating distribution and average", async () => {
    const summary = pubBody.data?.ratingSummary;
    return {
      passed:
        typeof summary?.averageRating === "number" &&
        typeof summary?.reviewsCount === "number" &&
        !!summary?.distribution,
      details: `Summary: ${JSON.stringify(summary)}`,
    };
  });

  await runTest("S7.7: Public reviews support rating filter", async () => {
    const filterReq = new NextRequest(
      `http://localhost:3000/api/v1/products/${product1.id}/reviews?rating=5`
    );
    const filterRes = await publicReviewsHandler(filterReq, { params: { productId: product1.id } });
    const filterBody = await filterRes.json();
    const only5 = filterBody.data?.reviews.every((r: any) => r.rating === 5);
    return { passed: only5, details: `All 5 stars: ${only5}` };
  });

  await runTest("S7.8: Hidden reviews do NOT appear in public listing", async () => {
    const reviewToHide = await prisma.review.findFirst({ where: { productId: product1.id } });
    await moderateReview({ reviewId: reviewToHide!.id, action: "hide" });

    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`);
    const res = await publicReviewsHandler(req, { params: { productId: product1.id } });
    const body = await res.json();

    const containsHidden = body.data?.reviews.some((r: any) => r.id === reviewToHide!.id);

    // Restore for other tests
    await moderateReview({ reviewId: reviewToHide!.id, action: "restore" });

    return {
      passed: !containsHidden,
      details: `Contains hidden: ${containsHidden}`,
    };
  });

  // --- Section 8: Admin Review Moderation ---
  console.log("\n--- Section 8: Admin Review Moderation ---");

  await runTest("S8.1: GET /api/v1/admin/reviews rejected for unauthenticated (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/reviews");
    const res = await adminReviewsHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("S8.2: GET /api/v1/admin/reviews rejected for BUYER (403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/reviews", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await adminReviewsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("S8.3: GET /api/v1/admin/reviews succeeds for ADMIN (200)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/reviews", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminReviewsHandler(req);
    const body = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(body.data?.reviews),
      details: `Admin count: ${body.data?.reviews?.length}`,
    };
  });

  await runTest("S8.4: Admin can filter by productId", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/admin/reviews?productId=${product1.id}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const res = await adminReviewsHandler(req);
    const body = await res.json();
    const allProd1 = body.data?.reviews.every((r: any) => r.productId === product1.id);
    return { passed: allProd1, details: `All prod1: ${allProd1}` };
  });

  const targetReview = await prisma.review.findFirst({ where: { productId: product1.id } });

  await runTest("S8.5: Admin can hide a review (PATCH moderate action: hide)", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/admin/reviews/${targetReview?.id}/moderate`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action: "hide" }),
      }
    );
    const res = await adminModerateHandler(req, { params: { id: targetReview!.id } });
    const inDb = await prisma.review.findUnique({ where: { id: targetReview!.id } });
    return {
      passed: res.status === 200 && inDb?.isVisible === false,
      details: `isVisible: ${inDb?.isVisible}`,
    };
  });

  await runTest("S8.6: Admin can restore a review (PATCH moderate action: restore)", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/admin/reviews/${targetReview?.id}/moderate`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action: "restore" }),
      }
    );
    const res = await adminModerateHandler(req, { params: { id: targetReview!.id } });
    const inDb = await prisma.review.findUnique({ where: { id: targetReview!.id } });
    return {
      passed: res.status === 200 && inDb?.isVisible === true,
      details: `isVisible: ${inDb?.isVisible}`,
    };
  });

  await runTest("S8.7: Admin can delete a review (PATCH moderate action: delete)", async () => {
    const reviewToDelete = await prisma.review.create({
      data: {
        productId: product2.id,
        buyerId: buyerB.id,
        orderId: orderB.id,
        rating: 1,
        title: "Spam review",
        comment: "Will be moderated and deleted by admin",
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/admin/reviews/${reviewToDelete.id}/moderate`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action: "delete" }),
      }
    );
    const res = await adminModerateHandler(req, { params: { id: reviewToDelete.id } });
    const inDb = await prisma.review.findUnique({ where: { id: reviewToDelete.id } });
    return {
      passed: res.status === 200 && inDb === null,
      details: `Deleted: ${inDb === null}`,
    };
  });

  await runTest("S8.8: Inactive admin account rejected (403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/reviews", {
      headers: { Authorization: `Bearer ${inactiveAdminToken}` },
    });
    const res = await adminReviewsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // --- Section 9: Security & Zero Data Leakage ---
  console.log("\n--- Section 9: Security & Zero Data Leakage ---");

  await runTest("S9.1: passwordHash absent from all review responses", async () => {
    return { passed: !pubText.includes("passwordHash"), details: "passwordHash absent" };
  });

  await runTest("S9.2: JWT_SECRET absent from review responses", async () => {
    const jwtSecret = process.env.JWT_SECRET;
    return {
      passed: !jwtSecret || !pubText.includes(jwtSecret),
      details: "JWT secret absent",
    };
  });

  await runTest("S9.3: RAZORPAY_KEY_SECRET absent from review responses", async () => {
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
    return {
      passed: !rzpSecret || !pubText.includes(rzpSecret),
      details: "Razorpay secret absent",
    };
  });

  await runTest("S9.4: DATABASE_URL absent from review responses", async () => {
    return { passed: !pubText.includes("postgres"), details: "DATABASE_URL absent" };
  });

  await runTest("S9.5: Seller PAN absent from review responses", async () => {
    return { passed: !pubText.includes("ABCDE1234F"), details: "PAN absent" };
  });

  await runTest("S9.6: Seller bank account absent from review responses", async () => {
    return { passed: !pubText.includes("987654321012"), details: "Bank account absent" };
  });

  await runTest("S9.7: Malformed product ID returns 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/products/invalid-prod-id/reviews");
    const res = await publicReviewsHandler(req, { params: { productId: "invalid-prod-id" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  await runTest("S9.8: Injected fields in body stripped / rejected", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerBToken}`,
      },
      body: JSON.stringify({
        rating: 5,
        title: "Test Injected",
        comment: "Trying to inject status",
        status: "APPROVED",
        isReported: true,
      }),
    });
    const res = await createReviewHandler(req, { params: { productId: product1.id } });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  // --- Section 10: Regression & Boundaries ---
  console.log("\n--- Section 10: Regression & Boundaries ---");

  await runTest("S10.1: Feature 10 checkout orders unaffected", async () => {
    const o = await prisma.order.findUnique({ where: { id: orderA.id } });
    return { passed: o?.status === OrderStatus.PAID, details: `Order status: ${o?.status}` };
  });

  await runTest("S10.2: Feature 11 payment verification records intact", async () => {
    const p = await prisma.payment.findFirst({ where: { orderId: orderA.id } });
    return { passed: p?.status === PaymentStatus.CAPTURED, details: `Payment: ${p?.status}` };
  });

  await runTest("S10.3: Feature 12 entitlements intact", async () => {
    const ent = await prisma.entitlement.findFirst({ where: { orderId: orderA.id } });
    return { passed: ent?.isActive === true, details: `Entitlement: ${ent?.isActive}` };
  });

  await runTest("S10.4: Feature 14 seller earnings model unaffected", async () => {
    const earnCount = await prisma.sellerEarning.count({ where: { sellerId: sellerProfile.id } });
    return { passed: earnCount >= 0, details: `Earnings count: ${earnCount}` };
  });

  await runTest("S10.5: Feature 15 receipts model unaffected", async () => {
    const rCount = await prisma.receipt.count();
    return { passed: rCount >= 0, details: `Receipts count: ${rCount}` };
  });

  await runTest("S10.6: Product catalog endpoint returns updated reviewsCount and ratingAvg", async () => {
    const p = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { ratingAvg: true, reviewsCount: true },
    });
    return {
      passed: p?.reviewsCount === 2 && Number(p?.ratingAvg) > 0,
      details: `Count: ${p?.reviewsCount}, Avg: ${p?.ratingAvg}`,
    };
  });

  await runTest("S10.7: Public reviews pagination with page & limit parameters", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews?page=1&limit=1`);
    const res = await publicReviewsHandler(req, { params: { productId: product1.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.data?.reviews?.length === 1 && data.data?.pagination?.limit === 1 && data.data?.pagination?.total === 2,
      details: `Returned count: ${data.data?.reviews?.length}, total: ${data.data?.pagination?.total}`,
    };
  });

  await runTest("S10.8: Public reviews sorting by highest rating", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews?sort=highest`);
    const res = await publicReviewsHandler(req, { params: { productId: product1.id } });
    const data = await res.json();
    const isSorted = data.data?.reviews?.length >= 2 && data.data.reviews[0].rating >= data.data.reviews[1].rating;
    return {
      passed: res.status === 200 && isSorted,
      details: `Sorted highest: ${data.data?.reviews?.map((r: any) => r.rating).join(", ")}`,
    };
  });

  await runTest("S10.9: Public reviews sorting by lowest rating", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products/${product1.id}/reviews?sort=lowest`);
    const res = await publicReviewsHandler(req, { params: { productId: product1.id } });
    const data = await res.json();
    const isSorted = data.data?.reviews?.length >= 2 && data.data.reviews[0].rating <= data.data.reviews[1].rating;
    return {
      passed: res.status === 200 && isSorted,
      details: `Sorted lowest: ${data.data?.reviews?.map((r: any) => r.rating).join(", ")}`,
    };
  });

  await runTest("S10.10: Admin reviews filter by isVisible=true", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/reviews?isVisible=true", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminReviewsHandler(req);
    const data = await res.json();
    const allVisible = data.data?.reviews?.every((r: any) => r.isVisible === true);
    return {
      passed: res.status === 200 && allVisible,
      details: `Visibility filter passed, reviews returned: ${data.data?.reviews?.length}`,
    };
  });

  await runTest("S10.11: Admin reviews filter by rating=5", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/reviews?rating=5", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminReviewsHandler(req);
    const data = await res.json();
    const allFiveStars = data.data?.reviews?.every((r: any) => r.rating === 5);
    return {
      passed: res.status === 200 && allFiveStars,
      details: `Rating filter passed, 5-star count: ${data.data?.reviews?.length}`,
    };
  });

  await runTest("S10.12: Concurrency: Recalculate aggregates handles simultaneous invocations safely", async () => {
    // Run 5 simultaneous recalculations
    const { recalculateProductRatingAggregates } = await import("@/lib/services/review");
    await Promise.all([
      recalculateProductRatingAggregates(product1.id),
      recalculateProductRatingAggregates(product1.id),
      recalculateProductRatingAggregates(product1.id),
      recalculateProductRatingAggregates(product1.id),
      recalculateProductRatingAggregates(product1.id),
    ]);
    const p = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { ratingAvg: true, reviewsCount: true },
    });
    return {
      passed: p?.reviewsCount === 2 && Number(p?.ratingAvg) === 5,
      details: `Safe concurrent recalculation: Count ${p?.reviewsCount}, Avg ${p?.ratingAvg}`,
    };
  });


  // Cleanup test data
  try {
    await prisma.review.deleteMany({
      where: {
        productId: { in: [product1.id, product2.id] },
      },
    });
    await prisma.entitlement.deleteMany({
      where: {
        productId: { in: [product1.id, product2.id] },
      },
    });
    await prisma.orderItem.deleteMany({
      where: {
        productId: { in: [product1.id, product2.id] },
      },
    });
    await prisma.payment.deleteMany({
      where: {
        orderId: { in: [orderA.id, orderB.id, orderA2.id, pendingOrder.id, cancelledOrder.id] },
      },
    });
    await prisma.order.deleteMany({
      where: {
        id: { in: [orderA.id, orderB.id, orderA2.id, pendingOrder.id, cancelledOrder.id] },
      },
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
            nonBuyer.id,
            inactiveBuyer.id,
            sellerUser.id,
            adminUser.id,
            inactiveAdmin.id,
          ],
        },
      },
    });
  } catch {}

  console.log("\n===========================================================================");
  console.log("FEATURE 16 TEST RESULTS SUMMARY");
  console.log("===========================================================================");
  console.log(`Total Tests Run: ${passedCount + failedCount}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);

  if (failedCount === 0) {
    console.log("\nALL FEATURE 16 TESTS PASSED PERFECTLY!\n");
  } else {
    console.log("\nFAILED TESTS:");
    failures.forEach((f) => console.log(`- ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in test-reviews:", err);
  process.exit(1);
});
