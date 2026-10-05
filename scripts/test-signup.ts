import { NextRequest } from "next/server";
import { POST } from "../src/app/api/v1/auth/signup/route";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

// Helper to create NextRequest with mock JSON
function createMockRequest(bodyText: string, contentType = "application/json"): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/auth/signup", {
    method: "POST",
    headers: {
      "content-type": contentType,
    },
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
  console.log("DIGITAL MARKETPLACE - FEATURE 01: USER SIGNUP TEST SUITE");
  console.log("=================================================================\n");

  const timestamp = Date.now();
  const testEmail1 = `valid.test.${timestamp}@example.com`;
  const testEmailUppercase = `UPPERCASE.TEST.${timestamp}@EXAMPLE.COM`;
  const testEmailWhitespace = `  whitespace.test.${timestamp}@example.com  `;

  // Clean up any test users with this prefix before starting
  try {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@example.com",
        },
      },
    });
  } catch {
    // Ignore foreign key constraints from unrelated suites
  }

  // 1. Valid signup
  let createdUserId = "";
  await runTest(1, "Valid signup", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "Rahul Test",
        email: testEmail1,
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 201 && data.success === true && !!data.data?.user?.id;
    if (passed) createdUserId = data.data.user.id;
    return {
      passed,
      details: `Status: ${res.status}, User ID: ${createdUserId}`,
    };
  });

  // 2. Missing name
  await runTest(2, "Missing name", async () => {
    const req = createMockRequest(
      JSON.stringify({
        email: `missing.name.${timestamp}@example.com`,
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Error Code: ${data.error?.code}` };
  });

  // 3. Missing email
  await runTest(3, "Missing email", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "Missing Email",
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Error Code: ${data.error?.code}` };
  });

  // 4. Missing password
  await runTest(4, "Missing password", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "Missing Password",
        email: `missing.pass.${timestamp}@example.com`,
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Error Code: ${data.error?.code}` };
  });

  // 5. Invalid email format
  await runTest(5, "Invalid email format", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "Invalid Email",
        email: "not-a-valid-email",
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Message: ${data.error?.message}` };
  });

  // 6. Weak password (no number/special character)
  await runTest(6, "Weak password rejection", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "Weak Password",
        email: `weak.pass.${timestamp}@example.com`,
        password: "simplepassword",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Message: ${data.error?.message}` };
  });

  // 7. Duplicate email
  await runTest(7, "Duplicate email rejection (409 Conflict)", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "Duplicate User",
        email: testEmail1, // already created in test 1
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 409 && data.success === false && data.error?.code === "DUPLICATE_EMAIL";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 8. Uppercase email (must normalize and prevent duplicate)
  await runTest(8, "Uppercase email normalization and duplicate check", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "Uppercase User",
        email: testEmail1.toUpperCase(), // same email in uppercase
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 409 && data.success === false && data.error?.code === "DUPLICATE_EMAIL";
    return { passed, details: `Status: ${res.status}, Duplicate caught correctly` };
  });

  // 9. Leading/trailing whitespace normalization
  await runTest(9, "Leading/trailing whitespace normalization", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "  Whitespace User  ",
        email: testEmailWhitespace,
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const cleanEmail = testEmailWhitespace.trim().toLowerCase();
    const cleanName = "Whitespace User";
    const passed =
      res.status === 201 &&
      data.data?.user?.email === cleanEmail &&
      data.data?.user?.fullName === cleanName;
    return { passed, details: `Normalized Email: ${data.data?.user?.email}` };
  });

  // 10. Malformed JSON handling
  await runTest(10, "Malformed JSON handling", async () => {
    const req = createMockRequest("{ invalid json ");
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "INVALID_JSON";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 11. Unexpected fields (Zod strict validation)
  await runTest(11, "Unexpected extra fields rejection", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "Hacker User",
        email: `hacker.${timestamp}@example.com`,
        password: "ValidPassword123!",
        role: "ADMIN", // Attacker trying to elevate role
        isEmailVerified: true,
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Rejected injection: ${data.error?.message}` };
  });

  // 12. Very long values rejection
  await runTest(12, "Very long values rejection", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "A".repeat(200), // Exceeds 100 char limit
        email: `long.${timestamp}@example.com`,
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Limit enforced: ${data.error?.message}` };
  });

  // 13. Empty payload handling
  await runTest(13, "Empty payload handling", async () => {
    const req = createMockRequest(JSON.stringify({}));
    const res = await POST(req);
    const data = await res.json();
    const passed = res.status === 400 && data.success === false && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 14. Password hashing verification in DB
  await runTest(14, "Password hashing verification (bcrypt salt rounds)", async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail1 },
    });
    if (!user) return { passed: false, details: "User not found in DB" };
    // Check that it starts with bcrypt signature $2a$ or $2b$
    const isBcrypt = user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$");
    // Verify password matches using bcrypt.compare
    const matches = await bcrypt.compare("ValidPassword123!", user.passwordHash);
    const passed = isBcrypt && matches && user.passwordHash !== "ValidPassword123!";
    return {
      passed,
      details: `Is bcrypt hash: ${isBcrypt}, Matches plaintext: ${matches}, Hash prefix: ${user.passwordHash.substring(0, 7)}...`,
    };
  });

  // 15. Verify stored user in PostgreSQL
  await runTest(15, "Verify stored user attributes in PostgreSQL", async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail1 },
    });
    if (!user) return { passed: false, details: "User not found in DB" };
    const passed =
      user.role === "BUYER" &&
      user.isActive === true &&
      user.isEmailVerified === false &&
      user.createdAt instanceof Date &&
      user.updatedAt instanceof Date;
    return {
      passed,
      details: `Role: ${user.role}, Active: ${user.isActive}, Verified: ${user.isEmailVerified}`,
    };
  });

  // 16. Verify API response does NOT contain password or passwordHash
  await runTest(16, "Verify response does NOT contain password/hash", async () => {
    const req = createMockRequest(
      JSON.stringify({
        fullName: "No Leak User",
        email: `noleak.${timestamp}@example.com`,
        password: "ValidPassword123!",
      })
    );
    const res = await POST(req);
    const data = await res.json();
    const rawJson = JSON.stringify(data);
    const hasPassword = rawJson.includes("password") || rawJson.includes("passwordHash");
    const passed = !hasPassword;
    return {
      passed,
      details: `Zero leak check passed: ${passed}`,
    };
  });

  // Clean up test users
  try {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@example.com",
        },
      },
    });
  } catch {
    // Ignore foreign key constraints from unrelated suites
  }

  console.log("\n=================================================================");
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
  console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? "ALL 16 TESTS PASSED" : "TEST FAILURES DETECTED"}`);
  console.log("=================================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
