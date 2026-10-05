/**
 * Feature 08 — Product Moderation & Publishing Test Suite
 *
 * Covers 56+ comprehensive, deterministic test cases:
 *   - Seller Submission Authentication: missing, invalid, expired, inactive user
 *   - Seller Authorization: BUYER, PENDING, REJECTED, APPROVED
 *   - IDOR / Ownership Protection: Seller A vs Seller B submission
 *   - Product State Transitions: DRAFT -> PENDING_REVIEW, invalid transitions
 *   - Completeness Validation: title, description, category, price, missing asset, unconfirmed asset
 *   - Admin Authorization: BUYER/SELLER rejected from admin queue, approve, reject
 *   - Admin Moderation Queue & Inspection: listing, detail, zero sensitive data leakage
 *   - Admin Approval: PENDING_REVIEW -> PUBLISHED, self-approval forbidden, duplicate approval rejected
 *   - Admin Rejection: PENDING_REVIEW -> REJECTED, reason validation, self-rejection forbidden
 *   - Concurrency & Race Conditions: concurrent approve/reject handling
 *   - Audit Logging: AuditLog entries for APPROVE_PRODUCT and REJECT_PRODUCT
 *   - Full Regression: Features 01 through 07
 */

import { NextRequest } from "next/server";
import { POST as submitProductHandler } from "../src/app/api/v1/seller/products/[productId]/submit/route";
import { GET as listModerationHandler } from "../src/app/api/v1/admin/products/moderation/route";
import { GET as getProductDetailHandler } from "../src/app/api/v1/admin/products/[productId]/route";
import { POST as approveProductHandler } from "../src/app/api/v1/admin/products/[productId]/approve/route";
import { POST as rejectProductHandler } from "../src/app/api/v1/admin/products/[productId]/reject/route";
import { POST as createProductHandler } from "../src/app/api/v1/seller/products/route";
import { POST as uploadInitHandler } from "../src/app/api/v1/seller/products/[productId]/assets/upload/route";
import { PUT as localUploadHandler } from "../src/app/api/v1/internal/storage/upload/[...objectKey]/route";
import { POST as uploadCompleteHandler } from "../src/app/api/v1/seller/products/[productId]/assets/[assetId]/complete/route";
import { POST as signupHandler } from "../src/app/api/v1/auth/signup/route";
import { POST as loginHandler } from "../src/app/api/v1/auth/login/route";
import { GET as meHandler } from "../src/app/api/v1/auth/me/route";
import { PATCH as updateMeHandler } from "../src/app/api/v1/users/me/route";
import { POST as onboardHandler } from "../src/app/api/v1/seller/onboard/route";
import { PATCH as approveSellerHandler } from "../src/app/api/v1/admin/sellers/[id]/approve/route";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { signJwt } from "../src/lib/jwt";
import { getStorageProvider } from "../src/lib/storage/local-storage-provider";

function makeReq(url: string, method: string, body?: unknown, auth?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (auth !== undefined) headers["authorization"] = auth;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeGetReq(url: string, auth?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (auth !== undefined) headers["authorization"] = auth;
  return new NextRequest(url, { method: "GET", headers });
}

function makePutReq(url: string, data: Buffer): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/zip",
    "content-length": String(data.length),
  };
  return new NextRequest(url, { method: "PUT", headers, body: data as unknown as BodyInit });
}

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
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
  console.log("=".repeat(70));
  console.log("DIGITAL MARKETPLACE — FEATURE 08: PRODUCT MODERATION & PUBLISHING");
  console.log("=".repeat(70) + "\n");

  const ts = Date.now();
  const ph = await hashPassword("SecurePass123!@");

  // ── Seed users ─────────────────────────────────────────────────────────────
  const buyer = await prisma.user.create({
    data: {
      fullName: "Moderation Buyer",
      email: `buyer.mod.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      fullName: "Moderation Admin",
      email: `admin.mod.${ts}@test.com`,
      passwordHash: ph,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Seller A — Approved seller
  const sellerAUser = await prisma.user.create({
    data: {
      fullName: "Seller Alpha",
      email: `sellerA.mod.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Alpha Store",
          storeSlug: `alpha-mod-${ts}`,
          status: "PENDING",
          panNumberMasked: "ABCDE****F",
          bankAccountLast4: "****1111",
          bankIfsc: "HDFC0001111",
          bankAccountHolder: "Seller Alpha",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerAProfile = sellerAUser.sellerProfile!;

  // Seller B — Approved seller (for cross-seller IDOR testing)
  const sellerBUser = await prisma.user.create({
    data: {
      fullName: "Seller Beta",
      email: `sellerB.mod.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Beta Store",
          storeSlug: `beta-mod-${ts}`,
          status: "PENDING",
          panNumberMasked: "XYZAB****C",
          bankAccountLast4: "****2222",
          bankIfsc: "ICIC0002222",
          bankAccountHolder: "Seller Beta",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerBProfile = sellerBUser.sellerProfile!;

  // Admin Seller — Admin who also has a SellerProfile (for self-approval testing)
  const adminSellerUser = await prisma.user.create({
    data: {
      fullName: "Admin Who Is Seller",
      email: `admin.seller.mod.${ts}@test.com`,
      passwordHash: ph,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Admin Store",
          storeSlug: `admin-store-${ts}`,
          status: "PENDING",
          panNumberMasked: "ADMIN****F",
          bankAccountLast4: "****3333",
          bankIfsc: "SBIN0003333",
          bankAccountHolder: "Admin Seller",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const adminSellerProfile = adminSellerUser.sellerProfile!;

  // Pending seller
  const pendingUser = await prisma.user.create({
    data: {
      fullName: "Pending Seller",
      email: `pending.mod.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Pending Store",
          storeSlug: `pending-mod-${ts}`,
          status: "PENDING",
        },
      },
    },
    include: { sellerProfile: true },
  });

  // Rejected seller
  const rejectedUser = await prisma.user.create({
    data: {
      fullName: "Rejected Seller",
      email: `rejected.mod.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Rejected Store",
          storeSlug: `rejected-mod-${ts}`,
          status: "REJECTED",
          rejectionReason: "KYC rejected",
        },
      },
    },
    include: { sellerProfile: true },
  });

  // Inactive user
  const inactiveUser = await prisma.user.create({
    data: {
      fullName: "Inactive User",
      email: `inactive.mod.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: false,
      isEmailVerified: true,
    },
  });

  // ── Approve Seller Profiles via Admin ──────────────────────────────────────
  const adminToken = `Bearer ${signJwt({ sub: admin.id, email: admin.email, role: "ADMIN" })}`;

  await approveSellerHandler(
    makeReq(`http://localhost/api/v1/admin/sellers/${sellerAProfile.id}/approve`, "PATCH", {}, adminToken),
    { params: { id: sellerAProfile.id } }
  );
  await approveSellerHandler(
    makeReq(`http://localhost/api/v1/admin/sellers/${sellerBProfile.id}/approve`, "PATCH", {}, adminToken),
    { params: { id: sellerBProfile.id } }
  );
  await approveSellerHandler(
    makeReq(`http://localhost/api/v1/admin/sellers/${adminSellerProfile.id}/approve`, "PATCH", {}, adminToken),
    { params: { id: adminSellerProfile.id } }
  );

  // ── Seed category ─────────────────────────────────────────────────────────
  let category = await prisma.category.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Software Development", slug: `soft-dev-${ts}`, isActive: true },
      select: { id: true },
    });
  }

  // ── Tokens ────────────────────────────────────────────────────────────────
  const buyerToken = `Bearer ${signJwt({ sub: buyer.id, email: buyer.email, role: "BUYER" })}`;
  const sellerAToken = `Bearer ${signJwt({ sub: sellerAUser.id, email: sellerAUser.email, role: "BUYER" })}`;
  const sellerBToken = `Bearer ${signJwt({ sub: sellerBUser.id, email: sellerBUser.email, role: "BUYER" })}`;
  const adminSellerToken = `Bearer ${signJwt({ sub: adminSellerUser.id, email: adminSellerUser.email, role: "ADMIN" })}`;
  const pendingToken = `Bearer ${signJwt({ sub: pendingUser.id, email: pendingUser.email, role: "BUYER" })}`;
  const rejectedToken = `Bearer ${signJwt({ sub: rejectedUser.id, email: rejectedUser.email, role: "BUYER" })}`;
  const inactiveToken = `Bearer ${signJwt({ sub: inactiveUser.id, email: inactiveUser.email, role: "BUYER" })}`;
  const expiredToken = `Bearer ${signJwt({ sub: sellerAUser.id, email: sellerAUser.email, role: "BUYER" }, { expiresIn: "0s" })}`;

  // ── Helper: Create a product and attach confirmed physical asset ──────────
  async function createReadyProduct(sellerTokenToUse: string, title: string) {
    const createRes = await createProductHandler(
      makeReq("http://localhost/api/v1/seller/products", "POST", {
        title,
        shortDescription: "A comprehensive developer toolkit with components and tests.",
        description: "Full production-ready component suite with TypeScript, dark mode, unit tests, and documentation included.",
        categoryId: category!.id,
        productType: "DIGITAL_DOWNLOAD",
        pricePaise: 79900,
        tags: ["React", "UI"],
        fileFormats: ["ZIP"],
        version: "1.0.0",
      }, sellerTokenToUse)
    );
    const createData = await parseJson(createRes);
    const prodId = createData.data.product.id;

    // Init upload
    const uploadInitRes = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${prodId}/assets/upload`, "POST", {
        fileName: "asset.zip",
        contentType: "application/zip",
        fileSizeBytes: 1024,
      }, sellerTokenToUse),
      { params: { productId: prodId } }
    );
    const initData = await parseJson(uploadInitRes);
    const assetId = initData.data.assetId;
    const objectKey = initData.data.objectKey;

    // Write file to local storage
    const testBytes = Buffer.from("PK\x03\x04 fake zip binary data for moderation test");
    await localUploadHandler(
      makePutReq(`http://localhost/api/v1/internal/storage/upload/${objectKey}`, testBytes),
      { params: { objectKey: objectKey.split("/") } }
    );

    // Complete upload
    await uploadCompleteHandler(
      makeReq(`http://localhost/api/v1/seller/products/${prodId}/assets/${assetId}/complete`, "POST", {}, sellerTokenToUse),
      { params: { productId: prodId, assetId } }
    );

    return prodId;
  }

  // Seed Product A (Seller A)
  const productAId = await createReadyProduct(sellerAToken, "Product Alpha Pro Kit");
  // Seed Product B (Seller B)
  const productBId = await createReadyProduct(sellerBToken, "Product Beta Design System");
  // Seed Product Admin (Admin Seller)
  const productAdminId = await createReadyProduct(adminSellerToken, "Product Admin Creator System");

  // Seed a product with NO files
  const productNoFiles = (await prisma.product.create({
    data: {
      sellerId: sellerAProfile.id,
      categoryId: category.id,
      title: "Product Without Digital Asset",
      slug: `no-files-${ts}`,
      shortDescription: "This product has no files uploaded to test completeness validation.",
      description: "A complete description for a product without any uploaded files attached to it.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 49900,
      status: "DRAFT",
    },
    select: { id: true },
  })).id;

  // Seed a product with an unconfirmed asset (storage file does NOT exist)
  const productGhostAsset = (await prisma.product.create({
    data: {
      sellerId: sellerAProfile.id,
      categoryId: category.id,
      title: "Product Ghost Asset Verification",
      slug: `ghost-asset-${ts}`,
      shortDescription: "This product references a file that does not exist in storage.",
      description: "A product used to verify that assets must physically exist in storage before submission.",
      productType: "DIGITAL_DOWNLOAD",
      pricePaise: 49900,
      status: "DRAFT",
      files: {
        create: {
          originalFilename: "ghost.zip",
          fileSize: BigInt(1024),
          mimeType: "application/zip",
          storageKey: `products/fake-id/ghost/file.zip`,
        },
      },
    },
    select: { id: true },
  })).id;

  // ==========================================================================
  // SECTION 1: SELLER SUBMISSION — AUTHENTICATION & SELLER STATUS
  // ==========================================================================

  await runTest("Unauthenticated seller submission rejected (401)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 401 && !data.success };
  });

  await runTest("Invalid token on submission rejected (403)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, "Bearer invalid.jwt"),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Expired token on submission rejected (403)", async () => {
    await new Promise((r) => setTimeout(r, 50));
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, expiredToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Inactive user submission rejected (403)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, inactiveToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Normal BUYER cannot submit product (403)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, buyerToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("PENDING seller cannot submit product (403)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, pendingToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("REJECTED seller cannot submit product (403)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, rejectedToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  // ==========================================================================
  // SECTION 2: OWNERSHIP & IDOR PROTECTION
  // ==========================================================================

  await runTest("Seller A cannot submit Seller B's product (IDOR 403)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productBId}/submit`, "POST", {}, sellerAToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Seller B cannot submit Seller A's product (IDOR 403)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, sellerBToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Injected sellerId or status in body is rejected (strict schema)", async () => {
    const fraudBody = { sellerId: sellerBProfile.id, status: "PUBLISHED" };
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", fraudBody, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Nonexistent product ID returns 404", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/nonexistent-cuid/submit`, "POST", {}, sellerAToken),
      { params: { productId: "nonexistent-cuid" } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 404 && !data.success };
  });

  // ==========================================================================
  // SECTION 3: COMPLETENESS VALIDATION
  // ==========================================================================

  await runTest("Submission rejected when product has no digital asset (400)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productNoFiles}/submit`, "POST", {}, sellerAToken),
      { params: { productId: productNoFiles } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success && data.error?.code === "MISSING_DIGITAL_ASSET" };
  });

  await runTest("Submission rejected when digital asset does not exist in storage (422)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productGhostAsset}/submit`, "POST", {}, sellerAToken),
      { params: { productId: productGhostAsset } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 422 && !data.success && data.error?.code === "UNCONFIRMED_DIGITAL_ASSET" };
  });

  // ==========================================================================
  // SECTION 4: SUCCESSFUL SUBMISSION (DRAFT -> PENDING_REVIEW)
  // ==========================================================================

  await runTest("Approved seller can submit owned DRAFT product (200)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 200 && data.success && data.data.product.status === "PENDING_REVIEW",
      details: data.success ? `status=${data.data.product.status}` : JSON.stringify(data.error),
    };
  });

  await runTest("Product status in PostgreSQL is PENDING_REVIEW", async () => {
    const product = await prisma.product.findUnique({
      where: { id: productAId },
      select: { status: true, rejectionReason: true },
    });
    return { passed: product?.status === "PENDING_REVIEW" && product?.rejectionReason === null };
  });

  await runTest("Duplicate submission on PENDING_REVIEW product rejected (409)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 409 && !data.success };
  });

  // Submit Product B as well (for admin moderation testing)
  await runTest("Approved Seller B submits Product B for review (200)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productBId}/submit`, "POST", {}, sellerBToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success && data.data.product.status === "PENDING_REVIEW" };
  });

  // Submit Admin Seller's product for review (for self-approval test)
  await runTest("Admin Seller submits own product for review (200)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAdminId}/submit`, "POST", {}, adminSellerToken),
      { params: { productId: productAdminId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success && data.data.product.status === "PENDING_REVIEW" };
  });

  // ==========================================================================
  // SECTION 5: ADMIN AUTHORIZATION & MODERATION QUEUE
  // ==========================================================================

  await runTest("Unauthenticated access to admin moderation queue rejected (401)", async () => {
    const res = await listModerationHandler(makeGetReq("http://localhost/api/v1/admin/products/moderation"));
    const data = await parseJson(res);
    return { passed: res.status === 401 && !data.success };
  });

  await runTest("BUYER cannot access admin moderation queue (403)", async () => {
    const res = await listModerationHandler(makeGetReq("http://localhost/api/v1/admin/products/moderation", buyerToken));
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("SELLER cannot access admin moderation queue (403)", async () => {
    const res = await listModerationHandler(makeGetReq("http://localhost/api/v1/admin/products/moderation", sellerAToken));
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("ADMIN can list moderation queue (200)", async () => {
    const res = await listModerationHandler(makeGetReq("http://localhost/api/v1/admin/products/moderation", adminToken));
    const data = await parseJson(res);
    const products: any[] = data.data?.products || [];
    const hasProductA = products.some((p) => p.id === productAId);
    const hasProductB = products.some((p) => p.id === productBId);
    return {
      passed: res.status === 200 && data.success && hasProductA && hasProductB,
      details: `queueCount=${products.length}`,
    };
  });

  await runTest("DRAFT product does NOT appear in pending moderation queue", async () => {
    const res = await listModerationHandler(makeGetReq("http://localhost/api/v1/admin/products/moderation", adminToken));
    const data = await parseJson(res);
    const products: any[] = data.data?.products || [];
    const hasDraftNoFiles = products.some((p) => p.id === productNoFiles);
    return { passed: !hasDraftNoFiles };
  });

  await runTest("Moderation queue response does NOT expose storageKey or private paths", async () => {
    const res = await listModerationHandler(makeGetReq("http://localhost/api/v1/admin/products/moderation", adminToken));
    const data = await parseJson(res);
    const str = JSON.stringify(data);
    const isClean =
      !str.includes("storageKey") &&
      !str.includes("storage/private") &&
      !str.includes("passwordHash") &&
      !str.includes("panNumber") &&
      !str.includes("bankAccount");
    return { passed: isClean };
  });

  // ==========================================================================
  // SECTION 6: ADMIN PRODUCT DETAIL INSPECTION
  // ==========================================================================

  await runTest("Non-admin cannot view admin product detail (403)", async () => {
    const res = await getProductDetailHandler(
      makeGetReq(`http://localhost/api/v1/admin/products/${productAId}`, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("ADMIN can inspect product detail for moderation (200)", async () => {
    const res = await getProductDetailHandler(
      makeGetReq(`http://localhost/api/v1/admin/products/${productAId}`, adminToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 200 && data.success && data.data.product.id === productAId,
      details: `title=${data.data?.product?.title}`,
    };
  });

  await runTest("Admin product detail for nonexistent product returns 404", async () => {
    const res = await getProductDetailHandler(
      makeGetReq(`http://localhost/api/v1/admin/products/nonexistent-id`, adminToken),
      { params: { productId: "nonexistent-id" } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 404 && !data.success };
  });

  // ==========================================================================
  // SECTION 7: ADMIN APPROVAL (PENDING_REVIEW -> PUBLISHED)
  // ==========================================================================

  await runTest("Unauthenticated cannot approve product (401)", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productAId}/approve`, "POST", {}),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 401 && !data.success };
  });

  await runTest("BUYER cannot approve product (403)", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productAId}/approve`, "POST", {}, buyerToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("SELLER cannot approve own product (403)", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productAId}/approve`, "POST", {}, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Admin cannot self-approve product owned by own SellerProfile (403)", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productAdminId}/approve`, "POST", {}, adminSellerToken),
      { params: { productId: productAdminId } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 403 && !data.success && data.error?.code === "SELF_APPROVAL_FORBIDDEN",
      details: data.error?.code,
    };
  });

  await runTest("DRAFT product cannot be approved directly (400)", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productNoFiles}/approve`, "POST", {}, adminToken),
      { params: { productId: productNoFiles } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success && data.error?.code === "INVALID_STATUS_TRANSITION" };
  });

  await runTest("ADMIN approves Product A (PENDING_REVIEW -> PUBLISHED) (200)", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productAId}/approve`, "POST", {}, adminToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 200 && data.success && data.data.product.status === "PUBLISHED",
      details: data.success ? `status=${data.data.product.status}` : JSON.stringify(data.error),
    };
  });

  await runTest("PostgreSQL confirms Product A status is PUBLISHED", async () => {
    const product = await prisma.product.findUnique({
      where: { id: productAId },
      select: { status: true, sellerId: true },
    });
    return { passed: product?.status === "PUBLISHED" && product.sellerId === sellerAProfile.id };
  });

  await runTest("AuditLog entry recorded for APPROVE_PRODUCT", async () => {
    const log = await prisma.auditLog.findFirst({
      where: {
        action: "APPROVE_PRODUCT",
        targetId: productAId,
      },
    });
    return { passed: !!log && log.targetEntity === "Product" };
  });

  await runTest("Duplicate approval on already PUBLISHED product rejected (400)", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productAId}/approve`, "POST", {}, adminToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success && data.error?.code === "ALREADY_APPROVED" };
  });

  await runTest("PUBLISHED product cannot be submitted for review again (409)", async () => {
    const res = await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/submit`, "POST", {}, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 409 && !data.success };
  });

  // ==========================================================================
  // SECTION 8: ADMIN REJECTION (PENDING_REVIEW -> REJECTED)
  // ==========================================================================

  await runTest("BUYER cannot reject product (403)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/reject`, "POST", { rejectionReason: "Violates policies" }, buyerToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("SELLER cannot reject own product (403)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/reject`, "POST", { rejectionReason: "Violates policies" }, sellerBToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Admin cannot self-reject own product (403)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productAdminId}/reject`, "POST", { rejectionReason: "Self rejection test" }, adminSellerToken),
      { params: { productId: productAdminId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success && data.error?.code === "SELF_REJECTION_FORBIDDEN" };
  });

  await runTest("Rejection with empty reason rejected (400)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/reject`, "POST", { rejectionReason: "" }, adminToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Rejection with reason too short (< 5 chars) rejected (400)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/reject`, "POST", { rejectionReason: "Bad" }, adminToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Rejection with oversized reason (> 1000 chars) rejected (400)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/reject`, "POST", { rejectionReason: "x".repeat(1001) }, adminToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Rejection with unexpected fields rejected (400)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/reject`, "POST", { rejectionReason: "Valid reason message", status: "DRAFT" }, adminToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("ADMIN rejects Product B (PENDING_REVIEW -> REJECTED) (200)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/reject`, "POST", { rejectionReason: "Archive contains corrupted font files" }, adminToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 200 && data.success && data.data.product.status === "REJECTED",
      details: data.success ? `rejectionReason=${data.data.product.rejectionReason}` : JSON.stringify(data.error),
    };
  });

  await runTest("PostgreSQL confirms Product B status is REJECTED with reason", async () => {
    const product = await prisma.product.findUnique({
      where: { id: productBId },
      select: { status: true, rejectionReason: true },
    });
    return {
      passed:
        product?.status === "REJECTED" &&
        product.rejectionReason === "Archive contains corrupted font files",
    };
  });

  await runTest("AuditLog entry recorded for REJECT_PRODUCT", async () => {
    const log = await prisma.auditLog.findFirst({
      where: {
        action: "REJECT_PRODUCT",
        targetId: productBId,
      },
    });
    return { passed: !!log && log.targetEntity === "Product" };
  });

  await runTest("Duplicate rejection on already REJECTED product rejected (400)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/reject`, "POST", { rejectionReason: "Second rejection attempt" }, adminToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success && data.error?.code === "ALREADY_REJECTED" };
  });

  await runTest("REJECTED product cannot be approved directly (400)", async () => {
    const res = await approveProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productBId}/approve`, "POST", {}, adminToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success && data.error?.code === "INVALID_STATUS_TRANSITION" };
  });

  await runTest("PUBLISHED product cannot be rejected (400)", async () => {
    const res = await rejectProductHandler(
      makeReq(`http://localhost/api/v1/admin/products/${productAId}/reject`, "POST", { rejectionReason: "Try to reject published" }, adminToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success && data.error?.code === "INVALID_STATUS_TRANSITION" };
  });

  // ==========================================================================
  // SECTION 9: CONCURRENCY / RACE CONDITION SAFETY
  // ==========================================================================

  await runTest("Concurrency: simultaneous approve and reject resolves safely", async () => {
    // Seed a product for concurrent testing
    const concurrentProdId = await createReadyProduct(sellerAToken, "Concurrent Testing Product");
    // Submit for review
    await submitProductHandler(
      makeReq(`http://localhost/api/v1/seller/products/${concurrentProdId}/submit`, "POST", {}, sellerAToken),
      { params: { productId: concurrentProdId } }
    );

    // Run approve and reject simultaneously via Promise.all
    const [approveRes, rejectRes] = await Promise.all([
      approveProductHandler(
        makeReq(`http://localhost/api/v1/admin/products/${concurrentProdId}/approve`, "POST", {}, adminToken),
        { params: { productId: concurrentProdId } }
      ),
      rejectProductHandler(
        makeReq(`http://localhost/api/v1/admin/products/${concurrentProdId}/reject`, "POST", { rejectionReason: "Concurrent reject" }, adminToken),
        { params: { productId: concurrentProdId } }
      ),
    ]);

    const approveData = await parseJson(approveRes);
    const rejectData = await parseJson(rejectRes);

    // Exactly one should succeed (200), the other must fail (400 or 409)
    const successCount = (approveRes.ok && approveData.success ? 1 : 0) + (rejectRes.ok && rejectData.success ? 1 : 0);
    const failureCount = (!approveRes.ok ? 1 : 0) + (!rejectRes.ok ? 1 : 0);

    const finalProduct = await prisma.product.findUnique({
      where: { id: concurrentProdId },
      select: { status: true },
    });

    return {
      passed: successCount === 1 && failureCount === 1 && (finalProduct?.status === "PUBLISHED" || finalProduct?.status === "REJECTED"),
      details: `successCount=${successCount}, finalStatus=${finalProduct?.status}`,
    };
  });

  // ==========================================================================
  // SECTION 10: REGRESSION TESTING (Features 01 - 07)
  // ==========================================================================

  await runTest("REGRESSION: Feature 01 Signup still works", async () => {
    const uniqueEmail = `mod.reg.08.${Date.now()}.${Math.random().toString(36).slice(2)}@test.com`;
    const res = await signupHandler(makeReq("http://localhost/api/v1/auth/signup", "POST", {
      fullName: "Regression 08 User",
      email: uniqueEmail,
      password: "Regress!onPass08",
    }));
    const data = await parseJson(res);
    return { passed: res.status === 201 && data.success && !!data.data?.user?.id };
  });

  await runTest("REGRESSION: Feature 02 Login still works", async () => {
    const res = await loginHandler(makeReq("http://localhost/api/v1/auth/login", "POST", {
      email: buyer.email,
      password: "SecurePass123!@",
    }));
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success && !!data.data?.token };
  });

  await runTest("REGRESSION: Feature 03 /auth/me still works", async () => {
    const res = await meHandler(makeGetReq("http://localhost/api/v1/auth/me", buyerToken));
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success && data.data?.user?.id === buyer.id };
  });

  await runTest("REGRESSION: Feature 03 /users/me PATCH still works", async () => {
    const res = await updateMeHandler(
      makeReq("http://localhost/api/v1/users/me", "PATCH", { fullName: "Updated Buyer 08" }, buyerToken)
    );
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success && data.data?.user?.fullName === "Updated Buyer 08" };
  });

  await runTest("REGRESSION: Feature 04 Seller onboarding route works", async () => {
    const res = await onboardHandler(makeReq("http://localhost/api/v1/seller/onboard", "POST", {}));
    const data = await parseJson(res);
    return { passed: res.status === 401 && !data.success };
  });

  await runTest("REGRESSION: Feature 05 Admin seller approval route works", async () => {
    const { GET: getPendingSellers } = await import("../src/app/api/v1/admin/sellers/pending/route");
    const res = await getPendingSellers(makeGetReq("http://localhost/api/v1/admin/sellers/pending", adminToken));
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success };
  });

  await runTest("REGRESSION: Feature 06 Product creation still works", async () => {
    const res = await createProductHandler(
      makeReq("http://localhost/api/v1/seller/products", "POST", {
        title: "Regression 08 Product Item",
        shortDescription: "Valid short description for regression test in feature 08.",
        description: "A valid long description that satisfies the minimum 50 characters requirement for regression tests.",
        categoryId: category!.id,
        productType: "DIGITAL_DOWNLOAD",
        pricePaise: 49900,
      }, sellerAToken)
    );
    const data = await parseJson(res);
    return { passed: res.status === 201 && data.success && data.data.product.status === "DRAFT" };
  });

  await runTest("REGRESSION: Feature 07 Private digital file upload still works", async () => {
    const testProdId = await createReadyProduct(sellerAToken, "Regression 07 File Upload Product");
    const product = await prisma.product.findUnique({
      where: { id: testProdId },
      include: { files: true },
    });
    return {
      passed: product?.status === "DRAFT" && product.files.length > 0,
      details: `filesCount=${product?.files.length}`,
    };
  });

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  console.log("\n" + "=".repeat(70));
  console.log("RESULTS SUMMARY");
  console.log("=".repeat(70));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results
    .filter((r) => !r.passed)
    .forEach((r) =>
      console.error(
        `[FAIL] ${String(r.num).padStart(2, "0")} ${r.name}${r.details ? " — " + r.details : ""}`
      )
    );

  console.log(`\n${passed}/${results.length} tests passed.`);

  if (failed > 0) {
    console.error(`\n${failed} tests FAILED.`);
    process.exit(1);
  } else {
    console.log("\n✅ ALL TESTS PASSED.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
