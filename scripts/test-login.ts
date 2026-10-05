import { NextRequest } from "next/server";
import { POST as loginHandler } from "../src/app/api/v1/auth/login/route";
import { GET as meHandler } from "../src/app/api/v1/auth/me/route";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { signJwt } from "../src/lib/jwt";
import jwt from "jsonwebtoken";

// Helpers
function createMockPostRequest(url: string, bodyText: string): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: bodyText,
  });
}

function createMockGetRequest(url: string, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return new NextRequest(url, {
    method: "GET",
    headers,
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
  console.log("DIGITAL MARKETPLACE - FEATURE 02: LOGIN TEST SUITE");
  console.log("=================================================================\n");

  const timestamp = Date.now();
  const validEmail = `active.login.${timestamp}@example.com`;
  const validPassword = "SecurePassword123!@";
  const inactiveEmail = `inactive.login.${timestamp}@example.com`;

  // Seed active test user
  const passwordHash = await hashPassword(validPassword);
  const activeUser = await prisma.user.create({
    data: {
      fullName: "Active Test User",
      email: validEmail,
      passwordHash,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Seed inactive test user
  const inactiveUser = await prisma.user.create({
    data: {
      fullName: "Inactive User",
      email: inactiveEmail,
      passwordHash,
      role: "BUYER",
      isActive: false,
      isEmailVerified: true,
    },
  });

  let validToken = "";

  // 01. Valid login
  await runTest(1, "Valid login", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: validEmail, password: validPassword })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.success === true &&
      data.data?.user?.email === validEmail &&
      typeof data.data?.token === "string";
    if (passed) validToken = data.data.token;
    return { passed, details: `Status: ${res.status}, Token received: ${!!validToken}` };
  });

  // 02. Wrong password
  await runTest(2, "Wrong password rejection (401)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: validEmail, password: "IncorrectPassword999!" })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed =
      res.status === 401 &&
      data.success === false &&
      data.error?.code === "INVALID_CREDENTIALS";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 03. Unknown email
  await runTest(3, "Unknown email rejection (401)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: `nonexistent.${timestamp}@example.com`, password: validPassword })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed =
      res.status === 401 &&
      data.success === false &&
      data.error?.code === "INVALID_CREDENTIALS";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 04. Missing email
  await runTest(4, "Missing email validation (400)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ password: validPassword })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 05. Missing password
  await runTest(5, "Missing password validation (400)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: validEmail })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 06. Invalid email format
  await runTest(6, "Invalid email format rejection (400)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: "notanemail", password: validPassword })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 07. Empty payload
  await runTest(7, "Empty payload rejection (400)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({})
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 08. Malformed JSON
  await runTest(8, "Malformed JSON rejection (400)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      "{ invalid json format "
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "INVALID_JSON";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 09. Unexpected extra fields
  await runTest(9, "Unexpected extra fields rejection (400)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({
        email: validEmail,
        password: validPassword,
        role: "ADMIN", // Attacker injection
        isEmailVerified: true,
      })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Injected fields rejected` };
  });

  // 10. Uppercase email normalization
  await runTest(10, "Uppercase email normalization succeeds", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: validEmail.toUpperCase(), password: validPassword })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed = res.status === 200 && data.success === true;
    return { passed, details: `Status: ${res.status}` };
  });

  // 11. Leading/trailing email whitespace normalization
  await runTest(11, "Leading/trailing whitespace normalization succeeds", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: `  ${validEmail}  `, password: validPassword })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed = res.status === 200 && data.success === true;
    return { passed, details: `Status: ${res.status}` };
  });

  // 12. Inactive account
  await runTest(12, "Inactive account rejection (403)", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: inactiveEmail, password: validPassword })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const passed =
      res.status === 403 &&
      data.success === false &&
      data.error?.code === "ACCOUNT_INACTIVE";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 13. Successful authentication credential generation (JWT validation)
  await runTest(13, "Successful credential generation & claims verification", async () => {
    const decoded = jwt.decode(validToken) as Record<string, unknown> | null;
    const passed =
      !!decoded &&
      decoded.sub === activeUser.id &&
      decoded.email === validEmail &&
      decoded.role === "BUYER" &&
      typeof decoded.exp === "number";
    return {
      passed,
      details: `Claims sub: ${decoded?.sub}, exp: ${decoded?.exp}`,
    };
  });

  // 14. Invalid credential rejected on protected endpoint
  await runTest(14, "Invalid credential rejected on protected endpoint (401)", async () => {
    const req = createMockGetRequest(
      "http://localhost:3000/api/v1/auth/me",
      "Bearer invalid.token.payload"
    );
    const res = await meHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 15. Expired credential rejected
  await runTest(15, "Expired credential rejected (401)", async () => {
    const expiredToken = signJwt(
      { sub: activeUser.id, email: validEmail, role: "BUYER" },
      { expiresIn: "-10s" } // Expired 10 seconds ago
    );
    const req = createMockGetRequest(
      "http://localhost:3000/api/v1/auth/me",
      `Bearer ${expiredToken}`
    );
    const res = await meHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 16. Tampered credential rejected
  await runTest(16, "Tampered credential rejected (401)", async () => {
    // Tamper with signature
    const tamperedToken = validToken.substring(0, validToken.length - 6) + "XXXXXX";
    const req = createMockGetRequest(
      "http://localhost:3000/api/v1/auth/me",
      `Bearer ${tamperedToken}`
    );
    const res = await meHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 17. Missing Authorization header
  await runTest(17, "Missing Authorization header rejected (401)", async () => {
    const req = createMockGetRequest("http://localhost:3000/api/v1/auth/me");
    const res = await meHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 18. Malformed Authorization header
  await runTest(18, "Malformed Authorization header (no Bearer prefix) rejected (401)", async () => {
    const req = createMockGetRequest(
      "http://localhost:3000/api/v1/auth/me",
      `Token ${validToken}`
    );
    const res = await meHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 19. Valid credential accesses protected endpoint
  await runTest(19, "Valid credential accesses protected endpoint (200)", async () => {
    const req = createMockGetRequest(
      "http://localhost:3000/api/v1/auth/me",
      `Bearer ${validToken}`
    );
    const res = await meHandler(req);
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.success === true &&
      data.data?.user?.id === activeUser.id &&
      data.data?.user?.email === validEmail;
    return {
      passed,
      details: `Status: ${res.status}, Retrieved user: ${data.data?.user?.email}`,
    };
  });

  // 20. Response does not expose password/hash
  await runTest(20, "Response does NOT expose password or passwordHash", async () => {
    const req = createMockPostRequest(
      "http://localhost:3000/api/v1/auth/login",
      JSON.stringify({ email: validEmail, password: validPassword })
    );
    const res = await loginHandler(req);
    const data = await res.json();
    const rawJson = JSON.stringify(data);
    const hasPassword = rawJson.includes("password") || rawJson.includes("passwordHash");
    const passed = !hasPassword;
    return { passed, details: `Zero credential leakage: ${passed}` };
  });

  // Section 10: Database Integrity Verification
  console.log("\n--- Section 10: Database Integrity Verification ---");
  const dbUserAfterLogin = await prisma.user.findUnique({
    where: { id: activeUser.id },
  });
  if (!dbUserAfterLogin) {
    throw new Error("Active user unexpectedly missing from database!");
  }
  const isHashUnchanged = dbUserAfterLogin.passwordHash === passwordHash;
  const isEmailUnchanged = dbUserAfterLogin.email === validEmail;
  const isRoleUnchanged = dbUserAfterLogin.role === "BUYER";
  const isActiveUnchanged = dbUserAfterLogin.isActive === true;
  console.log(`Database verification:
  - User exists: true
  - Password hash untouched: ${isHashUnchanged}
  - Email untouched: ${isEmailUnchanged}
  - Role untouched: ${isRoleUnchanged}
  - Active status untouched: ${isActiveUnchanged}`);

  if (!isHashUnchanged || !isEmailUnchanged || !isRoleUnchanged || !isActiveUnchanged) {
    throw new Error("Database integrity check failed: User credentials were mutated during login!");
  }

  // Cleanup test users
  await prisma.user.deleteMany({
    where: {
      id: { in: [activeUser.id, inactiveUser.id] },
    },
  });

  console.log("\n=================================================================");
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
  console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? "ALL 20 TESTS PASSED" : "TEST FAILURES DETECTED"}`);
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
