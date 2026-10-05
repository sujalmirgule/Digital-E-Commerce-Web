import { NextRequest } from "next/server";
import { POST as onboardHandler } from "../src/app/api/v1/seller/onboard/route";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { signJwt } from "../src/lib/jwt";

function createMockPostRequest(url: string, bodyText: string, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: bodyText,
  });
}

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(
  num: number,
  name: string,
  fn: () => Promise<{ passed: boolean; details?: string }>
) {
  try {
    const res = await fn();
    results.push({ num, name, passed: res.passed, details: res.details });
    if (res.passed) {
      console.log(`[PASS] Test ${num.toString().padStart(2, "0")}: ${name}`);
    } else {
      console.error(`[FAIL] Test ${num.toString().padStart(2, "0")}: ${name} - ${res.details}`);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    results.push({ num, name, passed: false, details: `Exception: ${errMsg}` });
    console.error(`[FAIL] Test ${num.toString().padStart(2, "0")}: ${name} - Exception: ${errMsg}`);
  }
}

async function main() {
  console.log("=================================================================");
  console.log("DIGITAL MARKETPLACE - FEATURE 04: SELLER ONBOARDING TEST SUITE");
  console.log("=================================================================\n");

  const timestamp = Date.now();
  const passwordHash = await hashPassword("ValidPassword123!@");

  // Create test user
  const user = await prisma.user.create({
    data: {
      fullName: "Seller Applicant",
      email: `seller.applicant.${timestamp}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });

  const token = signJwt({ sub: user.id, email: user.email, role: user.role });
  const testSlug = `store-${timestamp}`;

  // 1. Missing authentication
  await runTest(1, "Missing authentication rejected (401)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/seller/onboard",
      JSON.stringify({ storeName: "Test Store" })
    );
    const res = await onboardHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 2. Valid seller onboarding application
  await runTest(2, "Valid seller onboarding application (201 PENDING)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/seller/onboard",
      JSON.stringify({
        storeName: "CraftCode Studio",
        storeSlug: testSlug,
        bio: "Premium digital templates",
        description: "Official creator storefront for UI kits and boilerplates",
        panNumber: "ABCDE1234F",
        bankAccount: "987654321012",
        bankIfsc: "HDFC0001234",
        bankAccountHolder: "CraftCode Labs Pvt Ltd",
      }),
      `Bearer ${token}`
    );
    const res = await onboardHandler(req);
    const data = await res.json();
    const profile = data.data?.sellerProfile;
    const passed =
      res.status === 201 &&
      data.success === true &&
      profile?.status === "PENDING" &&
      profile?.storeSlug === testSlug &&
      profile?.panNumberMasked === "ABCDE****F" &&
      profile?.bankAccountLast4 === "****1012";
    return {
      passed,
      details: `Status: ${res.status}, Profile Status: ${profile?.status}, PAN: ${profile?.panNumberMasked}`,
    };
  });

  // 3. Duplicate seller application for same user
  await runTest(3, "Duplicate application rejected for same user (409)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/seller/onboard",
      JSON.stringify({
        storeName: "Another Store",
        storeSlug: `another-${timestamp}`,
        panNumber: "ABCDE1234F",
        bankAccount: "987654321012",
        bankIfsc: "HDFC0001234",
        bankAccountHolder: "CraftCode Labs Pvt Ltd",
      }),
      `Bearer ${token}`
    );
    const res = await onboardHandler(req);
    const data = await res.json();
    const passed = res.status === 409 && data.error?.code === "APPLICATION_PENDING";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 4. Duplicate store slug
  await runTest(4, "Duplicate store slug rejected (409)", async () => {
    const anotherUser = await prisma.user.create({
      data: {
        fullName: "Second User",
        email: `second.${timestamp}@example.com`,
        passwordHash,
        role: "BUYER",
        isActive: true,
      },
    });
    const anotherToken = signJwt({ sub: anotherUser.id, email: anotherUser.email, role: anotherUser.role });

    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/seller/onboard",
      JSON.stringify({
        storeName: "Duplicate Store",
        storeSlug: testSlug, // already used
        panNumber: "XYZAB5678C",
        bankAccount: "112233445566",
        bankIfsc: "SBIN0001234",
        bankAccountHolder: "Second User",
      }),
      `Bearer ${anotherToken}`
    );
    const res = await onboardHandler(req);
    const data = await res.json();
    const passed = res.status === 409 && data.error?.code === "SLUG_TAKEN";

    await prisma.user.delete({ where: { id: anotherUser.id } });
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 5. Invalid PAN number
  await runTest(5, "Invalid PAN number format rejected (400)", async () => {
    const user3 = await prisma.user.create({
      data: {
        fullName: "Third User",
        email: `third.${timestamp}@example.com`,
        passwordHash,
        role: "BUYER",
        isActive: true,
      },
    });
    const token3 = signJwt({ sub: user3.id, email: user3.email, role: user3.role });

    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/seller/onboard",
      JSON.stringify({
        storeName: "Invalid PAN Store",
        storeSlug: `slug-${timestamp}-3`,
        panNumber: "INVALID_PAN",
        bankAccount: "112233445566",
        bankIfsc: "SBIN0001234",
        bankAccountHolder: "Third User",
      }),
      `Bearer ${token3}`
    );
    const res = await onboardHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";

    await prisma.user.delete({ where: { id: user3.id } });
    return { passed, details: `Status: ${res.status}` };
  });

  // 6. Direct Database Verification
  await runTest(6, "Verify SellerProfile in PostgreSQL", async () => {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: user.id },
    });
    const passed =
      !!profile &&
      profile.status === "PENDING" &&
      profile.storeSlug === testSlug &&
      profile.panNumberMasked === "ABCDE****F" &&
      profile.bankAccountLast4 === "****1012";
    return { passed, details: `DB Profile Status: ${profile?.status}` };
  });

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });

  console.log("\n=================================================================");
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
  console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? "ALL TESTS PASSED" : "TEST FAILURES DETECTED"}`);
  console.log("=================================================================");

  if (!allPassed) process.exit(1);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
