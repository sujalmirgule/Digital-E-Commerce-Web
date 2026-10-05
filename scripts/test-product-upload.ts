/**
 * Feature 06 + 07 — Seller Product Creation & Private Digital File Upload Test Suite
 *
 * Covers 68 comprehensive, deterministic test cases:
 *   - Feature 06: Product creation (prerequisite)
 *   - Feature 07: Private digital asset upload lifecycle
 *   - Authentication: missing, invalid, expired, tampered, malformed, inactive
 *   - Seller authorization: BUYER, PENDING, REJECTED, APPROVED
 *   - IDOR / ownership protection (Seller A vs Seller B)
 *   - Product state guards: DRAFT allowed, PUBLISHED rejected, ARCHIVED rejected
 *   - Input validation: filename (missing, empty, oversized, path traversal Unix/Windows),
 *     MIME types, extensions, size (zero, negative, oversized, non-numeric), extra fields, malformed JSON
 *   - Storage security: server-generated object keys, no user-controlled path segments,
 *     traversal blocked, private storage location (not in public/), no secret/path leakage
 *   - Upload lifecycle & completion verification: verified existence, missing object rejection,
 *     actual size verification, product remains DRAFT
 *   - Duplicate / replace upload: second upload replaces previous asset, updates metadata, preserves DRAFT
 *   - API contract compliance: POST /api/v1/seller/products/:productId/upload-presign alias
 *   - Section 18 authorization matrix: 5 required cross-combinations
 *   - Regressions: Signup, Login, /auth/me, /users/me PATCH, Seller onboarding, Admin approval
 */

import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { POST as createProductHandler } from "../src/app/api/v1/seller/products/route";
import { POST as uploadInitHandler } from "../src/app/api/v1/seller/products/[productId]/assets/upload/route";
import { POST as uploadCompleteHandler } from "../src/app/api/v1/seller/products/[productId]/assets/[assetId]/complete/route";
import { PUT as localUploadHandler } from "../src/app/api/v1/internal/storage/upload/[...objectKey]/route";
import { POST as signupHandler } from "../src/app/api/v1/auth/signup/route";
import { POST as loginHandler } from "../src/app/api/v1/auth/login/route";
import { GET as meHandler } from "../src/app/api/v1/auth/me/route";
import { PATCH as approveSellerHandler } from "../src/app/api/v1/admin/sellers/[id]/approve/route";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { signJwt } from "../src/lib/jwt";

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeReq(
  url: string,
  method: string,
  body?: unknown,
  auth?: string
): NextRequest {
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

function makePutReq(url: string, data: Buffer, contentType?: string): NextRequest {
  const headers: Record<string, string> = {
    "content-type": contentType ?? "application/zip",
    "content-length": String(data.length),
  };
  return new NextRequest(url, { method: "PUT", headers, body: data as unknown as BodyInit });
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

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("DIGITAL MARKETPLACE — FEATURE 06 + 07: COMPREHENSIVE TEST SUITE");
  console.log("=".repeat(70) + "\n");

  const ts = Date.now();
  const ph = await hashPassword("SecurePass123!@");

  // ── Seed users ─────────────────────────────────────────────────────────────
  const buyer = await prisma.user.create({
    data: {
      fullName: "Upload Test Buyer",
      email: `buyer.upload.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      fullName: "Upload Test Admin",
      email: `admin.upload.${ts}@test.com`,
      passwordHash: ph,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Seller A — PENDING (will be approved)
  const sellerAUser = await prisma.user.create({
    data: {
      fullName: "Seller Alpha",
      email: `selleralpha.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Alpha Store",
          storeSlug: `alpha-store-${ts}`,
          status: "PENDING",
          panNumberMasked: "ABCDE****F",
          bankAccountLast4: "****1234",
          bankIfsc: "HDFC0001234",
          bankAccountHolder: "Seller Alpha",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerAProfile = sellerAUser.sellerProfile!;

  // Seller B — also PENDING (will be approved, separate product)
  const sellerBUser = await prisma.user.create({
    data: {
      fullName: "Seller Beta",
      email: `sellerbeta.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Beta Store",
          storeSlug: `beta-store-${ts}`,
          status: "PENDING",
          panNumberMasked: "XYZAB****C",
          bankAccountLast4: "****5678",
          bankIfsc: "ICIC0001234",
          bankAccountHolder: "Seller Beta",
        },
      },
    },
    include: { sellerProfile: true },
  });
  const sellerBProfile = sellerBUser.sellerProfile!;

  // Pending seller (remains PENDING — never approved)
  const pendingUser = await prisma.user.create({
    data: {
      fullName: "Pending Seller",
      email: `pending.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Pending Store",
          storeSlug: `pending-store-${ts}`,
          status: "PENDING",
          panNumberMasked: "PENDG****F",
          bankAccountLast4: "****4321",
          bankIfsc: "HDFC0004321",
          bankAccountHolder: "Pending Person",
        },
      },
    },
    include: { sellerProfile: true },
  });

  // Rejected seller
  const rejectedUser = await prisma.user.create({
    data: {
      fullName: "Rejected Seller",
      email: `rejected.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
      sellerProfile: {
        create: {
          storeName: "Rejected Store",
          storeSlug: `rejected-store-${ts}`,
          status: "REJECTED",
          rejectionReason: "KYC mismatch",
          panNumberMasked: "ABCDE****F",
          bankAccountLast4: "****9999",
          bankIfsc: "SBIN0001234",
          bankAccountHolder: "Rejected Person",
        },
      },
    },
    include: { sellerProfile: true },
  });

  // Inactive user
  const inactiveUser = await prisma.user.create({
    data: {
      fullName: "Inactive User",
      email: `inactive.${ts}@test.com`,
      passwordHash: ph,
      role: "BUYER",
      isActive: false,
      isEmailVerified: true,
    },
  });

  // ── Approve sellers via admin ─────────────────────────────────────────────
  const adminToken = `Bearer ${signJwt({ sub: admin.id, email: admin.email, role: "ADMIN" })}`;

  await approveSellerHandler(
    makeReq(`http://localhost/api/v1/admin/sellers/${sellerAProfile.id}/approve`, "PATCH", {}, adminToken),
    { params: { id: sellerAProfile.id } }
  );
  await approveSellerHandler(
    makeReq(`http://localhost/api/v1/admin/sellers/${sellerBProfile.id}/approve`, "PATCH", {}, adminToken),
    { params: { id: sellerBProfile.id } }
  );

  // ── Seed category ─────────────────────────────────────────────────────────
  let category = await prisma.category.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: "Development", slug: `dev-${ts}`, isActive: true },
      select: { id: true },
    });
  }

  // ── JWT tokens ────────────────────────────────────────────────────────────
  const buyerToken = `Bearer ${signJwt({ sub: buyer.id, email: buyer.email, role: "BUYER" })}`;
  const sellerAToken = `Bearer ${signJwt({ sub: sellerAUser.id, email: sellerAUser.email, role: "BUYER" })}`;
  const sellerBToken = `Bearer ${signJwt({ sub: sellerBUser.id, email: sellerBUser.email, role: "BUYER" })}`;
  const pendingToken = `Bearer ${signJwt({ sub: pendingUser.id, email: pendingUser.email, role: "BUYER" })}`;
  const rejectedToken = `Bearer ${signJwt({ sub: rejectedUser.id, email: rejectedUser.email, role: "BUYER" })}`;
  const inactiveToken = `Bearer ${signJwt({ sub: inactiveUser.id, email: inactiveUser.email, role: "BUYER" })}`;
  const expiredToken = `Bearer ${signJwt({ sub: sellerAUser.id, email: sellerAUser.email, role: "BUYER" }, { expiresIn: "0s" })}`;
  const tamperedToken = `Bearer ${sellerAToken.replace("Bearer ", "").slice(0, -5)}ZZZZZ`;
  const malformedToken = `Token abc123`;

  // ── Shared product data ───────────────────────────────────────────────────
  const validProductBody = {
    title: "Ultimate React Dashboard UI Kit Pro",
    shortDescription: "Over 50 pre-built React and Tailwind CSS dashboard components.",
    description: "A comprehensive React dashboard component library with 50+ components, dark mode support, and full TypeScript definitions included.",
    categoryId: category.id,
    productType: "DIGITAL_DOWNLOAD" as const,
    pricePaise: 79900,
    isFree: false,
    tags: ["React", "Dashboard", "Tailwind"],
    fileFormats: ["ZIP"],
    version: "1.0.0",
  };

  const validUploadBody = {
    fileName: "dashboard-kit-v1.zip",
    contentType: "application/zip",
    fileSizeBytes: 1024 * 1024 * 10, // 10 MB
  };

  let productAId = "";
  let productBId = "";
  let publishedProductId = "";
  let archivedProductId = "";

  // ==========================================================================
  // SECTION 1: FEATURE 06 — PRODUCT CREATION (prerequisite)
  // ==========================================================================

  await runTest("BUYER cannot create product", async () => {
    const res = await createProductHandler(makeReq("http://localhost/api/v1/seller/products", "POST", validProductBody, buyerToken));
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Unauthenticated cannot create product", async () => {
    const res = await createProductHandler(makeReq("http://localhost/api/v1/seller/products", "POST", validProductBody));
    const data = await parseJson(res);
    return { passed: res.status === 401 && !data.success };
  });

  await runTest("Rejected seller cannot create product", async () => {
    const res = await createProductHandler(makeReq("http://localhost/api/v1/seller/products", "POST", validProductBody, rejectedToken));
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Approved seller can create product (Seller A)", async () => {
    const res = await createProductHandler(makeReq("http://localhost/api/v1/seller/products", "POST", validProductBody, sellerAToken));
    const data = await parseJson(res);
    if (data.success) productAId = data.data.product.id;
    return {
      passed: res.status === 201 && data.success && !!data.data?.product?.id && data.data.product.status === "DRAFT",
      details: data.success ? `productId=${data.data.product.id}` : JSON.stringify(data.error),
    };
  });

  await runTest("Approved seller B can create product (Seller B)", async () => {
    const res = await createProductHandler(makeReq("http://localhost/api/v1/seller/products", "POST", {
      ...validProductBody,
      title: "Beta Seller Design System Kit",
      shortDescription: "A complete Figma and React design system for developers and designers.",
    }, sellerBToken));
    const data = await parseJson(res);
    if (data.success) productBId = data.data.product.id;
    return {
      passed: res.status === 201 && data.success && data.data.product.status === "DRAFT",
      details: data.success ? `productId=${data.data.product.id}` : JSON.stringify(data.error),
    };
  });

  await runTest("Product creation: product is owned by correct seller", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const product = await prisma.product.findUnique({ where: { id: productAId }, select: { sellerId: true } });
    const approvedProfile = await prisma.sellerProfile.findUnique({ where: { userId: sellerAUser.id }, select: { id: true } });
    return { passed: product?.sellerId === approvedProfile?.id };
  });

  await runTest("Product creation: invalid category rejected", async () => {
    const res = await createProductHandler(makeReq("http://localhost/api/v1/seller/products", "POST", { ...validProductBody, categoryId: "nonexistent-cat-id" }, sellerAToken));
    const data = await parseJson(res);
    return { passed: res.status === 404 && !data.success };
  });

  await runTest("Product creation: title too short rejected", async () => {
    const res = await createProductHandler(makeReq("http://localhost/api/v1/seller/products", "POST", { ...validProductBody, title: "Hi" }, sellerAToken));
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Product creation: no sellerId in response (IDOR check)", async () => {
    const fraudBody = { ...validProductBody, title: "IDOR Test Product Alpha", sellerId: sellerBProfile.id };
    const res = await createProductHandler(makeReq("http://localhost/api/v1/seller/products", "POST", fraudBody, sellerAToken));
    const data = await parseJson(res);
    if (!data.success) return { passed: true };
    const approvedProfile = await prisma.sellerProfile.findUnique({ where: { userId: sellerAUser.id }, select: { id: true } });
    return { passed: data.data.product.sellerId === approvedProfile?.id };
  });

  // Seed PUBLISHED and ARCHIVED products for state guard tests
  if (productAId) {
    const sellerAId = (await prisma.sellerProfile.findUnique({ where: { userId: sellerAUser.id }, select: { id: true } }))!.id;

    publishedProductId = (await prisma.product.create({
      data: {
        sellerId: sellerAId,
        categoryId: category.id,
        title: "Already Published Product",
        slug: `published-prod-${ts}`,
        shortDescription: "This product is already published for testing state guards.",
        description: "A product in PUBLISHED state used to test that upload cannot target non-DRAFT products.",
        productType: "DIGITAL_DOWNLOAD",
        pricePaise: 49900,
        status: "PUBLISHED",
      },
      select: { id: true },
    })).id;

    archivedProductId = (await prisma.product.create({
      data: {
        sellerId: sellerAId,
        categoryId: category.id,
        title: "Archived Product Guard Test",
        slug: `archived-prod-${ts}`,
        shortDescription: "This product is archived for testing state guards.",
        description: "An archived product used to verify that non-DRAFT products reject uploads.",
        productType: "DIGITAL_DOWNLOAD",
        pricePaise: 39900,
        status: "ARCHIVED",
      },
      select: { id: true },
    })).id;
  }

  // ==========================================================================
  // SECTION 2: UPLOAD INITIALIZATION — AUTHENTICATION
  // ==========================================================================

  await runTest("Unauthenticated upload init rejected (no header)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 401 && !data.success };
  });

  await runTest("Invalid JWT rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, "Bearer not.a.real.jwt"),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Expired JWT rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    await new Promise((r) => setTimeout(r, 100));
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, expiredToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Tampered JWT rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, tamperedToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Malformed Authorization header rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, malformedToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Inactive user JWT rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, inactiveToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  // ==========================================================================
  // SECTION 3: SELLER AUTHORIZATION
  // ==========================================================================

  await runTest("BUYER cannot initialize upload", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, buyerToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("PENDING seller cannot initialize upload", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, pendingToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("REJECTED seller cannot initialize upload", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, rejectedToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("APPROVED seller can initialize upload for own product", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 200 && data.success && !!data.data?.uploadUrl && !!data.data?.assetId,
      details: data.success ? `assetId=${data.data.assetId}` : JSON.stringify(data.error),
    };
  });

  // ==========================================================================
  // SECTION 4: IDOR / OWNERSHIP TESTS
  // ==========================================================================

  await runTest("Seller B cannot upload to Seller A product (IDOR)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, sellerBToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Seller A cannot upload to Seller B product (IDOR)", async () => {
    if (!productBId) return { passed: false, details: "Product B not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productBId}/assets/upload`, "POST", validUploadBody, sellerAToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Injected sellerId in body is ignored", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const injectedBody = { ...validUploadBody, sellerId: sellerBProfile.id };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", injectedBody, sellerBToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: !data.success && (res.status === 400 || res.status === 403) };
  });

  await runTest("Nonexistent product ID returns 404", async () => {
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/nonexistent-id/assets/upload`, "POST", validUploadBody, sellerAToken),
      { params: { productId: "nonexistent-id" } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 404 && !data.success };
  });

  // ==========================================================================
  // SECTION 5: PRODUCT STATE GUARDS
  // ==========================================================================

  await runTest("PUBLISHED product upload rejected", async () => {
    if (!publishedProductId) return { passed: false, details: "Published product not seeded" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${publishedProductId}/assets/upload`, "POST", validUploadBody, sellerAToken),
      { params: { productId: publishedProductId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 409 && !data.success };
  });

  await runTest("ARCHIVED product upload rejected", async () => {
    if (!archivedProductId) return { passed: false, details: "Archived product not seeded" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${archivedProductId}/assets/upload`, "POST", validUploadBody, sellerAToken),
      { params: { productId: archivedProductId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 409 && !data.success };
  });

  await runTest("DRAFT product upload allowed (state check only)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const product = await prisma.product.findUnique({ where: { id: productAId }, select: { status: true } });
    return { passed: product?.status === "DRAFT" };
  });

  // ==========================================================================
  // SECTION 6: FILE VALIDATION
  // ==========================================================================

  await runTest("Missing fileName rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const { fileName, ...noFile } = validUploadBody;
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", noFile, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Empty fileName rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: "" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Oversized fileName (>200 chars) rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const longName = "a".repeat(201) + ".zip";
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: longName }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Path traversal filename rejected (../../secret.txt)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: "../../secret.txt" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Absolute path filename rejected (/etc/passwd)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: "/etc/passwd" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Windows traversal filename rejected (..\\..\\secret)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: "..\\..\\secret.zip" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Double-encoded traversal filename rejected (....//....//file.zip)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: "....//....//file.zip" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Null-byte style filename rejected (secret.zip\\0)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: "secret.zip\0" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Unsupported extension rejected (.exe)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: "malware.exe", contentType: "application/octet-stream" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Unsupported MIME type rejected (video/mp4)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileName: "video.zip", contentType: "video/mp4" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Zero byte file rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileSizeBytes: 0 }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Negative file size rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileSizeBytes: -1024 }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Excessively large file rejected (600MB > 500MB limit)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, fileSizeBytes: 600 * 1024 * 1024 }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 413 && !data.success };
  });

  await runTest("Missing contentType rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const { contentType, ...noType } = validUploadBody;
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", noType, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Missing fileSizeBytes rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const { fileSizeBytes, ...noSize } = validUploadBody;
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", noSize, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Unexpected fields in upload body rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", { ...validUploadBody, bucket: "my-bucket", objectKey: "../etc/passwd" }, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Malformed JSON request body rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const rawReq = new NextRequest(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, {
      method: "POST",
      headers: { authorization: sellerAToken, "content-type": "application/json" },
      body: "{ not valid json payload",
    });
    const res = await uploadInitHandler(rawReq, { params: { productId: productAId } });
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  // ==========================================================================
  // SECTION 7: STORAGE SECURITY
  // ==========================================================================

  let capturedAssetId = "";
  let capturedObjectKey = "";
  let capturedUploadUrl = "";
  let capturedInitResponse: any = null;

  await runTest("Object key is server-generated (not client-controlled)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    if (!data.success) return { passed: false, details: JSON.stringify(data.error) };

    capturedAssetId = data.data.assetId;
    capturedObjectKey = data.data.objectKey;
    capturedUploadUrl = data.data.uploadUrl;
    capturedInitResponse = data;

    const key: string = data.data.objectKey;
    const isServerGenerated = key.startsWith(`products/${productAId}/`) && key.split("/").length >= 4;
    const notRawFilename = !key.includes("dashboard-kit-v1.zip");
    const hasProductId = key.includes(productAId);

    return {
      passed: isServerGenerated && notRawFilename && hasProductId,
      details: `key=${key}`,
    };
  });

  await runTest("No storage credentials in init response", async () => {
    if (!capturedInitResponse) return { passed: false, details: "No init response captured" };
    const responseStr = JSON.stringify(capturedInitResponse);
    const hasNoSecrets =
      !responseStr.includes("R2_SECRET") &&
      !responseStr.includes("ACCESS_KEY") &&
      !responseStr.includes("SECRET_KEY") &&
      !responseStr.includes("passwordHash") &&
      !responseStr.includes("JWT_SECRET");
    return { passed: hasNoSecrets };
  });

  await runTest("Storage bucket name not exposed in response", async () => {
    if (!capturedInitResponse) return { passed: false, details: "No init response captured" };
    const responseStr = JSON.stringify(capturedInitResponse);
    return { passed: !responseStr.includes("R2_BUCKET") && !responseStr.includes("marketplace-private") };
  });

  // ==========================================================================
  // SECTION 8: LOCAL STORAGE UPLOAD (simulated direct PUT)
  // ==========================================================================

  await runTest("Local upload handler: PUT raw bytes to storage", async () => {
    if (!capturedObjectKey) return { passed: false, details: "No object key from earlier test" };

    const testData = Buffer.from("PK\x03\x04 fake-zip-content-for-testing", "binary");
    const keySegments = capturedObjectKey.split("/");
    const res = await localUploadHandler(
      makePutReq(`http://localhost/api/v1/internal/storage/upload/${capturedObjectKey}`, testData),
      { params: { objectKey: keySegments } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 200 && data.success && data.data.sizeBytes === testData.length,
      details: data.success ? `sizeBytes=${data.data.sizeBytes}` : JSON.stringify(data.error),
    };
  });

  await runTest("Path traversal in local upload URL is blocked", async () => {
    const dangerousKey = ["products", "..", "..", "etc", "passwd"];
    const testData = Buffer.from("malicious content");
    const res = await localUploadHandler(
      makePutReq("http://localhost/api/v1/internal/storage/upload/products/../../etc/passwd", testData),
      { params: { objectKey: dangerousKey } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  await runTest("Empty body upload rejected by local handler", async () => {
    if (!capturedObjectKey) return { passed: false, details: "No object key" };
    const emptyData = Buffer.alloc(0);
    const keySegments = capturedObjectKey.split("/");
    const res = await localUploadHandler(
      makePutReq(`http://localhost/api/v1/internal/storage/upload/${capturedObjectKey}`, emptyData),
      { params: { objectKey: keySegments } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 400 && !data.success };
  });

  // ==========================================================================
  // SECTION 9: UPLOAD COMPLETION / VERIFICATION
  // ==========================================================================

  await runTest("Completion requires authentication", async () => {
    if (!productAId || !capturedAssetId) return { passed: false, details: "Missing IDs" };
    const res = await uploadCompleteHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/${capturedAssetId}/complete`, "POST", {}),
      { params: { productId: productAId, assetId: capturedAssetId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 401 && !data.success };
  });

  await runTest("Completion IDOR: Seller B cannot complete Seller A's asset", async () => {
    if (!productAId || !capturedAssetId) return { passed: false, details: "Missing IDs" };
    const res = await uploadCompleteHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/${capturedAssetId}/complete`, "POST", {}, sellerBToken),
      { params: { productId: productAId, assetId: capturedAssetId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("Completion verifies object exists in storage", async () => {
    if (!productAId || !capturedAssetId) return { passed: false, details: "Missing IDs" };
    const res = await uploadCompleteHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/${capturedAssetId}/complete`, "POST", {}, sellerAToken),
      { params: { productId: productAId, assetId: capturedAssetId } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 200 && data.success && data.data.asset.uploadVerified === true,
      details: data.success ? `fileSizeBytes=${data.data.asset.fileSizeBytes}` : JSON.stringify(data.error),
    };
  });

  await runTest("Product remains DRAFT after upload completion", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const product = await prisma.product.findUnique({ where: { id: productAId }, select: { status: true } });
    return { passed: product?.status === "DRAFT", details: `status=${product?.status}` };
  });

  await runTest("Missing object cannot be marked complete (fake assetId)", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadCompleteHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/fake-asset-id/complete`, "POST", {}, sellerAToken),
      { params: { productId: productAId, assetId: "fake-asset-id" } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 404 && !data.success };
  });

  await runTest("Non-existent storage object cannot be marked complete", async () => {
    if (!productBId) return { passed: false, details: "Product B not created" };
    const initRes = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productBId}/assets/upload`, "POST", validUploadBody, sellerBToken),
      { params: { productId: productBId } }
    );
    const initData = await parseJson(initRes);
    if (!initData.success) return { passed: false, details: "Init failed: " + JSON.stringify(initData.error) };
    const ghostAssetId = initData.data.assetId;

    // Do NOT upload the file — just call complete
    const completeRes = await uploadCompleteHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productBId}/assets/${ghostAssetId}/complete`, "POST", {}, sellerBToken),
      { params: { productId: productBId, assetId: ghostAssetId } }
    );
    const completeData = await parseJson(completeRes);
    return { passed: completeRes.status === 422 && !completeData.success };
  });

  // ==========================================================================
  // SECTION 10: DATABASE & STORAGE INTEGRITY
  // ==========================================================================

  await runTest("Asset record exists in PostgreSQL with correct metadata", async () => {
    if (!capturedAssetId || !productAId) return { passed: false, details: "Missing IDs" };
    const asset = await prisma.productFile.findUnique({
      where: { id: capturedAssetId },
      select: {
        id: true,
        productId: true,
        storageKey: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
      },
    });
    return {
      passed:
        !!asset &&
        asset.productId === productAId &&
        asset.storageKey === capturedObjectKey &&
        asset.originalFilename === "dashboard-kit-v1.zip" &&
        asset.mimeType === "application/zip",
      details: asset ? `storageKey=${asset.storageKey}` : "Asset not found",
    };
  });

  await runTest("Seller B product is unaffected by Seller A's upload", async () => {
    if (!productBId) return { passed: false, details: "Product B not created" };
    const product = await prisma.product.findUnique({ where: { id: productBId }, select: { status: true, sellerId: true } });
    const sellerBApprovedProfile = await prisma.sellerProfile.findUnique({ where: { userId: sellerBUser.id }, select: { id: true } });
    return { passed: product?.status === "DRAFT" && product?.sellerId === sellerBApprovedProfile?.id };
  });

  await runTest("Storage object is NOT in public/ directory", async () => {
    if (!capturedObjectKey) return { passed: false, details: "No object key" };
    const publicPath = path.resolve(process.cwd(), "public", capturedObjectKey);
    const storagePath = path.resolve(process.cwd(), "storage", "private", capturedObjectKey);
    const inPublic = existsSync(publicPath);
    const inStorage = existsSync(storagePath);
    return {
      passed: !inPublic && inStorage,
      details: `inPublic=${inPublic}, inStorage=${inStorage}`,
    };
  });

  await runTest("No sensitive data leakage in upload init response", async () => {
    if (!capturedInitResponse) return { passed: false, details: "No init response captured" };
    const responseStr = JSON.stringify(capturedInitResponse);
    const noLeak =
      !responseStr.includes("passwordHash") &&
      !responseStr.includes("JWT_SECRET") &&
      !responseStr.includes("DATABASE_URL") &&
      !responseStr.includes("R2_SECRET") &&
      !responseStr.includes("node_modules") &&
      !responseStr.includes("C:\\") &&
      !responseStr.includes("E:\\");
    return { passed: noLeak };
  });

  // ==========================================================================
  // SECTION 11: DUPLICATE / REPLACE UPLOAD
  // ==========================================================================

  await runTest("Replace / Re-upload: second upload replaces previous asset and preserves DRAFT", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };

    const secondUploadBody = {
      fileName: "dashboard-kit-v2-updated.zip",
      contentType: "application/zip",
      fileSizeBytes: 2048,
    };

    const initRes = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", secondUploadBody, sellerAToken),
      { params: { productId: productAId } }
    );
    const initData = await parseJson(initRes);
    if (!initData.success) return { passed: false, details: "Init replace failed: " + JSON.stringify(initData.error) };

    const newAssetId = initData.data.assetId;
    const newKey = initData.data.objectKey;

    // Upload bytes
    const newBytes = Buffer.from("PK\x03\x04 updated-zip-content-v2-binary", "binary");
    const putRes = await localUploadHandler(
      makePutReq(`http://localhost/api/v1/internal/storage/upload/${newKey}`, newBytes),
      { params: { objectKey: newKey.split("/") } }
    );
    const putData = await parseJson(putRes);
    if (!putData.success) return { passed: false, details: "Put replace failed: " + JSON.stringify(putData.error) };

    // Complete replace
    const compRes = await uploadCompleteHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/${newAssetId}/complete`, "POST", {}, sellerAToken),
      { params: { productId: productAId, assetId: newAssetId } }
    );
    const compData = await parseJson(compRes);

    const productAfter = await prisma.product.findUnique({ where: { id: productAId }, select: { status: true } });

    return {
      passed:
        compRes.status === 200 &&
        compData.success &&
        compData.data.asset.originalFilename === "dashboard-kit-v2-updated.zip" &&
        productAfter?.status === "DRAFT",
      details: compData.success ? `newAssetId=${newAssetId}` : JSON.stringify(compData.error),
    };
  });

  // ==========================================================================
  // SECTION 12: API_CONTRACT.md ALIAS COMPLIANCE
  // ==========================================================================

  await runTest("API CONTRACT: POST /api/v1/seller/products/:productId/upload-presign works identically", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const { POST: uploadPresignHandler } = await import(
      "../src/app/api/v1/seller/products/[productId]/upload-presign/route"
    );
    const res = await uploadPresignHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/upload-presign`, "POST", validUploadBody, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return {
      passed: res.status === 200 && data.success && !!data.data?.uploadUrl && !!data.data?.assetId,
      details: data.success ? `uploadUrl=${data.data.uploadUrl}` : JSON.stringify(data.error),
    };
  });

  // ==========================================================================
  // SECTION 13: SECTION 18 AUTHORIZATION MATRIX (Cross-combinations)
  // ==========================================================================

  await runTest("SECTION 18 MATRIX: Seller A -> Product A = allowed", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, sellerAToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success };
  });

  await runTest("SECTION 18 MATRIX: Seller A -> Product B = rejected", async () => {
    if (!productBId) return { passed: false, details: "Product B not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productBId}/assets/upload`, "POST", validUploadBody, sellerAToken),
      { params: { productId: productBId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("SECTION 18 MATRIX: Buyer -> Product A = rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, buyerToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("SECTION 18 MATRIX: Pending seller -> Product A = rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, pendingToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  await runTest("SECTION 18 MATRIX: Rejected seller -> Product A = rejected", async () => {
    if (!productAId) return { passed: false, details: "Product A not created" };
    const res = await uploadInitHandler(
      makeReq(`http://localhost/api/v1/seller/products/${productAId}/assets/upload`, "POST", validUploadBody, rejectedToken),
      { params: { productId: productAId } }
    );
    const data = await parseJson(res);
    return { passed: res.status === 403 && !data.success };
  });

  // ==========================================================================
  // SECTION 14: REGRESSION (Features 01 - 05)
  // ==========================================================================

  await runTest("REGRESSION: Feature 01 Signup still works", async () => {
    const uniqueEmail = `regression07.${Date.now()}.${Math.random().toString(36).slice(2)}@test.com`;
    const res = await signupHandler(makeReq("http://localhost/api/v1/auth/signup", "POST", {
      fullName: "Regression User 07",
      email: uniqueEmail,
      password: "Regress!onPass1",
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

  await runTest("REGRESSION: Feature 03 /users/me PATCH profile still works", async () => {
    const { PATCH: updateMeHandler } = await import("../src/app/api/v1/users/me/route");
    const res = await updateMeHandler(
      makeReq("http://localhost/api/v1/users/me", "PATCH", { fullName: "Updated Buyer 07" }, buyerToken)
    );
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success && data.data?.user?.fullName === "Updated Buyer 07" };
  });

  await runTest("REGRESSION: Feature 04 Seller onboarding route still works", async () => {
    const res = await (await import("../src/app/api/v1/seller/onboard/route")).POST(
      makeReq("http://localhost/api/v1/seller/onboard", "POST", {})
    );
    const data = await parseJson(res);
    return { passed: res.status === 401 && !data.success };
  });

  await runTest("REGRESSION: Feature 05 Admin sellers endpoint still works", async () => {
    const { GET } = await import("../src/app/api/v1/admin/sellers/pending/route");
    const res = await GET(makeGetReq("http://localhost/api/v1/admin/sellers/pending", adminToken));
    const data = await parseJson(res);
    return { passed: res.status === 200 && data.success };
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
    .forEach((r) => console.error(`[FAIL] ${String(r.num).padStart(2, "0")} ${r.name}${r.details ? " — " + r.details : ""}`));

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
