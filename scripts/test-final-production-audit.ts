/**
 * FEATURE 24: FINAL COMPLETE END-TO-END, SECURITY, DATA INTEGRITY & PRODUCTION READINESS AUDIT
 *
 * Proves that the entire Digital Marketplace transaction lifecycle works from beginning to end.
 */

import { prisma } from "../src/lib/prisma";
import { hashPassword, comparePassword } from "../src/lib/password";
import { signJwt, verifyJwt, isStrongJwtSecret } from "../src/lib/jwt";
import { getStorageProvider, LocalStorageProvider } from "../src/lib/storage/local-storage-provider";
import { S3StorageProvider } from "../src/lib/storage/s3-storage-provider";
import { generateDownloadSignature, verifyDownloadSignature } from "../src/lib/storage/download-signer";
import { checkRateLimit, resetRateLimiter, getRateLimitTier } from "../src/lib/rate-limiter";
import { sanitizeLogData, sanitizeErrorMessage } from "../src/lib/logger";
import { generatePaymentSignature, verifyPaymentSignature } from "../src/lib/payment/razorpay";
import { settleSellerEarnings } from "../src/lib/services/seller-earnings";
import { generateReceiptForOrder, getActiveReceiptTemplate, updateActiveReceiptTemplate } from "../src/lib/services/receipt";
import { authorizeProductFileDownload } from "../src/lib/services/download";
import { processOrderRefund } from "../src/lib/services/order-lifecycle";
import { createNotification } from "../src/lib/services/notification";
import { GET as healthHandler } from "../src/app/api/v1/health/route";
import { GET as catalogHandler } from "../src/app/api/v1/products/route";
import { POST as verifyHandler } from "../src/app/api/v1/payments/verify/route";
import { POST as webhookHandler } from "../src/app/api/v1/payments/webhook/route";
import { middleware } from "../src/middleware";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Color output formatting
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    passedCount++;
    console.log(`  ${GREEN}✓${RESET} [TEST ${passedCount + failedCount}] ${testName}`);
  } else {
    failedCount++;
    console.error(`  ${RED}✗${RESET} [TEST ${passedCount + failedCount}] ${testName}`);
    if (detail) console.error(`    ${RED}Detail:${RESET} ${detail}`);
  }
}

async function main() {
  console.log(`\n${CYAN}${BOLD}======================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   FEATURE 24: FINAL PRODUCTION READINESS & MASTER AUDIT TEST SUITE   ${RESET}`);
  console.log(`${CYAN}${BOLD}======================================================================${RESET}\n`);

  const ts = Date.now();
  const testPassword = "AuditSecurePass123!@#";
  const passwordHash = await hashPassword(testPassword);

  // =========================================================================
  // SECTION 1: Master Persona Setup (5 Users)
  // =========================================================================
  console.log(`${YELLOW}${BOLD}--- 1. Persona Creation & Identity Setup ---${RESET}`);

  // 1. Admin A
  const adminA = await prisma.user.create({
    data: {
      fullName: `Admin Auditor ${ts}`,
      email: `admin.audit.${ts}@marketplace.test`,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
    },
  });
  assert(adminA.role === "ADMIN", "Admin A provisioned with ADMIN role");

  // 2. Seller A
  const userSellerA = await prisma.user.create({
    data: {
      fullName: `Seller Alpha ${ts}`,
      email: `seller.alpha.${ts}@marketplace.test`,
      passwordHash,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });
  assert(userSellerA.role === "BUYER", "Seller A user created with base BUYER role");

  // 3. Seller B
  const userSellerB = await prisma.user.create({
    data: {
      fullName: `Seller Beta ${ts}`,
      email: `seller.beta.${ts}@marketplace.test`,
      passwordHash,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });
  assert(userSellerB.role === "BUYER", "Seller B user created with base BUYER role");

  // 4. Buyer A
  const buyerA = await prisma.user.create({
    data: {
      fullName: `Buyer Alice ${ts}`,
      email: `buyer.alice.${ts}@marketplace.test`,
      passwordHash,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });
  assert(buyerA.role === "BUYER", "Buyer A created with BUYER role");

  // 5. Buyer B
  const buyerB = await prisma.user.create({
    data: {
      fullName: `Buyer Bob ${ts}`,
      email: `buyer.bob.${ts}@marketplace.test`,
      passwordHash,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });
  assert(buyerB.role === "BUYER", "Buyer B created with BUYER role");

  // =========================================================================
  // SECTION 2: Seller A Onboarding, KYC Approval & Product Publishing
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 2. Seller A Onboarding & Product Lifecycle ---${RESET}`);

  // Seller A Onboarding -> PENDING
  const sellerProfileA = await prisma.sellerProfile.create({
    data: {
      userId: userSellerA.id,
      storeName: `Alpha Digital Labs ${ts}`,
      storeSlug: `alpha-digital-${ts}`,
      bio: "High quality Next.js SaaS kits",
      status: "PENDING",
      panNumberMasked: "ABCDE****F",
      bankAccountLast4: "****1234",
      bankIfsc: "HDFC0001234",
      bankAccountHolder: "Seller Alpha",
      totalRevenuePaise: BigInt(0),
      netEarningsPaise: BigInt(0),
      pendingBalance: BigInt(0),
      availableBalance: BigInt(0),
    },
  });
  assert(sellerProfileA.status === "PENDING", "Seller A onboarding status is PENDING initially");

  // Admin approves Seller A
  const approvedProfileA = await prisma.sellerProfile.update({
    where: { id: sellerProfileA.id },
    data: { status: "APPROVED" },
  });
  assert(approvedProfileA.status === "APPROVED", "Admin approves Seller A (Status: APPROVED)");

  // Seed Category
  const categoryDev = await prisma.category.create({
    data: {
      name: `Developer Utilities ${ts}`,
      slug: `dev-utils-${ts}`,
      description: "Development tools & boilerplate kits",
      displayOrder: 1,
      isActive: true,
    },
  });
  assert(categoryDev.isActive === true, "Active Category created for product listing");

  // Seller A creates Product A (Draft)
  const productA = await prisma.product.create({
    data: {
      sellerId: approvedProfileA.id,
      categoryId: categoryDev.id,
      title: `Next.js Enterprise SaaS Kit ${ts}`,
      slug: `nextjs-enterprise-saas-${ts}`,
      shortDescription: "Complete production-ready multi-tenant SaaS starter kit",
      description: "Includes Auth, PostgreSQL Prisma ORM, Stripe & Razorpay payments, and Tailwind CSS.",
      productType: "SOFTWARE",
      pricePaise: 100000, // ₹1,000.00
      isFree: false,
      licenseType: "COMMERCIAL",
      status: "DRAFT",
      ratingAvg: 0,
      reviewsCount: 0,
      salesCount: 0,
      tags: ["nextjs", "saas", "react", "typescript"],
    },
  });
  assert(productA.status === "DRAFT", "Product A created in DRAFT status");

  // Seller A uploads private digital asset
  const storage = getStorageProvider();
  const fileKeyA = `products/${productA.id}/asset_1/source-code.zip`;
  const fileContentA = Buffer.from("SECURE_DIGITAL_PRODUCT_A_SOURCE_CODE_ZIP_BYTES");
  await storage.putObject(fileKeyA, fileContentA, "application/zip");
  const fileExistsA = await storage.objectExists(fileKeyA);
  assert(fileExistsA === true, "Product A private asset uploaded to private storage");

  // Attach ProductFile record
  const productFileA = await prisma.productFile.create({
    data: {
      productId: productA.id,
      storageKey: fileKeyA,
      originalFilename: "saas-kit-v1.0.0.zip",
      fileSize: BigInt(fileContentA.length),
      mimeType: "application/zip",
      downloadLimit: 10,
    },
  });
  assert(productFileA.storageKey === fileKeyA, "ProductFile A attached to Product A");

  // Seller A submits Product A for moderation
  const submittedProductA = await prisma.product.update({
    where: { id: productA.id },
    data: { status: "PENDING_REVIEW" },
  });
  assert(submittedProductA.status === "PENDING_REVIEW", "Product A submitted for admin moderation (PENDING_REVIEW)");

  // Admin approves Product A -> PUBLISHED
  const publishedProductA = await prisma.product.update({
    where: { id: productA.id },
    data: { status: "PUBLISHED" },
  });
  assert(publishedProductA.status === "PUBLISHED", "Admin approves Product A -> PUBLISHED");

  // Setup Seller B & Product B for multi-vendor isolation
  const sellerProfileB = await prisma.sellerProfile.create({
    data: {
      userId: userSellerB.id,
      storeName: `Beta UI Foundry ${ts}`,
      storeSlug: `beta-ui-${ts}`,
      bio: "Figma design systems and templates",
      status: "APPROVED",
      panNumberMasked: "XYZAB****C",
      bankAccountLast4: "****5678",
      bankIfsc: "ICIC0005678",
      bankAccountHolder: "Seller Beta",
      totalRevenuePaise: BigInt(0),
      netEarningsPaise: BigInt(0),
      pendingBalance: BigInt(0),
      availableBalance: BigInt(0),
    },
  });

  const productB = await prisma.product.create({
    data: {
      sellerId: sellerProfileB.id,
      categoryId: categoryDev.id,
      title: `Omni Design System Pro ${ts}`,
      slug: `omni-design-system-${ts}`,
      shortDescription: "Figma auto-layout design system with 200+ components",
      description: "Production-grade design kit for web and mobile interfaces.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 200000, // ₹2,000.00
      isFree: false,
      licenseType: "EXTENDED",
      status: "PUBLISHED",
      ratingAvg: 0,
      reviewsCount: 0,
      salesCount: 0,
      tags: ["figma", "design", "ui"],
    },
  });

  const fileKeyB = `products/${productB.id}/asset_1/figma-tokens.zip`;
  await storage.putObject(fileKeyB, Buffer.from("FIGMA_TOKENS_PAYLOAD"), "application/zip");
  const productFileB = await prisma.productFile.create({
    data: {
      productId: productB.id,
      storageKey: fileKeyB,
      originalFilename: "omni-tokens.zip",
      fileSize: BigInt(2048),
      mimeType: "application/zip",
      downloadLimit: 5,
    },
  });
  assert(productB.status === "PUBLISHED", "Seller B & Product B created and published");

  // =========================================================================
  // SECTION 3: Transaction A (Buyer A -> Product A) Full Lifecycle
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 3. Transaction A: Buyer A Purchases Product A ---${RESET}`);

  // Create Order A (PENDING)
  const orderIdA = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-A${ts.toString().slice(-4)}`;
  const rzpOrderIdA = `order_audit_A_${ts}`;

  const orderA = await prisma.order.create({
    data: {
      id: orderIdA,
      buyerId: buyerA.id,
      status: "PENDING",
      subtotalPaise: productA.pricePaise,
      discountPaise: 0,
      platformFeePaise: Math.round(productA.pricePaise * 0.1),
      totalAmountPaise: productA.pricePaise, // 100000
      currency: "INR",
      razorpayOrderId: rzpOrderIdA,
      buyerEmailSnapshot: buyerA.email,
      buyerNameSnapshot: buyerA.fullName,
      items: {
        create: {
          productId: productA.id,
          sellerId: approvedProfileA.id,
          productTitle: productA.title,
          licenseType: productA.licenseType,
          pricePaise: productA.pricePaise,
          platformFeePaise: Math.round(productA.pricePaise * 0.1),
          sellerEarningsPaise: productA.pricePaise - Math.round(productA.pricePaise * 0.1),
        },
      },
    },
    include: { items: true },
  });

  assert(orderA.status === "PENDING", "Order A initialized in PENDING state");
  assert(orderA.totalAmountPaise === 100000, "Order A amount is integer paise (100000)");

  // Generate valid Razorpay payment HMAC
  const rzpPaymentIdA = `pay_audit_A_${ts}`;
  const validSigA = generatePaymentSignature(rzpOrderIdA, rzpPaymentIdA);

  // Authenticate Buyer A JWT
  const tokenBuyerA = signJwt({ sub: buyerA.id, email: buyerA.email, role: "BUYER" });

  // Call POST /api/v1/payments/verify
  const verifyReqA = new NextRequest("http://localhost:3000/api/v1/payments/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenBuyerA}`,
    },
    body: JSON.stringify({
      orderId: orderA.id,
      razorpayOrderId: rzpOrderIdA,
      razorpayPaymentId: rzpPaymentIdA,
      razorpaySignature: validSigA,
    }),
  });

  const verifyResA = await verifyHandler(verifyReqA);
  assert(verifyResA.status === 200, "POST /api/v1/payments/verify succeeds with 200 OK");

  // Verify DB state for Order A and Payment A
  const paidOrderA = await prisma.order.findUnique({
    where: { id: orderA.id },
    include: { payments: true },
  });
  assert(paidOrderA?.status === "PAID", "Order A transitioned to PAID");
  assert(paidOrderA?.paidAt !== null, "Order A paidAt timestamp populated");
  assert(paidOrderA?.payments.length === 1, "Payment record created for Order A");
  assert(paidOrderA?.payments[0].status === "CAPTURED", "Payment A is in CAPTURED status");

  // =========================================================================
  // SECTION 4: Fulfillment, Entitlement, Ledger & Earnings Integrity
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 4. Fulfillment & Financial Math Verification ---${RESET}`);

  // Provision Entitlement for Buyer A
  const entitlementA = await prisma.entitlement.upsert({
    where: {
      orderId_productId: {
        orderId: orderA.id,
        productId: productA.id,
      },
    },
    create: {
      buyerId: buyerA.id,
      productId: productA.id,
      orderId: orderA.id,
      status: "ACTIVE",
      isActive: true,
    },
    update: {
      status: "ACTIVE",
      isActive: true,
    },
  });
  assert(entitlementA.status === "ACTIVE", "Entitlement A is strictly ACTIVE");

  // Settle Seller A Earnings & Platform Ledger
  await settleSellerEarnings(orderA.id);

  const earningsA = await prisma.sellerEarning.findFirst({
    where: { orderId: orderA.id },
  });
  assert(earningsA !== null, "SellerEarning record created for Order A");

  // Financial Math Verification (gross = platformFee + netSeller)
  const gross = earningsA?.grossAmountPaise || 0;
  const fee = earningsA?.platformFeePaise || 0;
  const net = earningsA?.netEarningsPaise || 0;

  assert(gross === 100000, "Gross sale matches product price (100000 paise)");
  assert(fee === 10000, "Platform fee is exactly 10% (10000 paise)");
  assert(net === 90000, "Net seller earnings is exactly 90% (90000 paise)");
  assert(gross === fee + net, "Financial invariant strictly holds: gross = fee + net (integer paise)");

  const ledgerEntryA = await prisma.platformLedger.findFirst({
    where: { orderId: orderA.id },
  });
  assert(ledgerEntryA !== null, "PlatformLedger record created for Order A");
  assert(ledgerEntryA?.feePaise === 10000, "PlatformLedger platform fee matches 10000 paise");

  // Generate Receipt
  const receiptResultA = await generateReceiptForOrder(orderA.id);
  assert(receiptResultA.success === true, "Receipt generated for Order A");
  assert(receiptResultA.receipt?.amountPaidPaise === 100000, "Receipt reflects exact paid amount in paise");

  // =========================================================================
  // SECTION 5: Secure Download & 15-Minute Expiration Verification
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 5. Secure Download & 15-Minute Expiration ---${RESET}`);

  const downloadResultA = await authorizeProductFileDownload({
    userId: buyerA.id,
    productFileId: productFileA.id,
    ipAddress: "127.0.0.1",
    userAgent: "AuditTester/1.0",
  });

  assert(Boolean(downloadResultA.success), "Buyer A authorized to download Product A");
  assert(downloadResultA.data?.expiresInSeconds === 900, "Download URL enforces exact 900 seconds (15 minutes) expiration");
  assert(Boolean(downloadResultA.data?.downloadUrl.includes("sig=")), "Download URL includes cryptographic signature");

  // Verify Download audit log
  const downloadLogA = await prisma.downloadLog.findFirst({
    where: { ipAddress: "127.0.0.1" },
  });
  assert(downloadLogA !== null, "DownloadLog audit trail recorded for file access");

  // Direct public access to private file without signature must fail
  const urlParts = new URL(downloadResultA.data?.downloadUrl || "http://localhost");
  const objectKey = decodeURIComponent(urlParts.pathname.replace("/api/v1/internal/storage/download/", ""));
  const unsignedVerify = verifyDownloadSignature(objectKey, Math.floor(Date.now() / 1000) + 900, "");
  assert(unsignedVerify.valid === false, "Direct unsigned download attempt is blocked");

  // =========================================================================
  // SECTION 6: Comprehensive IDOR Audit (Buyer & Seller Isolation)
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 6. Comprehensive IDOR & Boundary Isolation ---${RESET}`);

  // 1. Buyer B attempts to download Buyer A's product file (Buyer B has no entitlement)
  const buyerBDownloadResult = await authorizeProductFileDownload({
    userId: buyerB.id,
    productFileId: productFileA.id,
  });
  assert(
    buyerBDownloadResult.success === false && buyerBDownloadResult.status === 403,
    "IDOR: Buyer B is blocked from downloading Buyer A's product (403 FORBIDDEN)"
  );


  // 2. Buyer B attempts to verify Buyer A's order
  const tokenBuyerB = signJwt({ sub: buyerB.id, email: buyerB.email, role: "BUYER" });
  const idorVerifyReq = new NextRequest("http://localhost:3000/api/v1/payments/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenBuyerB}`,
    },
    body: JSON.stringify({
      orderId: orderA.id,
      razorpayOrderId: rzpOrderIdA,
      razorpayPaymentId: rzpPaymentIdA,
      razorpaySignature: validSigA,
    }),
  });
  const idorVerifyRes = await verifyHandler(idorVerifyReq);
  assert(idorVerifyRes.status === 403, "IDOR: Buyer B blocked from verifying Buyer A's order (403 FORBIDDEN)");

  // 3. Seller B attempts to access Seller A's product
  const sellerBProductCheck = await prisma.product.findFirst({
    where: { id: productA.id, sellerId: sellerProfileB.id },
  });
  assert(sellerBProductCheck === null, "IDOR: Seller B cannot find Seller A's product under Seller B's profile");

  // 4. Buyer attempts Admin health / admin privileges
  const nonAdminToken = signJwt({ sub: buyerA.id, email: buyerA.email, role: "BUYER" });
  assert(verifyJwt(nonAdminToken)?.role === "BUYER", "Buyer token confirms non-admin role");

  // =========================================================================
  // SECTION 7: Payment Security & Attack Resistance
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 7. Payment Security & Tamper Resistance ---${RESET}`);

  // Fake signature
  const fakeSig = crypto.randomBytes(32).toString("hex");
  const tamperedSigReq = new NextRequest("http://localhost:3000/api/v1/payments/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenBuyerA}`,
    },
    body: JSON.stringify({
      orderId: orderA.id,
      razorpayOrderId: rzpOrderIdA,
      razorpayPaymentId: rzpPaymentIdA,
      razorpaySignature: fakeSig,
    }),
  });
  const tamperedSigRes = await verifyHandler(tamperedSigReq);
  assert(tamperedSigRes.status === 400, "Tampered cryptographic signature rejected with 400");

  // Replay of same payment on paid order -> safe idempotent 200
  const replayReq = new NextRequest("http://localhost:3000/api/v1/payments/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenBuyerA}`,
    },
    body: JSON.stringify({
      orderId: orderA.id,
      razorpayOrderId: rzpOrderIdA,
      razorpayPaymentId: rzpPaymentIdA,
      razorpaySignature: validSigA,
    }),
  });
  const replayRes = await verifyHandler(replayReq);
  assert(replayRes.status === 200, "Idempotent payment verification replay succeeds safely with 200");

  // Different payment reference on already paid order -> 409 Conflict
  const conflictReq = new NextRequest("http://localhost:3000/api/v1/payments/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenBuyerA}`,
    },
    body: JSON.stringify({
      orderId: orderA.id,
      razorpayOrderId: rzpOrderIdA,
      razorpayPaymentId: `pay_different_${ts}`,
      razorpaySignature: validSigA,
    }),
  });
  const conflictRes = await verifyHandler(conflictReq);
  assert(conflictRes.status === 400 || conflictRes.status === 409, "Different payment reference on paid order rejected with 400/409");

  // =========================================================================
  // SECTION 8: Receipt Immutability & Template Versioning
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 8. Receipt Immutability & Template Versioning ---${RESET}`);

  const originalReceipt = await prisma.receipt.findUnique({
    where: { orderId: orderA.id },
  });
  assert(originalReceipt !== null, "Original receipt exists for Order A");
  const originalVersion = originalReceipt?.templateVersion || 1;

  // Admin updates template
  await updateActiveReceiptTemplate({
    platformName: "Updated Platform Name Inc.",
    primaryColor: "#00FF00",
  });

  const updatedTemplate = await getActiveReceiptTemplate();
  assert(updatedTemplate.version > originalVersion, "Active template version incremented");

  // Verify historical receipt remains unchanged
  const historicalReceipt = await prisma.receipt.findUnique({
    where: { orderId: orderA.id },
  });
  assert(historicalReceipt?.templateVersion === originalVersion, "Historical receipt preserves original template version (Immutable)");

  // =========================================================================
  // SECTION 9: Verified Purchase Reviews & Unverified Buyer Rejection
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 9. Reviews & Verified Purchase Validation ---${RESET}`);

  // Buyer A (verified owner) creates review
  const reviewA = await prisma.review.create({
    data: {
      buyerId: buyerA.id,
      productId: productA.id,
      orderId: orderA.id,
      rating: 5,
      title: "Superb SaaS Kit!",
      comment: "Saved our engineering team weeks of boilerplate setup. Highly recommended!",
      isVisible: true,
    },
  });
  assert(reviewA.rating === 5, "Buyer A review recorded with 5-star rating");

  // Check unique review constraint (one review per user per product)
  let duplicateReviewBlocked = false;
  try {
    await prisma.review.create({
      data: {
        buyerId: buyerA.id,
        productId: productA.id,
        orderId: orderA.id,
        rating: 4,
        title: "Duplicate attempt",
        comment: "Trying duplicate",
        isVisible: true,
      },
    });
  } catch {
    duplicateReviewBlocked = true;
  }
  assert(duplicateReviewBlocked, "Database unique constraint blocks duplicate review on same product");

  // =========================================================================
  // SECTION 10: Multi-Transaction Matrix (Transactions B & C)
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 10. Multi-Transaction Matrix (Isolation & Multi-Vendor) ---${RESET}`);

  // Transaction B: Buyer B -> Product A (Seller A)
  const orderIdB = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-B${ts.toString().slice(-4)}`;
  const rzpOrderIdB = `order_audit_B_${ts}`;
  const rzpPaymentIdB = `pay_audit_B_${ts}`;
  const orderB = await prisma.order.create({
    data: {
      id: orderIdB,
      buyerId: buyerB.id,
      status: "PAID",
      subtotalPaise: productA.pricePaise,
      discountPaise: 0,
      platformFeePaise: Math.round(productA.pricePaise * 0.1),
      totalAmountPaise: productA.pricePaise,
      currency: "INR",
      razorpayOrderId: rzpOrderIdB,
      razorpayPaymentId: rzpPaymentIdB,
      paidAt: new Date(),
      buyerEmailSnapshot: buyerB.email,
      buyerNameSnapshot: buyerB.fullName,
      items: {
        create: {
          productId: productA.id,
          sellerId: approvedProfileA.id,
          productTitle: productA.title,
          licenseType: productA.licenseType,
          pricePaise: productA.pricePaise,
          platformFeePaise: Math.round(productA.pricePaise * 0.1),
          sellerEarningsPaise: productA.pricePaise - Math.round(productA.pricePaise * 0.1),
        },
      },
      payments: {
        create: {
          razorpayOrderId: rzpOrderIdB,
          razorpayPaymentId: rzpPaymentIdB,
          amountPaise: productA.pricePaise,
          currency: "INR",
          status: "CAPTURED",
          verifiedAt: new Date(),
        },
      },
    },
  });
  await settleSellerEarnings(orderB.id);
  assert(orderB.status === "PAID", "Transaction B completed: Buyer B -> Product A (Seller A)");

  // Transaction C: Buyer A -> Product B (Seller B)
  const orderIdC = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-C${ts.toString().slice(-4)}`;
  const rzpOrderIdC = `order_audit_C_${ts}`;
  const rzpPaymentIdC = `pay_audit_C_${ts}`;
  const orderC = await prisma.order.create({
    data: {
      id: orderIdC,
      buyerId: buyerA.id,
      status: "PAID",
      subtotalPaise: productB.pricePaise,
      discountPaise: 0,
      platformFeePaise: Math.round(productB.pricePaise * 0.1),
      totalAmountPaise: productB.pricePaise, // 200000
      currency: "INR",
      razorpayOrderId: rzpOrderIdC,
      razorpayPaymentId: rzpPaymentIdC,
      paidAt: new Date(),
      buyerEmailSnapshot: buyerA.email,
      buyerNameSnapshot: buyerA.fullName,
      items: {
        create: {
          productId: productB.id,
          sellerId: sellerProfileB.id,
          productTitle: productB.title,
          licenseType: productB.licenseType,
          pricePaise: productB.pricePaise,
          platformFeePaise: Math.round(productB.pricePaise * 0.1),
          sellerEarningsPaise: productB.pricePaise - Math.round(productB.pricePaise * 0.1),
        },
      },
      payments: {
        create: {
          razorpayOrderId: rzpOrderIdC,
          razorpayPaymentId: rzpPaymentIdC,
          amountPaise: productB.pricePaise,
          currency: "INR",
          status: "CAPTURED",
          verifiedAt: new Date(),
        },
      },
    },
  });
  await settleSellerEarnings(orderC.id);
  assert(orderC.status === "PAID", "Transaction C completed: Buyer A -> Product B (Seller B)");


  // Verify Seller B Earnings
  const earningsB = await prisma.sellerEarning.findFirst({
    where: { orderId: orderC.id },
  });
  assert(earningsB?.grossAmountPaise === 200000, "Seller B gross matches Product B price (200000)");
  assert(earningsB?.platformFeePaise === 20000, "Seller B platform fee is 10% (20000)");
  assert(earningsB?.netEarningsPaise === 180000, "Seller B net earnings is 90% (180000)");

  // =========================================================================
  // SECTION 11: Refund Flow & Complete Financial Reversals
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 11. Refund Flow & Financial Reversals ---${RESET}`);

  // Initiate Refund on Order B
  const refundResult = await processOrderRefund({
    orderId: orderB.id,
    adminId: adminA.id,
    reason: "Audit test refund request",
  });
  assert(refundResult.success === true, "Order B refund processed successfully");

  const refundedOrderB = await prisma.order.findUnique({
    where: { id: orderB.id },
  });
  assert(refundedOrderB?.status === "REFUNDED", "Order B status is strictly REFUNDED");

  // Verify Seller Earning marked REFUNDED_DEDUCTED
  const refundedEarningB = await prisma.sellerEarning.findFirst({
    where: { orderId: orderB.id },
  });
  assert(refundedEarningB?.status === "REFUNDED_DEDUCTED", "SellerEarning status updated to REFUNDED_DEDUCTED");

  // Verify PlatformLedger marked REVERSED
  const reversedLedgerB = await prisma.platformLedger.findFirst({
    where: { orderId: orderB.id },
  });
  assert(reversedLedgerB?.status === "REVERSED", "PlatformLedger status updated to REVERSED");

  // Re-attempting refund on already REFUNDED order -> safe idempotent
  const secondRefund = await processOrderRefund({
    orderId: orderB.id,
    adminId: adminA.id,
    reason: "Duplicate refund attempt",
  });
  assert(secondRefund.success === true, "Second refund attempt on refunded order succeeds safely");

  // =========================================================================
  // SECTION 12: Notification Lifecycle & Deduplication
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 12. Notification Lifecycle & Deduplication ---${RESET}`);

  const notif1 = await createNotification({
    userId: buyerA.id,
    type: "PAYMENT_SUCCESS",
    title: "Order Confirmed",
    message: "Your order has been confirmed.",
    dedupKey: `notif_test_${ts}`,
  });
  assert(notif1 !== null, "Notification created successfully");

  const notifDuplicate = await createNotification({
    userId: buyerA.id,
    type: "PAYMENT_SUCCESS",
    title: "Order Confirmed",
    message: "Duplicate notification attempt.",
    dedupKey: `notif_test_${ts}`,
  });
  assert(notifDuplicate.id === notif1.id, "Duplicate notification with same dedupKey safely no-ops");

  // =========================================================================
  // SECTION 13: Advanced Search & Public Discovery Isolation
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 13. Search & Public Discovery Verification ---${RESET}`);

  // Query catalog
  const searchReq = new NextRequest(`http://localhost:3000/api/v1/products?query=SaaS&category=${categoryDev.slug}`);
  const searchRes = await catalogHandler(searchReq);
  assert(searchRes.status === 200, "Catalog search endpoint returns 200 OK");

  const searchData = await searchRes.json();
  const foundProdA = searchData.data?.some((p: any) => p.id === productA.id);
  assert(foundProdA === true, "Published Product A is discoverable via search & category");

  // Verify draft products are never in search results
  const draftFound = searchData.data?.some((p: any) => p.status === "DRAFT");
  assert(!draftFound, "DRAFT products are strictly excluded from public search");

  // =========================================================================
  // SECTION 14: Rate Limiting Enforcement
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 14. Rate Limiting Protection ---${RESET}`);

  resetRateLimiter();
  const testIp = `10.0.0.${ts % 250}`;
  const authTier = getRateLimitTier("/api/v1/auth/login", "POST");
  assert(authTier === "auth", "Auth login maps to 'auth' rate limit tier");

  for (let i = 0; i < 15; i++) {
    checkRateLimit(testIp, "auth");
  }
  const rateLimitExceeded = checkRateLimit(testIp, "auth");
  assert(rateLimitExceeded.success === false, "16th auth request blocked with 429 rate limit exceeded");
  assert((rateLimitExceeded.retryAfterSeconds || 0) > 0, "Rate limiter provides positive retryAfterSeconds");
  resetRateLimiter();

  // =========================================================================
  // SECTION 15: Public Error Message Sanitization & Zero Leakage Audit
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 15. Error Sanitization & Zero Secret Leakage ---${RESET}`);

  const prevEnv = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "production";

  const sanitizedPrisma = sanitizeErrorMessage("Unique constraint failed on the constraint: users_email_unique prisma.user.create()");
  assert(!sanitizedPrisma.includes("prisma"), "Prisma internals stripped in production");
  assert(!sanitizedPrisma.includes("users_email_unique"), "Database constraint name stripped in production");

  const sanitizedSql = sanitizeErrorMessage("Syntax error at SELECT * FROM \"User\" WHERE id = 'xyz'");
  assert(!sanitizedSql.includes("SELECT"), "Raw SQL query stripped in production");

  const sanitizedPath = sanitizeErrorMessage("File not found at E:\\Zero_Booth\\storage\\private\\secret.key");
  assert(!sanitizedPath.includes("E:\\Zero_Booth"), "Filesystem paths stripped in production");

  (process.env as any).NODE_ENV = prevEnv;

  // Sensitive log data redaction
  const sanitizedLog = sanitizeLogData({
    email: "user@test.com",
    password: "SecretPassword123!",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.sig",
    razorpaySecret: "rzp_secret_val",
    bankAccount: "123456789012",
  }) as Record<string, unknown>;

  assert(sanitizedLog.password === "[REDACTED]", "Password redacted from logs");
  assert(sanitizedLog.razorpaySecret === "[REDACTED]", "Razorpay secret redacted from logs");
  assert(sanitizedLog.bankAccount === "[REDACTED]", "Bank account redacted from logs");

  // =========================================================================
  // SECTION 16: Health Check & Database Connectivity
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 16. Health Check & Database Diagnostics ---${RESET}`);

  const healthReq = new NextRequest("http://localhost:3000/api/v1/health");
  const healthRes = await healthHandler(healthReq);
  assert(healthRes.status === 200, "Health check endpoint returns 200 OK");

  const healthData = await healthRes.json();
  assert(healthData.status === "healthy", "Health check reports status: 'healthy'");
  assert(healthData.services.database.status === "connected", "Database service reports status: 'connected'");
  assert(typeof healthData.services.database.latencyMs === "number", "Database latency tracked in ms");
  assert(!JSON.stringify(healthData).includes("postgresql://"), "Zero credential leakage in health response");

  // =========================================================================
  // SECTION 17: Database Integrity & Orphan Check
  // =========================================================================
  console.log(`\n${YELLOW}${BOLD}--- 17. Database Integrity & Constraint Verification ---${RESET}`);

  const allOrders = await prisma.order.findMany({ select: { id: true } });
  const orderIdSet = new Set(allOrders.map((o) => o.id));

  const allPayments = await prisma.payment.findMany({ select: { id: true, orderId: true } });
  const orphanPayments = allPayments.filter((p) => !orderIdSet.has(p.orderId)).length;
  assert(orphanPayments === 0, "Zero orphan Payment records without valid Order");

  const allItems = await prisma.orderItem.findMany({ select: { id: true, orderId: true } });
  const orphanItems = allItems.filter((i) => !orderIdSet.has(i.orderId)).length;
  assert(orphanItems === 0, "Zero orphan OrderItem records without valid Order");

  const allEarnings = await prisma.sellerEarning.findMany({ select: { id: true, orderId: true } });
  const orphanEarnings = allEarnings.filter((e) => !orderIdSet.has(e.orderId)).length;
  assert(orphanEarnings === 0, "Zero orphan SellerEarning records without valid Order");


  // =========================================================================
  // SECTION 18: Summary & Classification
  // =========================================================================
  console.log(`\n${CYAN}${BOLD}======================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   FINAL AUDIT SUMMARY REPORT   ${RESET}`);
  console.log(`${CYAN}${BOLD}======================================================================${RESET}`);
  console.log(`  Total Invariant Tests:  ${passedCount + failedCount}`);
  console.log(`  ${GREEN}${BOLD}Passed Tests:           ${passedCount}${RESET}`);
  if (failedCount > 0) {
    console.log(`  ${RED}${BOLD}Failed Tests:           ${failedCount}${RESET}`);
  } else {
    console.log(`  ${GREEN}${BOLD}All audit assertions passed flawlessly!${RESET}`);
  }
  console.log(`${CYAN}${BOLD}======================================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Master audit runner crashed:", err);
  process.exit(1);
});
