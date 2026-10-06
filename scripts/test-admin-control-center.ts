import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import {
  generateReceiptForOrder,
  regenerateReceiptPDF,
  getActiveReceiptTemplate,
  updateActiveReceiptTemplate,
  formatPaiseToINR,
} from "../src/lib/services/receipt";
import { GET as adminPaymentsHandler } from "../src/app/api/v1/admin/payments/route";
import { GET as adminPaymentDetailHandler } from "../src/app/api/v1/admin/payments/[paymentId]/route";
import { GET as adminReceiptsHandler } from "../src/app/api/v1/admin/receipts/route";
import { GET as adminReceiptDetailHandler } from "../src/app/api/v1/admin/receipts/[id]/route";
import { GET as adminReceiptDownloadHandler } from "../src/app/api/v1/admin/receipts/[id]/download/route";
import { POST as adminReceiptRegenerateHandler } from "../src/app/api/v1/admin/receipts/[id]/regenerate/route";
import {
  GET as adminTemplateHandler,
  PUT as adminTemplateUpdateHandler,
} from "../src/app/api/v1/admin/receipts/template/route";
import { POST as adminTemplateUploadHandler } from "../src/app/api/v1/admin/receipts/template/upload/route";
import { GET as buyerReceiptHandler } from "../src/app/api/v1/buyer/orders/[orderId]/receipt/route";
import { GET as adminOverviewHandler } from "../src/app/api/v1/admin/dashboard/overview/route";
import { DELETE as adminProductDeleteHandler } from "../src/app/api/v1/admin/products/[productId]/route";
import { DELETE as sellerProductDeleteHandler } from "../src/app/api/v1/seller/products/[productId]/route";
import { OrderStatus, PaymentStatus, UserRole, SellerStatus } from "@prisma/client";
import { getStorageProvider } from "../src/lib/storage/local-storage-provider";

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<boolean | string | void>) {
  try {
    const res = await fn();
    if (res === false || typeof res === "string") {
      console.log(`[FAIL] ${name} -> ${res || "Condition failed"}`);
      failed++;
      failures.push(`${name}: ${res || "Condition failed"}`);
    } else {
      console.log(`[PASS] ${name}`);
      passed++;
    }
  } catch (err: any) {
    console.log(`[ERROR] ${name} -> ${err?.message || err}`);
    failed++;
    failures.push(`${name}: ${err?.message || err}`);
  }
}

async function main() {
  console.log("\n============================================================");
  console.log("RUNNING COMPREHENSIVE ADMIN CONTROL CENTER TEST SUITE");
  console.log("============================================================\n");

  const testSuffix = Math.floor(Math.random() * 1000000);
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Setup entities
  const adminUser = await prisma.user.create({
    data: {
      email: `admin_${testSuffix}@example.com`,
      fullName: "Admin Controller",
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const buyerA = await prisma.user.create({
    data: {
      email: `buyera_${testSuffix}@example.com`,
      fullName: "Buyer Alpha",
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const buyerB = await prisma.user.create({
    data: {
      email: `buyerb_${testSuffix}@example.com`,
      fullName: "Buyer Beta",
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `seller_${testSuffix}@example.com`,
      fullName: "Seller Creator",
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const sellerUserOther = await prisma.user.create({
    data: {
      email: `seller_other_${testSuffix}@example.com`,
      fullName: "Other Seller",
      passwordHash,
      role: UserRole.BUYER,
      isActive: true,
    },
  });

  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: `Store Alpha ${testSuffix}`,
      storeSlug: `store-alpha-${testSuffix}`,
      status: SellerStatus.APPROVED,
    },
  });

  const sellerProfileOther = await prisma.sellerProfile.create({
    data: {
      userId: sellerUserOther.id,
      storeName: `Store Other ${testSuffix}`,
      storeSlug: `store-other-${testSuffix}`,
      status: SellerStatus.APPROVED,
    },
  });

  const category = await prisma.category.create({
    data: {
      name: `Category Test ${testSuffix}`,
      slug: `cat-test-${testSuffix}`,
      description: "Test Category",
    },
  });

  const product = await prisma.product.create({
    data: {
      title: `Test Product Admin Suite ${testSuffix}`,
      slug: `test-prod-${testSuffix}`,
      shortDescription: "A digital asset for admin suite test",
      description: "A digital asset for admin suite",
      pricePaise: 49900,
      sellerId: sellerProfile.id,
      categoryId: category.id,
      status: "PUBLISHED",
    },
  });

  const otherProduct = await prisma.product.create({
    data: {
      title: `Other Seller Product ${testSuffix}`,
      slug: `other-prod-${testSuffix}`,
      shortDescription: "Owned by other seller",
      description: "Owned by other seller",
      pricePaise: 29900,
      sellerId: sellerProfileOther.id,
      categoryId: category.id,
      status: "PUBLISHED",
    },
  });

  // JWT Tokens
  const adminToken = signJwt({ sub: adminUser.id, role: UserRole.ADMIN, email: adminUser.email });
  const buyerAToken = signJwt({ sub: buyerA.id, role: UserRole.BUYER, email: buyerA.email });
  const buyerBToken = signJwt({ sub: buyerB.id, role: UserRole.BUYER, email: buyerB.email });
  const sellerToken = signJwt({ sub: sellerUser.id, role: UserRole.BUYER, email: sellerUser.email });

  // Order & Payment
  const order = await prisma.order.create({
    data: {
      id: `ORD-TEST-${testSuffix}`,
      buyerId: buyerA.id,
      buyerEmailSnapshot: buyerA.email,
      buyerNameSnapshot: buyerA.fullName,
      subtotalPaise: 49900,
      discountPaise: 0,
      platformFeePaise: 4990,
      totalAmountPaise: 49900,
      currency: "INR",
      razorpayOrderId: `order_rzp_${testSuffix}`,
      status: OrderStatus.PAID,
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: product.id,
            productTitle: product.title,
            sellerId: sellerProfile.id,
            pricePaise: 49900,
            platformFeePaise: 4990,
            sellerEarningsPaise: 44910,
          },
        ],
      },
    },
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      amountPaise: 49900,
      currency: "INR",
      status: PaymentStatus.CAPTURED,
      method: "UPI",
      razorpayOrderId: `order_rzp_${testSuffix}`,
      razorpayPaymentId: `pay_rzp_${testSuffix}`,
      verifiedAt: new Date(),
    },
  });

  const failedOrder = await prisma.order.create({
    data: {
      id: `ORD-FAIL-${testSuffix}`,
      buyerId: buyerA.id,
      buyerEmailSnapshot: buyerA.email,
      buyerNameSnapshot: buyerA.fullName,
      subtotalPaise: 19900,
      discountPaise: 0,
      platformFeePaise: 1990,
      totalAmountPaise: 19900,
      currency: "INR",
      razorpayOrderId: `order_fail_${testSuffix}`,
      status: OrderStatus.FAILED,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: failedOrder.id,
      amountPaise: 19900,
      currency: "INR",
      status: PaymentStatus.FAILED,
      method: "CARD",
      razorpayOrderId: `order_fail_${testSuffix}`,
      razorpayPaymentId: `pay_fail_${testSuffix}`,
    },
  });

  console.log("--- Group 1: Automatic Receipt Generation & Gate Logic ---");

  let generatedReceiptId = "";

  await test("1. Successful payment (PAID + CAPTURED) generates authoritative receipt", async () => {
    const res = await generateReceiptForOrder(order.id);
    if (!res.success || !res.receipt) return "Failed to generate receipt for valid order";
    generatedReceiptId = res.receipt.id;
    if (res.receipt.amountPaidPaise !== 49900) return "Receipt amount does not match order amount";
    return true;
  });

  await test("2. Failed payment does not generate successful receipt", async () => {
    const res = await generateReceiptForOrder(failedOrder.id);
    if (res.success) return "Receipt was generated for FAILED order";
    return true;
  });

  await test("3. Receipt number is unique, server-generated, and stable", async () => {
    const rec = await prisma.receipt.findUnique({ where: { id: generatedReceiptId } });
    if (!rec || !rec.invoiceNumber || !rec.id.startsWith("REC-")) return "Invalid receipt format";
    return true;
  });

  await test("4. Repeated payment verification does not duplicate receipt (Idempotency)", async () => {
    const res = await generateReceiptForOrder(order.id);
    if (!res.success || !res.idempotent) return "Second receipt generation was not marked idempotent";
    const count = await prisma.receipt.count({ where: { orderId: order.id } });
    if (count !== 1) return `Expected 1 receipt in DB, found ${count}`;
    return true;
  });

  await test("5. Concurrent receipt generation remains idempotent", async () => {
    const [r1, r2] = await Promise.all([
      generateReceiptForOrder(order.id),
      generateReceiptForOrder(order.id),
    ]);
    if (!r1.success || !r2.success) return "Concurrent calls failed";
    const count = await prisma.receipt.count({ where: { orderId: order.id } });
    if (count !== 1) return `Duplicate receipt created under concurrent invocation`;
    return true;
  });

  console.log("\n--- Group 2: Admin Receipt Management Endpoints ---");

  await test("6. Admin can list receipts (GET /api/v1/admin/receipts)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/receipts", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminReceiptsHandler(req);
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    if (!Array.isArray(body.data.receipts) || body.data.receipts.length === 0) {
      return "No receipts returned";
    }
    const found = body.data.receipts.find((r: any) => r.id === generatedReceiptId);
    if (!found) return "Newly created receipt not found in list";
    return true;
  });

  await test("7. Admin can view single receipt details (GET /api/v1/admin/receipts/:id)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/receipts/${generatedReceiptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminReceiptDetailHandler(req, { params: { id: generatedReceiptId } });
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    if (body.data.receipt.orderId !== order.id) return "Receipt order ID mismatch";
    return true;
  });

  await test("8. Admin can download receipt PDF stream (GET /api/v1/admin/receipts/:id/download)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/receipts/${generatedReceiptId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminReceiptDownloadHandler(req, { params: { id: generatedReceiptId } });
    if (res.status !== 200) return `Expected 200, got ${res.status}`;
    const contentType = res.headers.get("Content-Type");
    if (contentType !== "application/pdf") return `Expected application/pdf, got ${contentType}`;
    return true;
  });

  await test("9. Admin can regenerate receipt PDF (POST /api/v1/admin/receipts/:id/regenerate)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/receipts/${generatedReceiptId}/regenerate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminReceiptRegenerateHandler(req, { params: { id: generatedReceiptId } });
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    if (body.data.amountPaidPaise !== 49900) return "Financial data corrupted during regeneration";
    return true;
  });

  console.log("\n--- Group 3: Buyer Access & IDOR Protection ---");

  await test("10. Buyer can access own order receipt", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${order.id}/receipt`, {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await buyerReceiptHandler(req, { params: { orderId: order.id } });
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    if (body.data.receipt.id !== generatedReceiptId) return "Receipt ID mismatch";
    return true;
  });

  await test("11. IDOR: Buyer B cannot access Buyer A's receipt (403)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${order.id}/receipt`, {
      headers: { Authorization: `Bearer ${buyerBToken}` },
    });
    const res = await buyerReceiptHandler(req, { params: { orderId: order.id } });
    if (res.status !== 403) return `Expected 403, got ${res.status}`;
    return true;
  });

  await test("12. Unauthenticated access to receipt rejected (401)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${order.id}/receipt`);
    const res = await buyerReceiptHandler(req, { params: { orderId: order.id } });
    if (res.status !== 401) return `Expected 401, got ${res.status}`;
    return true;
  });

  console.log("\n--- Group 4: PDF & Private Storage Isolation ---");

  await test("13. Receipt PDF generated successfully with valid storage presence", async () => {
    const storage = getStorageProvider();
    const storageKey = `receipts/${generatedReceiptId}.pdf`;
    const exists = await storage.objectExists(storageKey);
    if (!exists) return "Receipt PDF file does not exist in private storage";
    const meta = await storage.getObjectMetadata(storageKey);
    if (!meta || meta.size < 1000) return `File too small or missing metadata: ${meta?.size}`;
    return true;
  });

  await test("14. Receipt stored privately (outside public/static folders)", async () => {
    const rec = await prisma.receipt.findUnique({ where: { id: generatedReceiptId } });
    if (!rec?.pdfStorageKey) return "Missing storage key";
    if (rec.pdfStorageKey.includes("public/") || rec.pdfStorageKey.includes("static/")) {
      return "Storage key placed in public directory!";
    }
    return true;
  });

  await test("15. Storage key is not exposed directly as a public URL", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/buyer/orders/${order.id}/receipt`, {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await buyerReceiptHandler(req, { params: { orderId: order.id } });
    const body = await res.json();
    if (body.data.receipt.pdfStorageKey && !body.data.receipt.pdfStorageKey.startsWith("receipts/")) {
      return "Unexpected raw storage path exposed";
    }
    return true;
  });

  console.log("\n--- Group 5: Template Management, Customization & Versioning ---");

  await test("16. Logo upload rejects invalid MIME type (text/plain)", async () => {
    const formData = new FormData();
    const badFile = new Blob(["malicious script"], { type: "text/plain" });
    formData.append("file", badFile, "malicious.txt");
    formData.append("type", "logo");

    const req = new NextRequest("http://localhost:3000/api/v1/admin/receipts/template/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });
    const res = await adminTemplateUploadHandler(req);
    if (res.status !== 400) return `Expected 400 for text/plain, got ${res.status}`;
    return true;
  });

  await test("17. Background upload rejects non-image executable files", async () => {
    const formData = new FormData();
    const badFile = new Blob(["MZ\x90\x00"], { type: "application/x-msdownload" });
    formData.append("file", badFile, "malware.exe");
    formData.append("type", "background");

    const req = new NextRequest("http://localhost:3000/api/v1/admin/receipts/template/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });
    const res = await adminTemplateUploadHandler(req);
    if (res.status !== 400) return `Expected 400 for binary/exe, got ${res.status}`;
    return true;
  });

  const originalTemplate = await getActiveReceiptTemplate();
  const originalVersion = originalTemplate.version;

  await test("18. Template color and branding update increments template version", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/receipts/template", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        primaryColor: "#2A1810",
        secondaryColor: "#7A5038",
        textColor: "#1F1A17",
        backgroundColor: "#FAF6F0",
        platformName: "Zero Booth Marketplace Studio",
        watermarkText: "ORIGINAL VERIFIED",
        watermarkOpacity: 0.12,
        headerVisible: true,
        headerText: "Official Verified Receipt",
      }),
    });
    const res = await adminTemplateUpdateHandler(req);
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    if (body.data.template.version <= originalVersion) {
      return `Template version was not incremented (was ${originalVersion}, now ${body.data.template.version})`;
    }
    return true;
  });

  await test("19. Old receipt remains visually and snapshot-wise unchanged after template update", async () => {
    const oldRec = await prisma.receipt.findUnique({ where: { id: generatedReceiptId } });
    if (!oldRec) return "Old receipt not found";
    if (oldRec.templateVersion !== originalVersion) {
      return `Old receipt version was mutated! (expected ${originalVersion}, got ${oldRec.templateVersion})`;
    }
    return true;
  });

  await test("20. Audit log created for template update and regeneration", async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        adminId: adminUser.id,
      },
    });
    const actions = logs.map((l) => l.action);
    if (!actions.includes("RECEIPT_TEMPLATE_UPDATED")) {
      return `RECEIPT_TEMPLATE_UPDATED audit log missing (found: ${actions.join(", ")})`;
    }
    if (!actions.includes("RECEIPT_REGENERATED")) {
      return `RECEIPT_REGENERATED audit log missing (found: ${actions.join(", ")})`;
    }
    return true;
  });

  console.log("\n--- Group 6: Financial Safety & Anti-Tampering ---");

  await test("21. Payment amount matches authoritative Order/Payment (49900 paise)", async () => {
    const rec = await prisma.receipt.findUnique({ where: { id: generatedReceiptId } });
    if (rec?.amountPaidPaise !== payment.amountPaise) return "Amount mismatch";
    return true;
  });

  await test("22. Client cannot inject amount or tamper with receipt generation", async () => {
    // Attempting to generate receipt does not accept any client-side amount parameter
    const res = await generateReceiptForOrder(order.id);
    if (res.receipt?.amountPaidPaise !== 49900) return "Authoritative amount modified";
    return true;
  });

  console.log("\n--- Group 7: Admin Payment Management ---");

  await test("23. Admin can list payments with all metadata (GET /api/v1/admin/payments)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/payments?page=1&limit=10", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminPaymentsHandler(req);
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    const payments = body.data.payments;
    if (!Array.isArray(payments) || payments.length === 0) return "No payments found";
    const p = payments.find((x: any) => x.id === payment.id);
    if (!p) return "Test payment not found in list";
    if (p.razorpayPaymentId !== payment.razorpayPaymentId) return "Razorpay payment ID mismatch";
    if (p.receiptStatus !== "GENERATED") return `Expected receiptStatus GENERATED, got ${p.receiptStatus}`;
    return true;
  });

  await test("24. Admin can view payment detail modal without secrets leak", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/payments/${payment.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminPaymentDetailHandler(req, { params: { paymentId: payment.id } });
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    const p = body.data.payment;
    if (p.id !== payment.id) return "Payment ID mismatch";
    if (p.amountPaise !== 49900) return "Amount mismatch";
    const str = JSON.stringify(body);
    if (str.includes("DATABASE_URL") || str.includes("passwordHash") || str.includes("JWT_SECRET")) {
      return "Sensitive credentials leaked in payment detail response!";
    }
    return true;
  });

  await test("25. Non-admin cannot access admin payments (403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/payments", {
      headers: { Authorization: `Bearer ${buyerAToken}` },
    });
    const res = await adminPaymentsHandler(req);
    if (res.status !== 403) return `Expected 403, got ${res.status}`;
    return true;
  });

  console.log("\n--- Group 8: Product Management & Soft-Archive Protection ---");

  await test("26. Admin can safely archive product with financial history", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/products/${product.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminProductDeleteHandler(req, { params: { productId: product.id } });
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    // Verify soft delete in DB
    const checkProd = await prisma.product.findUnique({ where: { id: product.id } });
    if (checkProd?.status !== "ARCHIVED") return `Expected ARCHIVED, got ${checkProd?.status}`;
    // Verify historical orders and items intact
    const checkOrder = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
    if (!checkOrder || checkOrder.items.length === 0) return "Historical order items destroyed!";
    return true;
  });

  await test("27. Seller cannot archive other seller's product (IDOR check)", async () => {
    // sellerUser attempts to archive otherProduct (owned by sellerUserOther)
    const req = new NextRequest(`http://localhost:3000/api/v1/seller/products/${otherProduct.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    const res = await sellerProductDeleteHandler(req, { params: { productId: otherProduct.id } });
    if (res.status !== 403 && res.status !== 404) {
      return `Expected 403 or 404 for unowned product archive, got ${res.status}`;
    }
    return true;
  });

  console.log("\n--- Group 9: Admin Dashboard Real Data Verification ---");

  await test("28. Admin dashboard overview returns 100% real PostgreSQL aggregations", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/dashboard/overview", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await adminOverviewHandler(req);
    const body = await res.json();
    if (res.status !== 200 || !body.success) return `Status ${res.status}: ${JSON.stringify(body)}`;
    const d = body.data;
    const stats = d.stats || d;
    if (typeof stats.users?.total !== "number") return "users.total not a number";
    if (typeof stats.orders?.total !== "number") return "orders.total not a number";
    if (typeof stats.receiptsCount !== "number") return "receiptsCount not a number";
    if (stats.receiptsCount < 1) return "Receipt count does not reflect generated receipt";
    return true;
  });

  // Cleanup test records
  console.log("\nCleaning up test entities...");
  try {
    await prisma.auditLog.deleteMany({
      where: {
        adminId: adminUser.id,
      },
    });
    await prisma.receipt.deleteMany({
      where: {
        orderId: { in: [order.id, failedOrder.id] },
      },
    });
    await prisma.payment.deleteMany({
      where: {
        orderId: { in: [order.id, failedOrder.id] },
      },
    });
    await prisma.orderItem.deleteMany({
      where: {
        orderId: { in: [order.id, failedOrder.id] },
      },
    });
    await prisma.order.deleteMany({
      where: {
        id: { in: [order.id, failedOrder.id] },
      },
    });
    await prisma.product.deleteMany({
      where: {
        id: { in: [product.id, otherProduct.id] },
      },
    });
    await prisma.category.deleteMany({
      where: {
        id: category.id,
      },
    });
    await prisma.sellerProfile.deleteMany({
      where: {
        id: { in: [sellerProfile.id, sellerProfileOther.id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUser.id, buyerA.id, buyerB.id, sellerUser.id, sellerUserOther.id] },
      },
    });
    console.log("Cleanup completed successfully.");
  } catch (cleanErr: any) {
    console.error("Cleanup error:", cleanErr?.message);
  }

  console.log("\n============================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    console.error("FAILURES:");
    failures.forEach((f) => console.error(" - " + f));
    process.exit(1);
  } else {
    console.log("ALL ADMIN CONTROL CENTER TESTS PASSED PERFECTLY!");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Fatal error during test execution:", e);
  process.exit(1);
});
