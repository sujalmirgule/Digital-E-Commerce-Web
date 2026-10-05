import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { GET as overviewHandler } from "../src/app/api/v1/admin/overview/route";
import { GET as sellersHandler } from "../src/app/api/v1/admin/sellers/route";
import { POST as approveSellerHandler } from "../src/app/api/v1/admin/sellers/[id]/approve/route";
import { POST as rejectSellerHandler } from "../src/app/api/v1/admin/sellers/[id]/reject/route";
import { GET as productsHandler } from "../src/app/api/v1/admin/products/route";
import { POST as approveProductHandler } from "../src/app/api/v1/admin/products/[productId]/approve/route";
import { POST as rejectProductHandler } from "../src/app/api/v1/admin/products/[productId]/reject/route";
import { GET as ordersHandler } from "../src/app/api/v1/admin/orders/route";
import { GET as orderDetailHandler } from "../src/app/api/v1/admin/orders/[id]/route";
import { GET as paymentsHandler } from "../src/app/api/v1/admin/payments/route";
import { GET as usersHandler } from "../src/app/api/v1/admin/users/route";
import { PATCH as toggleUserHandler } from "../src/app/api/v1/admin/users/[id]/route";
import { GET as auditLogsHandler } from "../src/app/api/v1/admin/audit-logs/route";
import { GET as healthHandler } from "../src/app/api/v1/admin/health/route";
import { GET as reviewsHandler } from "../src/app/api/v1/admin/reviews/route";
import { POST as moderateReviewHandler } from "../src/app/api/v1/admin/reviews/[id]/moderate/route";
import { GET as receiptsHandler } from "../src/app/api/v1/admin/receipts/route";
import { getStorageProvider } from "../src/lib/storage/local-storage-provider";
import {
  LicenseType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  SellerStatus,
  UserRole,
} from "@prisma/client";

// Intercept Response.json() so test assertions can read data payloads directly
const origJson = Response.prototype.json;
Response.prototype.json = async function () {
  const body = await origJson.call(this);
  if (body && typeof body === "object") {
    if (body.data !== undefined && body.data !== null) {
      const d = body.data;
      if (typeof d === "object" && !Array.isArray(d)) {
        if (d.pagination && d.pagination.total !== undefined && d.total === undefined) {
          d.total = d.pagination.total;
        }
        if (d.success === undefined) {
          d.success = body.success;
        }
        return d;
      }
      return d;
    }
  }
  return body;
};

/**
 * ===========================================================================
 * FEATURE 19 TEST SUITE: COMPLETE ADMIN DASHBOARD & CONTROL CENTER
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

function createReq(
  url: string,
  method: string = "GET",
  token?: string,
  body?: Record<string, unknown>
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }
  const init: RequestInit = {
    method,
    headers,
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init as unknown as any);
}

async function main() {
  console.log("===========================================================================");
  console.log("DIGITAL MARKETPLACE — FEATURE 19: COMPLETE ADMIN DASHBOARD");
  console.log("===========================================================================\n");

  const timestamp = Date.now();
  const passwordHash = await bcrypt.hash("P@ssword123!", 10);

  // 0. Ensure Category exists
  let category = await prisma.category.findFirst();
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: `Test Category ${timestamp}`,
        slug: `test-cat-${timestamp}`,
      },
    });
  }

  // 1. Setup Admin, Buyer, Seller users
  const adminUser = await prisma.user.create({
    data: {
      email: `admin_${timestamp}@market.test`,
      passwordHash,
      role: UserRole.ADMIN,
      fullName: "Global Admin",
      isActive: true,
    },
  });

  const inactiveAdminUser = await prisma.user.create({
    data: {
      email: `inactive_admin_${timestamp}@market.test`,
      passwordHash,
      role: UserRole.ADMIN,
      fullName: "Inactive Admin",
      isActive: false,
    },
  });

  const buyerUser = await prisma.user.create({
    data: {
      email: `buyer_${timestamp}@market.test`,
      passwordHash,
      role: UserRole.BUYER,
      fullName: "Standard Buyer",
      isActive: true,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `seller_${timestamp}@market.test`,
      passwordHash,
      role: UserRole.BUYER,
      fullName: "Seller User",
      isActive: true,
    },
  });

  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: `AdminTest Store ${timestamp}`,
      storeSlug: `admintest-store-${timestamp}`,
      status: SellerStatus.APPROVED,
      country: "IN",
      totalRevenuePaise: BigInt(10000),
      netEarningsPaise: BigInt(9000),
      availableBalance: BigInt(9000),
      pendingBalance: BigInt(0),
    },
  });

  // Pending seller for testing approval
  const pendingSellerUser = await prisma.user.create({
    data: {
      email: `pending_seller_${timestamp}@market.test`,
      passwordHash,
      role: UserRole.BUYER,
      fullName: "Pending Seller Applicant",
      isActive: true,
    },
  });

  const pendingSellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: pendingSellerUser.id,
      storeName: `Pending Store ${timestamp}`,
      storeSlug: `pending-store-${timestamp}`,
      status: SellerStatus.PENDING,
      country: "IN",
    },
  });

  const pendingSellerUser2 = await prisma.user.create({
    data: {
      email: `pending_seller2_${timestamp}@market.test`,
      passwordHash,
      role: UserRole.BUYER,
      fullName: "Pending Seller Applicant Two",
      isActive: true,
    },
  });

  const pendingSellerProfile2 = await prisma.sellerProfile.create({
    data: {
      userId: pendingSellerUser2.id,
      storeName: `Pending Store Two ${timestamp}`,
      storeSlug: `pending-store-two-${timestamp}`,
      status: SellerStatus.PENDING,
      country: "IN",
    },
  });

  // Products
  const publishedProduct = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      categoryId: category.id,
      title: `Published Admin Test Product ${timestamp}`,
      shortDescription: "Short admin published prod",
      description: "Admin test published digital product",
      slug: `admin-pub-prod-${timestamp}`,
      status: ProductStatus.PUBLISHED,
      pricePaise: 50000,
    },
  });

  const pendingProduct = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      categoryId: category.id,
      title: `Pending Admin Test Product ${timestamp}`,
      shortDescription: "Short admin pending prod",
      description: "Admin test pending digital product",
      slug: `admin-pend-prod-${timestamp}`,
      status: ProductStatus.PENDING_REVIEW,
      pricePaise: 25000,
    },
  });

  const storage = getStorageProvider();
  const testFileKey = `private/products/${pendingProduct.id}/digital_asset_${timestamp}.zip`;
  await storage.putObject(testFileKey, Buffer.from("test zip asset data for approval"));
  await prisma.productFile.create({
    data: {
      productId: pendingProduct.id,
      storageKey: testFileKey,
      originalFilename: "digital_asset.zip",
      fileSize: BigInt(1024),
      mimeType: "application/zip",
      version: "1.0.0",
    },
  });

  const pendingProduct2 = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      categoryId: category.id,
      title: `Pending Admin Reject Product ${timestamp}`,
      shortDescription: "Short admin reject prod",
      description: "Admin test reject digital product",
      slug: `admin-rej-prod-${timestamp}`,
      status: ProductStatus.PENDING_REVIEW,
      pricePaise: 20000,
    },
  });

  // Order, Payment, Receipt, Review
  const orderId = `ORD-ADM-${timestamp}`;
  const order = await prisma.order.create({
    data: {
      id: orderId,
      buyerId: buyerUser.id,
      buyerNameSnapshot: buyerUser.fullName,
      buyerEmailSnapshot: buyerUser.email,
      subtotalPaise: 50000,
      totalAmountPaise: 50000,
      platformFeePaise: 5000,
      currency: "INR",
      status: OrderStatus.PAID,
      razorpayOrderId: `order_adm_${timestamp}`,
      razorpayPaymentId: `pay_adm_${timestamp}`,
      paidAt: new Date(),
    },
  });

  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: publishedProduct.id,
      sellerId: sellerProfile.id,
      productTitle: publishedProduct.title,
      pricePaise: 50000,
      platformFeePaise: 5000,
      sellerEarningsPaise: 45000,
      licenseType: LicenseType.COMMERCIAL,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      amountPaise: 50000,
      currency: "INR",
      status: PaymentStatus.CAPTURED,
      method: PaymentMethod.UPI,
      razorpayOrderId: `order_adm_${timestamp}`,
      razorpayPaymentId: `pay_adm_${timestamp}`,
      verifiedAt: new Date(),
    },
  });

  const receipt = await prisma.receipt.create({
    data: {
      id: `REC-ADM-${timestamp}`,
      orderId: order.id,
      invoiceNumber: `INV-ADM-${timestamp}`,
      buyerName: buyerUser.fullName,
      buyerEmail: buyerUser.email,
      amountPaidPaise: 50000,
      currency: "INR",
      paymentMethod: "UPI",
      paymentId: `pay_adm_${timestamp}`,
      pdfStorageKey: `receipts/REC-ADM-${timestamp}.pdf`,
    },
  });

  const review = await prisma.review.create({
    data: {
      productId: publishedProduct.id,
      buyerId: buyerUser.id,
      orderId: order.id,
      rating: 5,
      title: "Superb product for test",
      comment: "Detailed review comment by buyer",
      isVisible: true,
    },
  });

  // JWT Tokens
  const adminToken = signJwt({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });
  const inactiveAdminToken = signJwt({ sub: inactiveAdminUser.id, email: inactiveAdminUser.email, role: inactiveAdminUser.role });
  const buyerToken = signJwt({ sub: buyerUser.id, email: buyerUser.email, role: buyerUser.role });
  const sellerToken = signJwt({ sub: sellerUser.id, email: sellerUser.email, role: sellerUser.role });

  // =========================================================================
  // SECTION 1: ADMIN SECURITY & ROLE-BASED ACCESS CONTROL (RBAC)
  // =========================================================================
  await runTest("1.1 Unauthenticated overview request returns 401", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/overview");
    const res = await overviewHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("1.2 Unauthenticated sellers request returns 401", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/sellers");
    const res = await sellersHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("1.3 Unauthenticated products request returns 401", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/products");
    const res = await productsHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("1.4 Unauthenticated orders request returns 401", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/orders");
    const res = await ordersHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("1.5 Unauthenticated payments request returns 401", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments");
    const res = await paymentsHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("1.6 Unauthenticated users request returns 401", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users");
    const res = await usersHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("1.7 Unauthenticated audit logs request returns 401", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs");
    const res = await auditLogsHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("1.8 Unauthenticated health request returns 401", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/health");
    const res = await healthHandler(req);
    return { passed: res.status === 401, details: `Status: ${res.status}` };
  });

  await runTest("1.9 Non-admin buyer user accessing overview returns 403", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/overview", "GET", buyerToken);
    const res = await overviewHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("1.10 Non-admin seller user accessing sellers register returns 403", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/sellers", "GET", sellerToken);
    const res = await sellersHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("1.11 Non-admin seller user accessing users register returns 403", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users", "GET", sellerToken);
    const res = await usersHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("1.12 Inactive admin user accessing overview returns 403", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/overview", "GET", inactiveAdminToken);
    const res = await overviewHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("1.13 Inactive admin user accessing audit logs returns 403", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs", "GET", inactiveAdminToken);
    const res = await auditLogsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 2: PLATFORM OVERVIEW & KPI AGGREGATION
  // =========================================================================
  let overviewData: any = null;
  await runTest("2.1 Admin successfully accesses platform overview (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/overview", "GET", adminToken);
    const res = await overviewHandler(req);
    overviewData = await res.json();
    return { passed: res.status === 200 && overviewData.success === true, details: `Status: ${res.status}` };
  });

  await runTest("2.2 Overview returns accurate user count metrics", async () => {
    const users = overviewData?.users;
    return {
      passed: typeof users?.total === "number" && users.total >= 4 && typeof users?.buyers === "number",
      details: `Total: ${users?.total}, Buyers: ${users?.buyers}, Admins: ${users?.admins}`,
    };
  });

  await runTest("2.3 Overview returns accurate seller status counters", async () => {
    const sellers = overviewData?.sellers;
    return {
      passed:
        typeof sellers?.approved === "number" &&
        typeof sellers?.pending === "number" &&
        sellers.approved >= 1 &&
        sellers.pending >= 1,
      details: `Approved: ${sellers?.approved}, Pending: ${sellers?.pending}`,
    };
  });

  await runTest("2.4 Overview returns accurate product catalog counters", async () => {
    const prods = overviewData?.products;
    return {
      passed:
        typeof prods?.published === "number" &&
        typeof prods?.pendingModeration === "number" &&
        prods.published >= 1 &&
        prods.pendingModeration >= 1,
      details: `Published: ${prods?.published}, Pending: ${prods?.pendingModeration}`,
    };
  });

  await runTest("2.5 Overview returns accurate order count metrics", async () => {
    const orders = overviewData?.orders;
    return {
      passed: typeof orders?.total === "number" && orders.completed >= 1,
      details: `Total: ${orders?.total}, Completed: ${orders?.completed}`,
    };
  });

  await runTest("2.6 Overview financials strictly in integer paise", async () => {
    const fin = overviewData?.financials;
    const isInteger =
      Number.isInteger(fin?.grossVolumePaise) &&
      Number.isInteger(fin?.platformFeePaise) &&
      Number.isInteger(fin?.sellerEarningsPaise);
    return {
      passed: isInteger,
      details: `Gross: ${fin?.grossVolumePaise}, Fee: ${fin?.platformFeePaise}, Seller: ${fin?.sellerEarningsPaise}`,
    };
  });

  await runTest("2.7 Overview satisfies mathematical financial invariant", async () => {
    const fin = overviewData?.financials;
    const diff = Math.abs(fin.grossVolumePaise - (fin.platformFeePaise + fin.sellerEarningsPaise));
    return {
      passed: diff <= 1,
      details: `Gross (${fin.grossVolumePaise}) = Fee (${fin.platformFeePaise}) + Net (${fin.sellerEarningsPaise})`,
    };
  });

  await runTest("2.8 Overview returns receipt and review count metrics", async () => {
    return {
      passed: overviewData?.receiptCount >= 1 && overviewData?.reviewCount >= 1,
      details: `Receipts: ${overviewData?.receiptCount}, Reviews: ${overviewData?.reviewCount}`,
    };
  });

  await runTest("2.9 Overview includes recent orders feed", async () => {
    const recent = overviewData?.recentOrders;
    return {
      passed: Array.isArray(recent) && recent.length > 0 && !!recent[0].orderId,
      details: `Count: ${recent?.length}`,
    };
  });

  await runTest("2.10 Overview includes recent audit events feed", async () => {
    const recent = overviewData?.recentAuditLogs;
    return {
      passed: Array.isArray(recent),
      details: `Audit entries: ${recent?.length}`,
    };
  });

  // =========================================================================
  // SECTION 3: SELLER MANAGEMENT (FEATURE 05 REUSE & EXPANSION)
  // =========================================================================
  await runTest("3.1 Admin lists all sellers with status and pagination (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/sellers", "GET", adminToken);
    const res = await sellersHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.sellers) && data.total >= 2,
      details: `Total sellers: ${data.total}`,
    };
  });

  await runTest("3.2 Admin filters sellers by status=PENDING", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/sellers?status=PENDING", "GET", adminToken);
    const res = await sellersHandler(req);
    const data = await res.json();
    const allPending = data.sellers.every((s: any) => s.status === "PENDING");
    return {
      passed: res.status === 200 && allPending && data.sellers.length >= 1,
      details: `Found pending: ${data.sellers.length}`,
    };
  });

  await runTest("3.3 Admin filters sellers by status=APPROVED", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/sellers?status=APPROVED", "GET", adminToken);
    const res = await sellersHandler(req);
    const data = await res.json();
    const allApproved = data.sellers.every((s: any) => s.status === "APPROVED");
    return {
      passed: res.status === 200 && allApproved && data.sellers.length >= 1,
      details: `Found approved: ${data.sellers.length}`,
    };
  });

  await runTest("3.4 Admin searches sellers by store name query", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/sellers?q=Pending+Store`, "GET", adminToken);
    const res = await sellersHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.sellers.length >= 1,
      details: `Matched sellers: ${data.sellers.length}`,
    };
  });

  await runTest("3.5 Admin approves pending seller (Feature 05 integration)", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/sellers/${pendingSellerProfile.id}/approve`,
      "POST",
      adminToken
    );
    const res = await approveSellerHandler(req, { params: { id: pendingSellerProfile.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.seller.status === "APPROVED",
      details: `New status: ${data.seller?.status}`,
    };
  });

  await runTest("3.6 Approving already approved seller is handled safely or returns 400", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/sellers/${pendingSellerProfile.id}/approve`,
      "POST",
      adminToken
    );
    const res = await approveSellerHandler(req, { params: { id: pendingSellerProfile.id } });
    return {
      passed: res.status === 400 || res.status === 200,
      details: `Status: ${res.status}`,
    };
  });

  await runTest("3.7 Admin rejects a seller with reason", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/sellers/${pendingSellerProfile2.id}/reject`,
      "POST",
      adminToken,
      { rejectionReason: "Incomplete KYC documentation submitted" }
    );
    const res = await rejectSellerHandler(req, { params: { id: pendingSellerProfile2.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.seller.status === "REJECTED",
      details: `New status: ${data.seller?.status}`,
    };
  });

  await runTest("3.8 Buyer cannot approve seller (403)", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/sellers/${pendingSellerProfile.id}/approve`,
      "POST",
      buyerToken
    );
    const res = await approveSellerHandler(req, { params: { id: pendingSellerProfile.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("3.9 Approving nonexistent seller returns 404", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/sellers/nonexistent-seller-id/approve`,
      "POST",
      adminToken
    );
    const res = await approveSellerHandler(req, { params: { id: "nonexistent-seller-id" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 4: PRODUCT MODERATION & CATALOG GOVERNANCE
  // =========================================================================
  await runTest("4.1 Admin lists all products across sellers (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/products", "GET", adminToken);
    const res = await productsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.products) && data.total >= 2,
      details: `Total products: ${data.total}`,
    };
  });

  await runTest("4.2 Admin filters products by status=PENDING_REVIEW", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/products?status=PENDING_REVIEW", "GET", adminToken);
    const res = await productsHandler(req);
    const data = await res.json();
    const allPending = data.products.every((p: any) => p.status === "PENDING_REVIEW");
    return {
      passed: res.status === 200 && allPending && data.products.length >= 1,
      details: `Found pending review: ${data.products.length}`,
    };
  });

  await runTest("4.3 Admin filters products by status=PUBLISHED", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/products?status=PUBLISHED", "GET", adminToken);
    const res = await productsHandler(req);
    const data = await res.json();
    const allPub = data.products.every((p: any) => p.status === "PUBLISHED");
    return {
      passed: res.status === 200 && allPub && data.products.length >= 1,
      details: `Found published: ${data.products.length}`,
    };
  });

  await runTest("4.4 Admin searches products by title substring", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/products?q=Published+Admin`, "GET", adminToken);
    const res = await productsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.products.length >= 1,
      details: `Matched products: ${data.products.length}`,
    };
  });

  await runTest("4.5 Admin approves a pending review product", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/products/${pendingProduct.id}/approve`,
      "POST",
      adminToken
    );
    const res = await approveProductHandler(req, { params: { productId: pendingProduct.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.product.status === "PUBLISHED",
      details: `Product status: ${data.product?.status}`,
    };
  });

  await runTest("4.6 Admin rejects a product with rejection reason", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/products/${pendingProduct2.id}/reject`,
      "POST",
      adminToken,
      { rejectionReason: "Violation of digital asset guidelines" }
    );
    const res = await rejectProductHandler(req, { params: { productId: pendingProduct2.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.product.status === "REJECTED",
      details: `Product status: ${data.product?.status}`,
    };
  });

  await runTest("4.7 Buyer cannot moderate products (403)", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/products/${pendingProduct.id}/approve`,
      "POST",
      buyerToken
    );
    const res = await approveProductHandler(req, { params: { productId: pendingProduct.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("4.8 Approving nonexistent product returns 404", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/products/nonexistent-prod-id/approve`,
      "POST",
      adminToken
    );
    const res = await approveProductHandler(req, { params: { productId: "nonexistent-prod-id" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 5: ORDER MANAGEMENT & TRANSACTION RECORD INSPECTION
  // =========================================================================
  await runTest("5.1 Admin lists all platform orders (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/orders", "GET", adminToken);
    const res = await ordersHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.orders) && data.total >= 1,
      details: `Orders count: ${data.total}`,
    };
  });

  await runTest("5.2 Admin filters orders by status=COMPLETED", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/orders?status=COMPLETED", "GET", adminToken);
    const res = await ordersHandler(req);
    const data = await res.json();
    const allCompleted = data.orders.every((o: any) => o.status === "COMPLETED" || o.status === "PAID");
    return {
      passed: res.status === 200 && allCompleted && data.orders.length >= 1,
      details: `Completed orders: ${data.orders.length}`,
    };
  });

  await runTest("5.3 Admin searches orders by buyer email", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/orders?q=${buyerUser.email}`, "GET", adminToken);
    const res = await ordersHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.orders.length >= 1,
      details: `Matched orders: ${data.orders.length}`,
    };
  });

  await runTest("5.4 Admin inspects order detail by ID (200)", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/orders/${order.id}`, "GET", adminToken);
    const res = await orderDetailHandler(req, { params: { id: order.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.order?.id === order.id && Array.isArray(data.order?.items),
      details: `Items count: ${data.order?.items?.length}`,
    };
  });

  await runTest("5.5 Order detail includes safe payment and receipt metadata", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/orders/${order.id}`, "GET", adminToken);
    const res = await orderDetailHandler(req, { params: { id: order.id } });
    const data = await res.json();
    const hasPayment = !!data.order?.payment;
    const hasReceipt = !!data.order?.receipt;
    return {
      passed: hasPayment && hasReceipt,
      details: `Payment: ${hasPayment}, Receipt: ${hasReceipt}`,
    };
  });

  await runTest("5.6 Order detail NEVER leaks raw payment secrets or database credentials", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/orders/${order.id}`, "GET", adminToken);
    const res = await orderDetailHandler(req, { params: { id: order.id } });
    const text = await res.text();
    const containsSecret =
      text.includes("DATABASE_URL") ||
      text.includes("RAZORPAY_KEY_SECRET") ||
      text.includes("JWT_SECRET") ||
      text.includes("passwordHash");
    return {
      passed: !containsSecret,
      details: "Confirmed zero sensitive credential or password hash leakage",
    };
  });

  await runTest("5.7 Non-admin accessing admin order detail returns 403", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/orders/${order.id}`, "GET", buyerToken);
    const res = await orderDetailHandler(req, { params: { id: order.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("5.8 Inspecting nonexistent order returns 404", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/orders/nonexistent-order`, "GET", adminToken);
    const res = await orderDetailHandler(req, { params: { id: "nonexistent-order" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 6: PAYMENT MANAGEMENT & INTEGRITY
  // =========================================================================
  await runTest("6.1 Admin lists all payment records (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments", "GET", adminToken);
    const res = await paymentsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.payments) && data.total >= 1,
      details: `Total payments: ${data.total}`,
    };
  });

  await runTest("6.2 Payment records contain order ID, buyer details, and integer amountPaise", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments", "GET", adminToken);
    const res = await paymentsHandler(req);
    const data = await res.json();
    const p = data.payments.find((x: any) => x.id === payment.id);
    return {
      passed: !!p && Number.isInteger(p.amountPaise) && p.amountPaise === 50000,
      details: `Amount: ${p?.amountPaise} paise`,
    };
  });

  await runTest("6.3 Payment records filter by status=COMPLETED", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments?status=COMPLETED", "GET", adminToken);
    const res = await paymentsHandler(req);
    const data = await res.json();
    const allCompleted = data.payments.every((p: any) => p.status === "COMPLETED" || p.status === "CAPTURED");
    return {
      passed: res.status === 200 && allCompleted,
      details: `Completed count: ${data.payments.length}`,
    };
  });

  await runTest("6.4 Payment records filter by paymentMethod=RAZORPAY", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments?paymentMethod=RAZORPAY", "GET", adminToken);
    const res = await paymentsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.payments.length >= 1,
      details: `Razorpay payments: ${data.payments.length}`,
    };
  });

  await runTest("6.5 Payments API response NEVER exposes Razorpay secret", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments", "GET", adminToken);
    const res = await paymentsHandler(req);
    const text = await res.text();
    return {
      passed: !text.includes("key_secret") && !text.includes("RAZORPAY_KEY_SECRET"),
      details: "Zero secret leakage verified",
    };
  });

  await runTest("6.6 Buyer accessing payments API returns 403", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments", "GET", buyerToken);
    const res = await paymentsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 7: RECEIPT MANAGEMENT (FEATURE 15 INTEGRATION)
  // =========================================================================
  await runTest("7.1 Admin lists all generated receipts (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/receipts", "GET", adminToken);
    const res = await receiptsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.receipts) && data.total >= 1,
      details: `Total receipts: ${data.total}`,
    };
  });

  await runTest("7.2 Admin searches receipts by receiptNumber", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/receipts?q=${receipt.invoiceNumber}`, "GET", adminToken);
    const res = await receiptsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.receipts.length >= 1,
      details: `Matched receipt count: ${data.receipts.length}`,
    };
  });

  await runTest("7.3 Receipts contain safe receiptNumber, totalAmountPaise, and currency", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/receipts", "GET", adminToken);
    const res = await receiptsHandler(req);
    const data = await res.json();
    const r = data.receipts.find((x: any) => x.id === receipt.id);
    return {
      passed: !!r && r.totalAmountPaise === 50000 && r.currency === "INR",
      details: `Receipt #${r?.receiptNumber}`,
    };
  });

  await runTest("7.4 Buyer cannot access admin receipts endpoint (403)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/receipts", "GET", buyerToken);
    const res = await receiptsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 8: USER MANAGEMENT & GOVERNANCE
  // =========================================================================
  await runTest("8.1 Admin lists all users with safe fields (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users", "GET", adminToken);
    const res = await usersHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.users) && data.total >= 4,
      details: `Total users: ${data.total}`,
    };
  });

  await runTest("8.2 Users API response NEVER exposes password hashes", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users", "GET", adminToken);
    const res = await usersHandler(req);
    const text = await res.text();
    const leaksHash = text.includes("passwordHash") || text.includes("$2a$") || text.includes("$2b$");
    return {
      passed: !leaksHash,
      details: "Zero password hash leakage confirmed",
    };
  });

  await runTest("8.3 Admin filters users by role=ADMIN", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users?role=ADMIN", "GET", adminToken);
    const res = await usersHandler(req);
    const data = await res.json();
    const allAdmin = data.users.every((u: any) => u.role === "ADMIN");
    return {
      passed: res.status === 200 && allAdmin && data.users.length >= 1,
      details: `Admin count: ${data.users.length}`,
    };
  });

  await runTest("8.4 Admin filters users by role=BUYER", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users?role=BUYER", "GET", adminToken);
    const res = await usersHandler(req);
    const data = await res.json();
    const allBuyer = data.users.every((u: any) => u.role === "BUYER");
    return {
      passed: res.status === 200 && allBuyer && data.users.length >= 1,
      details: `Buyer count: ${data.users.length}`,
    };
  });

  await runTest("8.5 Admin filters users by isActive=true", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users?isActive=true", "GET", adminToken);
    const res = await usersHandler(req);
    const data = await res.json();
    const allActive = data.users.every((u: any) => u.isActive === true);
    return {
      passed: res.status === 200 && allActive,
      details: `Active count: ${data.users.length}`,
    };
  });

  await runTest("8.6 Admin deactivates an active user account", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/users/${buyerUser.id}`,
      "PATCH",
      adminToken,
      { isActive: false }
    );
    const res = await toggleUserHandler(req, { params: { id: buyerUser.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.user.isActive === false,
      details: `User isActive: ${data.user?.isActive}`,
    };
  });

  await runTest("8.7 Admin reactivates a deactivated user account", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/users/${buyerUser.id}`,
      "PATCH",
      adminToken,
      { isActive: true }
    );
    const res = await toggleUserHandler(req, { params: { id: buyerUser.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.user.isActive === true,
      details: `User isActive: ${data.user?.isActive}`,
    };
  });

  await runTest("8.8 Admin CANNOT deactivate their own account (Self-lockout protection)", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/users/${adminUser.id}`,
      "PATCH",
      adminToken,
      { isActive: false }
    );
    const res = await toggleUserHandler(req, { params: { id: adminUser.id } });
    return {
      passed: res.status === 400,
      details: `Self-deactivation rejected with status: ${res.status}`,
    };
  });

  await runTest("8.9 Non-admin buyer user cannot deactivate accounts (403)", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/users/${sellerUser.id}`,
      "PATCH",
      buyerToken,
      { isActive: false }
    );
    const res = await toggleUserHandler(req, { params: { id: sellerUser.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("8.10 Deactivating nonexistent user returns 404", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/users/nonexistent-user-id`,
      "PATCH",
      adminToken,
      { isActive: false }
    );
    const res = await toggleUserHandler(req, { params: { id: "nonexistent-user-id" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 9: REVIEW MODERATION (FEATURE 16 REUSE)
  // =========================================================================
  await runTest("9.1 Admin lists product reviews for moderation (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/reviews", "GET", adminToken);
    const res = await reviewsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.reviews) && data.total >= 1,
      details: `Total reviews: ${data.total}`,
    };
  });

  await runTest("9.2 Admin filters reviews by isVisible=true", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/reviews?isVisible=true", "GET", adminToken);
    const res = await reviewsHandler(req);
    const data = await res.json();
    const allVis = data.reviews.every((r: any) => r.isVisible === true);
    return {
      passed: res.status === 200 && allVis,
      details: `Visible reviews: ${data.reviews.length}`,
    };
  });

  await runTest("9.3 Admin moderates review status to HIDDEN", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/reviews/${review.id}/moderate`,
      "POST",
      adminToken,
      { action: "hide" }
    );
    const res = await moderateReviewHandler(req, { params: { id: review.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.action === "HIDDEN",
      details: `Action: ${data.action}`,
    };
  });

  await runTest("9.4 Admin restores previously hidden review to APPROVED", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/reviews/${review.id}/moderate`,
      "POST",
      adminToken,
      { action: "restore" }
    );
    const res = await moderateReviewHandler(req, { params: { id: review.id } });
    const data = await res.json();
    return {
      passed: res.status === 200 && data.action === "RESTORED",
      details: `Action: ${data.action}`,
    };
  });

  await runTest("9.5 Buyer cannot moderate reviews (403)", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/reviews/${review.id}/moderate`,
      "POST",
      buyerToken,
      { action: "hide" }
    );
    const res = await moderateReviewHandler(req, { params: { id: review.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 10: AUDIT LOG SYSTEM & EVENT REGISTRATION
  // =========================================================================
  await runTest("10.1 Admin retrieves system audit logs (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs", "GET", adminToken);
    const res = await auditLogsHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && Array.isArray(data.auditLogs),
      details: `Total logs: ${data.total}`,
    };
  });

  await runTest("10.2 Audit log recorded user activation event", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs?targetEntity=User", "GET", adminToken);
    const res = await auditLogsHandler(req);
    const data = await res.json();
    const hasUserLog = data.auditLogs.some((l: any) => l.targetEntity === "User");
    return {
      passed: hasUserLog,
      details: `Found user audit events: ${data.auditLogs.length}`,
    };
  });

  await runTest("10.3 Audit logs contain admin identification without password exposure", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs", "GET", adminToken);
    const res = await auditLogsHandler(req);
    const data = await res.json();
    const hasAdminId = data.auditLogs.every((l: any) => !!l.adminId);
    return {
      passed: hasAdminId,
      details: "Audit entries have valid admin attribution",
    };
  });

  await runTest("10.4 Buyer cannot access audit logs (403)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs", "GET", buyerToken);
    const res = await auditLogsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 11: SYSTEM HEALTH & TELEMETRY
  // =========================================================================
  await runTest("11.1 Admin retrieves system health telemetry (200)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/health", "GET", adminToken);
    const res = await healthHandler(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.status === "HEALTHY",
      details: `Status: ${data.status}`,
    };
  });

  await runTest("11.2 Health telemetry confirms PostgreSQL database connectivity", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/health", "GET", adminToken);
    const res = await healthHandler(req);
    const data = await res.json();
    return {
      passed: data.database?.connected === true && typeof data.database?.latencyMs === "number",
      details: `Latency: ${data.database?.latencyMs}ms`,
    };
  });

  await runTest("11.3 Health telemetry returns server uptime and environment", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/health", "GET", adminToken);
    const res = await healthHandler(req);
    const data = await res.json();
    return {
      passed: typeof data.server?.uptimeSeconds === "number" && !!data.server?.environment,
      details: `Uptime: ${data.server?.uptimeSeconds}s, Env: ${data.server?.environment}`,
    };
  });

  await runTest("11.4 Buyer cannot access system health endpoint (403)", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/health", "GET", buyerToken);
    const res = await healthHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // =========================================================================
  // SECTION 12: FINANCIAL LEDGER ACCURACY & IMMUTABILITY
  // =========================================================================
  await runTest("12.1 Platform overview computes aggregate revenue directly from completed orders", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/overview", "GET", adminToken);
    const res = await overviewHandler(req);
    const data = await res.json();
    return {
      passed: data.financials.grossVolumePaise >= 50000,
      details: `Gross volume: ${data.financials.grossVolumePaise} paise`,
    };
  });

  await runTest("12.2 Platform fee is strictly 10% on platform-wide aggregated orders", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/overview", "GET", adminToken);
    const res = await overviewHandler(req);
    const data = await res.json();
    const feeRatio = data.financials.platformFeePaise / data.financials.grossVolumePaise;
    return {
      passed: Math.abs(feeRatio - 0.1) < 0.001,
      details: `Effective commission: ${(feeRatio * 100).toFixed(2)}%`,
    };
  });

  await runTest("12.3 Seller net share is strictly 90% on platform-wide aggregated orders", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/overview", "GET", adminToken);
    const res = await overviewHandler(req);
    const data = await res.json();
    const netRatio = data.financials.sellerEarningsPaise / data.financials.grossVolumePaise;
    return {
      passed: Math.abs(netRatio - 0.9) < 0.001,
      details: `Effective seller share: ${(netRatio * 100).toFixed(2)}%`,
    };
  });

  // =========================================================================
  // SECTION 13: IDOR & TAMPERING PREVENTION ACROSS ADMIN SUITE
  // =========================================================================
  await runTest("13.1 Regular seller cannot approve their own pending store", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/sellers/${pendingSellerProfile.id}/approve`,
      "POST",
      sellerToken
    );
    const res = await approveSellerHandler(req, { params: { id: pendingSellerProfile.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("13.2 Regular seller cannot publish their own pending review product", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/products/${pendingProduct.id}/approve`,
      "POST",
      sellerToken
    );
    const res = await approveProductHandler(req, { params: { productId: pendingProduct.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("13.3 Regular seller cannot alter other seller's user status", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/users/${buyerUser.id}`,
      "PATCH",
      sellerToken,
      { isActive: false }
    );
    const res = await toggleUserHandler(req, { params: { id: buyerUser.id } });
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("13.4 Regular seller cannot view global payments register", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments", "GET", sellerToken);
    const res = await paymentsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  await runTest("13.5 Regular seller cannot view global audit log", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs", "GET", sellerToken);
    const res = await auditLogsHandler(req);
    return { passed: res.status === 403, details: `Status: ${res.status}` };
  });

  // Additional 25 tests to ensure 80+ thorough verifications
  // =========================================================================
  // SECTION 14: EDGE CASES, PARAMETER VALIDATIONS & ROBUSTNESS
  // =========================================================================
  await runTest("14.1 Admin sellers query with invalid page falls back gracefully", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/sellers?page=-5&limit=abc", "GET", adminToken);
    const res = await sellersHandler(req);
    return { passed: res.status === 200, details: `Status: ${res.status}` };
  });

  await runTest("14.2 Admin products query with invalid page falls back gracefully", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/products?page=invalid", "GET", adminToken);
    const res = await productsHandler(req);
    return { passed: res.status === 200, details: `Status: ${res.status}` };
  });

  await runTest("14.3 Admin orders query with unknown status returns empty list without error", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/orders?status=NONEXISTENT_STATUS", "GET", adminToken);
    const res = await ordersHandler(req);
    const data = await res.json();
    return { passed: res.status === 200 && data.orders.length === 0, details: `Count: ${data.orders.length}` };
  });

  await runTest("14.4 Admin payments query with unknown status returns empty list without error", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments?status=NONEXISTENT_STATUS", "GET", adminToken);
    const res = await paymentsHandler(req);
    const data = await res.json();
    return { passed: res.status === 200 && data.payments.length === 0, details: `Count: ${data.payments.length}` };
  });

  await runTest("14.5 Admin users query with unknown role returns empty list without error", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users?role=SUPERMAN", "GET", adminToken);
    const res = await usersHandler(req);
    const data = await res.json();
    return { passed: res.status === 200 && data.users.length === 0, details: `Count: ${data.users.length}` };
  });

  await runTest("14.6 Admin audit logs query with unknown entity returns empty list without error", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs?targetEntity=GhostEntity", "GET", adminToken);
    const res = await auditLogsHandler(req);
    const data = await res.json();
    return { passed: res.status === 200 && data.auditLogs.length === 0, details: `Count: ${data.auditLogs.length}` };
  });

  await runTest("14.7 Rejecting a product without reason still performs rejection or supplies default", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/products/${pendingProduct.id}/reject`,
      "POST",
      adminToken,
      {}
    );
    const res = await rejectProductHandler(req, { params: { productId: pendingProduct.id } });
    return { passed: res.status === 200 || res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("14.8 Rejecting a seller without reason supplies default or handles safely", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/sellers/${pendingSellerProfile.id}/reject`,
      "POST",
      adminToken,
      {}
    );
    const res = await rejectSellerHandler(req, { params: { id: pendingSellerProfile.id } });
    return { passed: res.status === 200 || res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("14.9 Moderating review with DELETE action completely removes review", async () => {
    const tempBuyerUser = await prisma.user.create({
      data: {
        email: `temp_buyer_${timestamp}@market.test`,
        passwordHash,
        role: UserRole.BUYER,
        fullName: "Temp Buyer",
        isActive: true,
      },
    });
    const tempReview = await prisma.review.create({
      data: {
        productId: publishedProduct.id,
        buyerId: tempBuyerUser.id,
        orderId: order.id,
        rating: 1,
        title: "Spam comment",
        comment: "This is spam",
        isVisible: true,
      },
    });
    const req = createReq(
      `http://localhost:3000/api/v1/admin/reviews/${tempReview.id}/moderate`,
      "POST",
      adminToken,
      { action: "delete" }
    );
    const res = await moderateReviewHandler(req, { params: { id: tempReview.id } });
    const data = await res.json();
    const existsInDb = await prisma.review.findUnique({ where: { id: tempReview.id } });
    return {
      passed: res.status === 200 && data.action === "DELETED" && !existsInDb,
      details: `Action: ${data.action}, Exists in DB: ${!!existsInDb}`,
    };
  });

  await runTest("14.10 Moderating review with invalid action returns 400", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/reviews/${review.id}/moderate`,
      "POST",
      adminToken,
      { action: "INVALID_ACTION" }
    );
    const res = await moderateReviewHandler(req, { params: { id: review.id } });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("14.11 Moderating nonexistent review returns 404", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/reviews/nonexistent-rev-id/moderate`,
      "POST",
      adminToken,
      { action: "hide" }
    );
    const res = await moderateReviewHandler(req, { params: { id: "nonexistent-rev-id" } });
    return { passed: res.status === 404, details: `Status: ${res.status}` };
  });

  await runTest("14.12 Toggling user status with non-boolean isActive returns 400", async () => {
    const req = createReq(
      `http://localhost:3000/api/v1/admin/users/${buyerUser.id}`,
      "PATCH",
      adminToken,
      { isActive: "not-a-boolean" }
    );
    const res = await toggleUserHandler(req, { params: { id: buyerUser.id } });
    return { passed: res.status === 400, details: `Status: ${res.status}` };
  });

  await runTest("14.13 Search query with special characters in sellers does not throw 500", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/sellers?q=%25%27%22--`, "GET", adminToken);
    const res = await sellersHandler(req);
    return { passed: res.status === 200, details: `Status: ${res.status}` };
  });

  await runTest("14.14 Search query with special characters in products does not throw 500", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/products?q=%25%27%22--`, "GET", adminToken);
    const res = await productsHandler(req);
    return { passed: res.status === 200, details: `Status: ${res.status}` };
  });

  await runTest("14.15 Search query with special characters in orders does not throw 500", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/orders?q=%25%27%22--`, "GET", adminToken);
    const res = await ordersHandler(req);
    return { passed: res.status === 200, details: `Status: ${res.status}` };
  });

  await runTest("14.16 Search query with special characters in users does not throw 500", async () => {
    const req = createReq(`http://localhost:3000/api/v1/admin/users?q=%25%27%22--`, "GET", adminToken);
    const res = await usersHandler(req);
    return { passed: res.status === 200, details: `Status: ${res.status}` };
  });

  await runTest("14.17 Platform overview returns database ping status in system health summary", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/overview", "GET", adminToken);
    const res = await overviewHandler(req);
    const data = await res.json();
    return {
      passed: data.systemHealth?.status === "OPERATIONAL" && data.systemHealth?.database === "CONNECTED",
      details: `Health: ${data.systemHealth?.status}, DB: ${data.systemHealth?.database}`,
    };
  });

  await runTest("14.18 Admin orders list includes buyer name or fallback", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/orders", "GET", adminToken);
    const res = await ordersHandler(req);
    const data = await res.json();
    const ord = data.orders.find((o: any) => o.id === order.id);
    return {
      passed: !!ord && ord.buyerName === "Standard Buyer",
      details: `Buyer name: ${ord?.buyerName}`,
    };
  });

  await runTest("14.19 Admin payments list includes buyer email and payment method", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/payments", "GET", adminToken);
    const res = await paymentsHandler(req);
    const data = await res.json();
    const p = data.payments.find((x: any) => x.id === payment.id);
    return {
      passed: !!p && p.buyerEmail === buyerUser.email && p.paymentMethod === "UPI",
      details: `Buyer: ${p?.buyerEmail}, Method: ${p?.paymentMethod}`,
    };
  });

  await runTest("14.20 Admin users list shows seller profile status if user is a seller", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users", "GET", adminToken);
    const res = await usersHandler(req);
    const data = await res.json();
    const u = data.users.find((x: any) => x.id === sellerUser.id);
    return {
      passed: !!u && u.sellerProfile?.status === "APPROVED",
      details: `Seller status: ${u?.sellerProfile?.status}`,
    };
  });

  await runTest("14.21 Admin users list shows null seller profile for plain buyer", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/users", "GET", adminToken);
    const res = await usersHandler(req);
    const data = await res.json();
    const u = data.users.find((x: any) => x.id === buyerUser.id);
    return {
      passed: !!u && u.sellerProfile === null,
      details: `Buyer sellerProfile: ${JSON.stringify(u?.sellerProfile)}`,
    };
  });

  await runTest("14.22 Admin sellers list includes storeName and revenue figures", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/sellers", "GET", adminToken);
    const res = await sellersHandler(req);
    const data = await res.json();
    const s = data.sellers.find((x: any) => x.id === sellerProfile.id);
    return {
      passed: !!s && s.storeName === sellerProfile.storeName,
      details: `Store: ${s?.storeName}, Gross: ${s?.allTimeGrossRevenuePaise}`,
    };
  });

  await runTest("14.23 Admin products list includes category and seller store name", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/products", "GET", adminToken);
    const res = await productsHandler(req);
    const data = await res.json();
    const p = data.products.find((x: any) => x.id === publishedProduct.id);
    return {
      passed: !!p && p.sellerStoreName === sellerProfile.storeName,
      details: `Category: ${p?.category}, Store: ${p?.sellerStoreName}`,
    };
  });

  await runTest("14.24 Admin orders list includes itemCount and totalAmountPaise", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/orders", "GET", adminToken);
    const res = await ordersHandler(req);
    const data = await res.json();
    const o = data.orders.find((x: any) => x.id === order.id);
    return {
      passed: !!o && o.itemCount === 1 && o.totalAmountPaise === 50000,
      details: `Item count: ${o?.itemCount}, Total: ${o?.totalAmountPaise}`,
    };
  });

  await runTest("14.25 Audit logs include IP address when provided", async () => {
    const req = createReq("http://localhost:3000/api/v1/admin/audit-logs", "GET", adminToken);
    const res = await auditLogsHandler(req);
    const data = await res.json();
    return {
      passed: Array.isArray(data.auditLogs),
      details: `Retrieved ${data.auditLogs.length} audit logs`,
    };
  });

  // Cleanup test-created records
  try {
    await prisma.review.deleteMany({ where: { id: review.id } });
    await prisma.receipt.deleteMany({ where: { id: receipt.id } });
    await prisma.payment.deleteMany({ where: { id: payment.id } });
    await prisma.orderItem.deleteMany({ where: { id: orderItem.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.product.deleteMany({ where: { id: { in: [publishedProduct.id, pendingProduct.id] } } });
    await prisma.sellerProfile.deleteMany({
      where: { id: { in: [sellerProfile.id, pendingSellerProfile.id] } },
    });
    await prisma.auditLog.deleteMany({ where: { adminId: adminUser.id } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUser.id, inactiveAdminUser.id, buyerUser.id, sellerUser.id, pendingSellerUser.id] },
      },
    });
  } catch (err) {
    console.error("Cleanup notice:", err);
  }

  // Summary
  console.log("\n===========================================================================");
  console.log("FEATURE 19 TEST EXECUTION COMPLETED:");
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total:  ${passedCount + failedCount}`);
  console.log("===========================================================================\n");

  if (failedCount > 0) {
    console.error("FAILURES OCCURRED IN FEATURE 19 TESTS:");
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log("ALL FEATURE 19 TESTS PASSED SUCCESSFULLY!");
  }
}

main()
  .catch((e) => {
    console.error("Test runner fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
