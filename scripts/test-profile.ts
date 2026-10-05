import { NextRequest } from "next/server";
import { GET as getProfileHandler, PATCH as updateProfileHandler } from "../src/app/api/v1/users/me/route";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { signJwt } from "../src/lib/jwt";

// Helpers
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

function createMockPatchRequest(url: string, bodyText: string, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return new NextRequest(url, {
    method: "PATCH",
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
  console.log("DIGITAL MARKETPLACE - FEATURE 03: USER PROFILE TEST SUITE");
  console.log("=================================================================\n");

  const timestamp = Date.now();
  const passwordHash = await hashPassword("SecurePassword123!@");

  // Seed User A
  const userA = await prisma.user.create({
    data: {
      fullName: "User Alpha",
      email: `alpha.${timestamp}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Seed User B
  const userB = await prisma.user.create({
    data: {
      fullName: "User Beta",
      email: `beta.${timestamp}@example.com`,
      passwordHash,
      role: "BUYER",
      isActive: true,
      isEmailVerified: true,
    },
  });

  const tokenA = signJwt({ sub: userA.id, email: userA.email, role: userA.role });
  const tokenB = signJwt({ sub: userB.id, email: userB.email, role: userB.role });

  console.log("--- GET PROFILE TESTS (01 - 07) ---");

  // 01. Authenticated user retrieves own profile
  await runTest(1, "Authenticated user retrieves own profile", async () => {
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Bearer ${tokenA}`);
    const res = await getProfileHandler(req);
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.success === true &&
      data.data?.user?.id === userA.id &&
      data.data?.user?.email === userA.email;
    return { passed, details: `Status: ${res.status}, Name: ${data.data?.user?.fullName}` };
  });

  // 02. Missing Authorization header rejected
  await runTest(2, "Missing Authorization header rejected (401)", async () => {
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me");
    const res = await getProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 03. Malformed Authorization header rejected
  await runTest(3, "Malformed Authorization header rejected (401)", async () => {
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Token ${tokenA}`);
    const res = await getProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 04. Invalid JWT rejected
  await runTest(4, "Invalid JWT rejected (401)", async () => {
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me", "Bearer not.a.valid.jwt");
    const res = await getProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 05. Expired JWT rejected
  await runTest(5, "Expired JWT rejected (401)", async () => {
    const expiredToken = signJwt(
      { sub: userA.id, email: userA.email, role: userA.role },
      { expiresIn: "-5s" }
    );
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Bearer ${expiredToken}`);
    const res = await getProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 06. Tampered JWT rejected
  await runTest(6, "Tampered JWT rejected (401)", async () => {
    const tampered = tokenA.substring(0, tokenA.length - 8) + "ABCDEF12";
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Bearer ${tampered}`);
    const res = await getProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 07. Nonexistent authenticated user rejected safely
  await runTest(7, "Nonexistent user token rejected safely (401)", async () => {
    const nonexistentToken = signJwt({
      sub: "nonexistent_cuid_123456789",
      email: "ghost@example.com",
      role: "BUYER",
    });
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Bearer ${nonexistentToken}`);
    const res = await getProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  console.log("\n--- UPDATE PROFILE TESTS (08 - 25) ---");

  // 08. Authenticated user updates own name
  await runTest(8, "Authenticated user updates own name (200)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Alpha Updated Name" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.success === true &&
      data.data?.user?.fullName === "Alpha Updated Name";
    return { passed, details: `Status: ${res.status}, Updated Name: ${data.data?.user?.fullName}` };
  });

  // 09. Updated data persists in PostgreSQL
  await runTest(9, "Updated data persists in PostgreSQL", async () => {
    const dbUser = await prisma.user.findUnique({ where: { id: userA.id } });
    const passed = dbUser?.fullName === "Alpha Updated Name";
    return { passed, details: `DB Name: ${dbUser?.fullName}` };
  });

  // 10. Missing authentication rejected on PATCH
  await runTest(10, "Missing authentication rejected on PATCH (401)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Hacker Name" })
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}, Code: ${data.error?.code}` };
  });

  // 11. Invalid JWT rejected on PATCH
  await runTest(11, "Invalid JWT rejected on PATCH (401)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Hacker Name" }),
      "Bearer bad.token"
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 12. Expired JWT rejected on PATCH
  await runTest(12, "Expired JWT rejected on PATCH (401)", async () => {
    const expiredToken = signJwt(
      { sub: userA.id, email: userA.email, role: userA.role },
      { expiresIn: "-10s" }
    );
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Hacker Name" }),
      `Bearer ${expiredToken}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 401 && data.error?.code === "UNAUTHORIZED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 13. Invalid fullName type rejected
  await runTest(13, "Invalid fullName type rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: 12345 }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Message: ${data.error?.message}` };
  });

  // 14. Empty fullName rejected
  await runTest(14, "Empty fullName rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "   " }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Message: ${data.error?.message}` };
  });

  // 15. Too-short fullName rejected (min 2 chars)
  await runTest(15, "Too-short fullName rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "A" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Message: ${data.error?.message}` };
  });

  // 16. Excessively long fullName rejected (max 100 chars)
  await runTest(16, "Excessively long fullName rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "A".repeat(101) }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Message: ${data.error?.message}` };
  });

  // 17. Unexpected field rejected
  await runTest(17, "Unexpected field rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", randomField: "malicious_payload" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Rejected injection: ${data.error?.message}` };
  });

  // 18. Attempt to modify id rejected
  await runTest(18, "Attempt to modify id rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", id: "injected_id" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 19. Attempt to modify role rejected
  await runTest(19, "Attempt to modify role rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", role: "ADMIN" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Role escalation blocked` };
  });

  // 20. Attempt to modify passwordHash rejected
  await runTest(20, "Attempt to modify passwordHash rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", passwordHash: "hacked_hash" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 21. Attempt to modify isActive rejected
  await runTest(21, "Attempt to modify isActive rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", isActive: false }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 22. Attempt to modify isEmailVerified rejected
  await runTest(22, "Attempt to modify isEmailVerified rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", isEmailVerified: true }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 23. Attempt to modify createdAt rejected
  await runTest(23, "Attempt to modify createdAt rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", createdAt: new Date().toISOString() }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 24. Attempt to modify updatedAt rejected
  await runTest(24, "Attempt to modify updatedAt rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", updatedAt: new Date().toISOString() }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}` };
  });

  // 25. Attempt to modify email rejected
  await runTest(25, "Attempt to modify email rejected (400)", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Valid Name", email: "newemail@example.com" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 400 && data.error?.code === "VALIDATION_FAILED";
    return { passed, details: `Status: ${res.status}, Email alteration blocked` };
  });

  console.log("\n--- OWNERSHIP / IDOR PROTECTION TESTS (26 - 29) ---");

  // 26. User A can read User A profile
  await runTest(26, "User A can read User A profile", async () => {
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Bearer ${tokenA}`);
    const res = await getProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 200 && data.data?.user?.id === userA.id;
    return { passed, details: `User A verified: ${data.data?.user?.id}` };
  });

  // 27. User A can update User A profile
  await runTest(27, "User A can update User A profile", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "User Alpha Prime" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const passed = res.status === 200 && data.data?.user?.fullName === "User Alpha Prime";
    return { passed, details: `User A updated name: ${data.data?.user?.fullName}` };
  });

  // 28. User A cannot modify User B via payload injection
  await runTest(28, "User A cannot modify User B via payload injection (IDOR Protection)", async () => {
    // User A authenticates with tokenA, but attempts to specify User B's ID in payload
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Hacked Beta", userId: userB.id }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    // Payload rejected because userId is unexpected/forbidden
    const passed = res.status === 400;

    // Verify User B's database record is completely untouched!
    const dbUserB = await prisma.user.findUnique({ where: { id: userB.id } });
    const isBIntact = dbUserB?.fullName === "User Beta";

    return {
      passed: passed && isBIntact,
      details: `Request rejected: ${passed}, User B untouched in DB: ${isBIntact}`,
    };
  });

  // 29. User A cannot access another user's profile through ID manipulation
  await runTest(29, "GET /users/me strictly binds to token subject (Zero cross-user access)", async () => {
    // Both users query /users/me independently with their respective tokens
    const reqA = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Bearer ${tokenA}`);
    const resA = await getProfileHandler(reqA);
    const dataA = await resA.json();

    const reqB = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Bearer ${tokenB}`);
    const resB = await getProfileHandler(reqB);
    const dataB = await resB.json();

    const passed =
      dataA.data?.user?.id === userA.id &&
      dataB.data?.user?.id === userB.id &&
      dataA.data?.user?.id !== dataB.data?.user?.id;

    return {
      passed,
      details: `Token A resolved User A (${dataA.data?.user?.id}), Token B resolved User B (${dataB.data?.user?.id})`,
    };
  });

  console.log("\n--- RESPONSE SECURITY TESTS (30 - 32) ---");

  // 30. GET response does not expose passwordHash
  await runTest(30, "GET response does NOT expose password or passwordHash", async () => {
    const req = createMockGetRequest("http://localhost:3000/api/v1/users/me", `Bearer ${tokenA}`);
    const res = await getProfileHandler(req);
    const data = await res.json();
    const rawJson = JSON.stringify(data);
    const hasPassword = rawJson.includes("password") || rawJson.includes("passwordHash");
    const passed = !hasPassword;
    return { passed, details: `Zero credential leakage in GET response: ${passed}` };
  });

  // 31. UPDATE response does not expose passwordHash
  await runTest(31, "PATCH response does NOT expose password or passwordHash", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      JSON.stringify({ fullName: "Clean User" }),
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const rawJson = JSON.stringify(data);
    const hasPassword = rawJson.includes("password") || rawJson.includes("passwordHash");
    const passed = !hasPassword;
    return { passed, details: `Zero credential leakage in PATCH response: ${passed}` };
  });

  // 32. Responses do not expose database internals
  await runTest(32, "Error responses do NOT leak database internals or SQL stack traces", async () => {
    const req = createMockPatchRequest(
      "http://localhost:3000/api/v1/users/me",
      "{ invalid json payload ",
      `Bearer ${tokenA}`
    );
    const res = await updateProfileHandler(req);
    const data = await res.json();
    const rawJson = JSON.stringify(data);
    const leaksInternals =
      rawJson.includes("prisma") ||
      rawJson.includes("PostgreSQL") ||
      rawJson.includes("SELECT") ||
      rawJson.includes("stack");
    const passed = !leaksInternals && res.status === 400;
    return { passed, details: `Clean sanitized error output: ${passed}` };
  });

  // Section 11: Direct Database Verification
  console.log("\n--- Section 11: Database Integrity Verification ---");
  const finalUserA = await prisma.user.findUnique({ where: { id: userA.id } });
  const finalUserB = await prisma.user.findUnique({ where: { id: userB.id } });

  if (!finalUserA || !finalUserB) {
    throw new Error("Database verification failed: users missing!");
  }

  const isUserANameUpdated = finalUserA.fullName === "Clean User";
  const isUserAEmailUnchanged = finalUserA.email === userA.email;
  const isUserARoleUnchanged = finalUserA.role === "BUYER";
  const isUserAPasswordUntouched = finalUserA.passwordHash === passwordHash;

  const isUserBCompletelyUntouched =
    finalUserB.fullName === "User Beta" &&
    finalUserB.email === userB.email &&
    finalUserB.role === "BUYER" &&
    finalUserB.passwordHash === passwordHash &&
    finalUserB.isActive === true;

  console.log(`Database verification:
  - User A name updated correctly in PostgreSQL: ${isUserANameUpdated}
  - User A email untouched: ${isUserAEmailUnchanged}
  - User A role untouched: ${isUserARoleUnchanged}
  - User A password hash untouched: ${isUserAPasswordUntouched}
  - User B completely untouched by User A operations: ${isUserBCompletelyUntouched}`);

  if (
    !isUserANameUpdated ||
    !isUserAEmailUnchanged ||
    !isUserARoleUnchanged ||
    !isUserAPasswordUntouched ||
    !isUserBCompletelyUntouched
  ) {
    throw new Error("Database integrity assertion failed!");
  }

  // Cleanup test users
  await prisma.user.deleteMany({
    where: {
      id: { in: [userA.id, userB.id] },
    },
  });

  console.log("\n=================================================================");
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
  console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? "ALL 32 TESTS PASSED" : "TEST FAILURES DETECTED"}`);
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
