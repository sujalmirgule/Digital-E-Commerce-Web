import { prisma } from "../src/lib/prisma";
import { signJwt } from "../src/lib/jwt";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { DELETE as sellerDeleteProductHandler } from "../src/app/api/v1/seller/products/[productId]/route";
import { DELETE as adminDeleteProductHandler } from "../src/app/api/v1/admin/products/[productId]/route";
import { GET as publicProductsHandler } from "../src/app/api/v1/products/route";
import { GET as sellerProductsHandler } from "../src/app/api/v1/seller/products/route";
import {
  EarningStatus,
  LicenseType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  UserRole,
} from "@prisma/client";

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
      passedCount++;
      console.log(`[PASS] ${name}${result.details ? ` - ${result.details}` : ""}`);
    } else {
      failedCount++;
      failures.push(`${name}: ${result.details || "Failed"}`);
      console.error(`[FAIL] ${name} - ${result.details}`);
    }
  } catch (err: unknown) {
    failedCount++;
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`${name}: Uncaught exception: ${msg}`);
    console.error(`[FAIL] ${name} - Uncaught exception: ${msg}`);
  }
}

async function main() {
  console.log("=================================================================");
  console.log("TEST SUITE: MARKETPLACE UPGRADE & PRODUCT LIFECYCLE MANAGEMENT");
  console.log("=================================================================\n");

  const timestamp = Date.now();
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create Test Fixtures: Seller A, Seller B, Buyer, Admin
  console.log("Creating test fixtures...");
  const sellerAUser = await prisma.user.create({
    data: {
      email: `test_seller_a_${timestamp}@example.com`,
      passwordHash,
      fullName: "Seller A Test",
      role: UserRole.SELLER,
      sellerProfile: {
        create: {
          storeName: `Store A ${timestamp}`,
          storeSlug: `store-a-${timestamp}`,
          description: "Seller A Test Store",
          status: "APPROVED",
        },
      },
    },
    include: { sellerProfile: true },
  });

  const sellerBUser = await prisma.user.create({
    data: {
      email: `test_seller_b_${timestamp}@example.com`,
      passwordHash,
      fullName: "Seller B Test",
      role: UserRole.SELLER,
      sellerProfile: {
        create: {
          storeName: `Store B ${timestamp}`,
          storeSlug: `store-b-${timestamp}`,
          description: "Seller B Test Store",
          status: "APPROVED",
        },
      },
    },
    include: { sellerProfile: true },
  });

  const buyerUser = await prisma.user.create({
    data: {
      email: `test_buyer_${timestamp}@example.com`,
      passwordHash,
      fullName: "Buyer Test",
      role: UserRole.CUSTOMER,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: `test_admin_${timestamp}@example.com`,
      passwordHash,
      fullName: "Admin Test",
      role: UserRole.ADMIN,
    },
  });

  const testCategory = await prisma.category.findFirst({
    where: { isActive: true },
  });
  if (!testCategory) {
    throw new Error("No active category found for tests");
  }

  // Tokens (must include 'sub' for authenticateRequest)
  const sellerAToken = signJwt({
    sub: sellerAUser.id,
    email: sellerAUser.email,
    role: sellerAUser.role,
  });

  const sellerBToken = signJwt({
    sub: sellerBUser.id,
    email: sellerBUser.email,
    role: sellerBUser.role,
  });

  const buyerToken = signJwt({
    sub: buyerUser.id,
    email: buyerUser.email,
    role: buyerUser.role,
  });

  const adminToken = signJwt({
    sub: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
  });

  // Create Product A owned by Seller A
  const productA = await prisma.product.create({
    data: {
      sellerId: sellerAUser.sellerProfile!.id,
      categoryId: testCategory.id,
      title: `Product A Test ${timestamp}`,
      slug: `product-a-test-${timestamp}`,
      shortDescription: "A product owned by seller A for lifecycle testing",
      description: "Full description for product A",
      pricePaise: 49900,
      licenseType: LicenseType.STANDARD,
      status: ProductStatus.PUBLISHED,
      media: {
        create: {
          type: "THUMBNAIL",
          url: "/products/product-1.svg",
          displayOrder: 0,
        },
      },
    },
  });

  // Create Product B owned by Seller B
  const productB = await prisma.product.create({
    data: {
      sellerId: sellerBUser.sellerProfile!.id,
      categoryId: testCategory.id,
      title: `Product B Test ${timestamp}`,
      slug: `product-b-test-${timestamp}`,
      shortDescription: "A product owned by seller B for lifecycle testing",
      description: "Full description for product B",
      pricePaise: 79900,
      licenseType: LicenseType.STANDARD,
      status: ProductStatus.PUBLISHED,
      media: {
        create: {
          type: "THUMBNAIL",
          url: "/products/product-2.svg",
          displayOrder: 0,
        },
      },
    },
  });

  // Create Order, Entitlement, and SellerEarning on Product A to verify historical preservation
  const orderA = await prisma.order.create({
    data: {
      id: `ORD-TEST-${timestamp}`,
      buyerId: buyerUser.id,
      subtotalPaise: 49900,
      platformFeePaise: 4990,
      totalAmountPaise: 49900,
      currency: "INR",
      status: OrderStatus.PAID,
      razorpayOrderId: `order_test_${timestamp}`,
      paidAt: new Date(),
      buyerNameSnapshot: buyerUser.fullName,
      buyerEmailSnapshot: buyerUser.email,
      items: {
        create: {
          productId: productA.id,
          sellerId: sellerAUser.sellerProfile!.id,
          productTitle: productA.title,
          pricePaise: 49900,
          platformFeePaise: 4990,
          sellerEarningsPaise: 44910,
        },
      },
      payments: {
        create: {
          razorpayOrderId: `rzp_ord_${timestamp}`,
          razorpayPaymentId: `rzp_pay_${timestamp}`,
          amountPaise: 49900,
          currency: "INR",
          status: PaymentStatus.CAPTURED,
        },
      },
    },
    include: { items: true, payments: true },
  });

  const orderItemA = orderA.items[0];

  const entitlementA = await prisma.entitlement.create({
    data: {
      buyerId: buyerUser.id,
      orderId: orderA.id,
      orderItemId: orderItemA.id,
      productId: productA.id,
      isActive: true,
    },
  });

  const sellerEarningA = await prisma.sellerEarning.create({
    data: {
      sellerId: sellerAUser.sellerProfile!.id,
      orderId: orderA.id,
      orderItemId: orderItemA.id,
      grossAmountPaise: 49900,
      platformFeePaise: 4990,
      netEarningsPaise: 44910,
      status: EarningStatus.AVAILABLE,
      availableOn: new Date(),
    },
  });

  // -------------------------------------------------------------
  // Test 1: IDOR Protection: Seller B cannot delete Seller A's product
  // -------------------------------------------------------------
  await runTest("SECURITY: Seller B cannot delete Seller A's product (403 IDOR)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/seller/products/${productA.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${sellerBToken}`,
      },
    });
    const res = await sellerDeleteProductHandler(req, { params: { productId: productA.id } });
    const data = await res.json();
    return {
      passed: res.status === 403 && !data.success,
      details: `Status ${res.status}, code: ${data.error?.code}`,
    };
  });

  // -------------------------------------------------------------
  // Test 2: Unauthenticated user cannot delete product
  // -------------------------------------------------------------
  await runTest("SECURITY: Unauthenticated user cannot delete product (401)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/seller/products/${productA.id}`, {
      method: "DELETE",
    });
    const res = await sellerDeleteProductHandler(req, { params: { productId: productA.id } });
    const data = await res.json();
    return {
      passed: res.status === 401 && !data.success,
      details: `Status ${res.status}, code: ${data.error?.code}`,
    };
  });

  // -------------------------------------------------------------
  // Test 3: Buyer role cannot access seller product deletion
  // -------------------------------------------------------------
  await runTest("SECURITY: Customer role cannot delete product (403)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/seller/products/${productA.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${buyerToken}`,
      },
    });
    const res = await sellerDeleteProductHandler(req, { params: { productId: productA.id } });
    const data = await res.json();
    return {
      passed: res.status === 403 && !data.success,
      details: `Status ${res.status}, code: ${data.error?.code}`,
    };
  });

  // -------------------------------------------------------------
  // Test 4: Seller A successfully archives their own Product A
  // -------------------------------------------------------------
  await runTest("SELLER: Seller A safely archives own Product A (200)", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/seller/products/${productA.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${sellerAToken}`,
      },
    });
    const res = await sellerDeleteProductHandler(req, { params: { productId: productA.id } });
    const data = await res.json();

    const inDb = await prisma.product.findUnique({
      where: { id: productA.id },
      select: { status: true },
    });

    return {
      passed: res.status === 200 && data.success && inDb?.status === ProductStatus.ARCHIVED,
      details: `Status ${res.status}, DB ProductStatus is ${inDb?.status}`,
    };
  });

  // -------------------------------------------------------------
  // Test 5: Archived Product A disappears from Seller A active products list
  // -------------------------------------------------------------
  await runTest("SELLER: Archived product does not appear in active seller products list", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/seller/products", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sellerAToken}`,
      },
    });
    const res = await sellerProductsHandler(req);
    const data = await res.json();
    const foundArchived = data.data?.products?.find((p: any) => p.id === productA.id);

    return {
      passed: res.status === 200 && !foundArchived,
      details: `Archived product absent from default seller list: ${!foundArchived}`,
    };
  });

  // -------------------------------------------------------------
  // Test 6: Archived Product A disappears from Public Catalog (/api/v1/products)
  // -------------------------------------------------------------
  await runTest("PUBLIC: Archived product does not appear in public catalog", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/products?q=${encodeURIComponent(productA.title)}`, {
      method: "GET",
    });
    const res = await publicProductsHandler(req);
    const data = await res.json();
    const foundInPublic = data.data?.products?.find((p: any) => p.id === productA.id);

    return {
      passed: res.status === 200 && data.success && !foundInPublic,
      details: `Status ${res.status}, Product A found in public catalog: ${!!foundInPublic}`,
    };
  });

  // -------------------------------------------------------------
  // Test 7: Historical integrity preserved after Seller A archive
  // -------------------------------------------------------------
  await runTest("INTEGRITY: Historical orders, payments, entitlements, and earnings remain intact", async () => {
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderA.id },
      include: { items: true, payments: true },
    });
    const dbEntitlement = await prisma.entitlement.findUnique({
      where: { id: entitlementA.id },
    });
    const dbEarning = await prisma.sellerEarning.findUnique({
      where: { id: sellerEarningA.id },
    });

    const isOrderIntact = dbOrder !== null && dbOrder.items.length > 0 && dbOrder.payments.length > 0;
    const isEntitlementIntact = dbEntitlement !== null && dbEntitlement.isActive;
    const isEarningIntact = dbEarning !== null && dbEarning.netEarningsPaise === 44910;

    return {
      passed: isOrderIntact && isEntitlementIntact && isEarningIntact,
      details: `Order intact: ${isOrderIntact}, Entitlement active: ${isEntitlementIntact}, Earning intact: ${isEarningIntact}`,
    };
  });

  // -------------------------------------------------------------
  // Test 8: Admin removes Product B with AuditLog entry creation
  // -------------------------------------------------------------
  await runTest("ADMIN: Admin removes/archives Product B and creates AuditLog entry", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/admin/products/${productB.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const res = await adminDeleteProductHandler(req, { params: { productId: productB.id } });
    const data = await res.json();

    const inDb = await prisma.product.findUnique({
      where: { id: productB.id },
      select: { status: true },
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        targetEntity: "Product",
        targetId: productB.id,
        action: "REMOVE_PRODUCT",
      },
    });

    return {
      passed: res.status === 200 && inDb?.status === ProductStatus.ARCHIVED && !!auditLog,
      details: `Status ${res.status}, ProductStatus is ${inDb?.status}, AuditLog exists: ${!!auditLog}`,
    };
  });

  // -------------------------------------------------------------
  // Test 9: Catalog Verification: Demo products count and category distribution
  // -------------------------------------------------------------
  await runTest("DEMO CATALOG: Database contains ~60 published products across diverse categories", async () => {
    const publishedCount = await prisma.product.count({
      where: { status: ProductStatus.PUBLISHED },
    });

    const categoriesWithProducts = await prisma.category.findMany({
      where: {
        products: {
          some: { status: ProductStatus.PUBLISHED },
        },
      },
      select: { name: true, _count: { select: { products: true } } },
    });

    return {
      passed: publishedCount >= 50 && categoriesWithProducts.length >= 10,
      details: `Published products: ${publishedCount}, Active categories with products: ${categoriesWithProducts.length}`,
    };
  });

  // -------------------------------------------------------------
  // Test 10: All demo products have valid SVG/WebP thumbnails
  // -------------------------------------------------------------
  await runTest("ASSETS: Demo catalog products have valid thumbnail URLs", async () => {
    const demoProducts = await prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        media: {
          some: {
            url: {
              startsWith: "/products/product-",
            },
          },
        },
      },
      include: {
        media: {
          where: { type: "THUMBNAIL" },
        },
      },
    });

    const missing = demoProducts.filter(
      (p) => p.media.length === 0 || !p.media[0].url
    );

    return {
      passed: demoProducts.length >= 50 && missing.length === 0,
      details: `Demo products with valid thumbnails: ${demoProducts.length - missing.length} out of ${demoProducts.length}`,
    };
  });

  // Cleanup test artifacts
  console.log("\nCleaning up transient test fixtures...");
  await prisma.entitlement.deleteMany({ where: { orderId: orderA.id } });
  await prisma.sellerEarning.deleteMany({ where: { orderId: orderA.id } });
  await prisma.payment.deleteMany({ where: { orderId: orderA.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: orderA.id } });
  await prisma.order.deleteMany({ where: { id: orderA.id } });
  await prisma.auditLog.deleteMany({ where: { targetId: productB.id } });
  await prisma.productMedia.deleteMany({ where: { productId: { in: [productA.id, productB.id] } } });
  await prisma.product.deleteMany({ where: { id: { in: [productA.id, productB.id] } } });
  await prisma.sellerProfile.deleteMany({
    where: { id: { in: [sellerAUser.sellerProfile!.id, sellerBUser.sellerProfile!.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [sellerAUser.id, sellerBUser.id, buyerUser.id, adminUser.id] } },
  });

  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================================");

  if (failedCount > 0) {
    console.error("\nFailures:");
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
