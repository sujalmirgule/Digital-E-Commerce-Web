import { execSync } from "child_process";
import * as path from "path";

interface SuiteResult {
  suite: string;
  exitCode: number;
  passed: number;
  failed: number;
  skipped: number;
  outputSnippet?: string;
}

const testSuites = [
  "scripts/test-signup.ts",
  "scripts/test-login.ts",
  "scripts/test-profile.ts",
  "scripts/test-seller-onboarding.ts",
  "scripts/test-admin-seller.ts",
  "scripts/test-product-upload.ts",
  "scripts/test-product-moderation.ts",
  "scripts/test-product-catalog.ts",
  "scripts/test-checkout.ts",
  "scripts/test-payment-verification.ts",
  "scripts/test-entitlements-library.ts",
  "scripts/test-secure-download.ts",
  "scripts/test-seller-earnings.ts",
  "scripts/test-receipts.ts",
  "scripts/test-reviews.ts",
  "scripts/test-buyer-dashboard.ts",
  "scripts/test-seller-dashboard.ts",
  "scripts/test-admin-dashboard.ts",
  "scripts/test-notifications.ts",
  "scripts/test-refunds-lifecycle.ts",
  "scripts/test-advanced-search.ts",
  "scripts/test-production-hardening.ts",
  "scripts/test-final-production-audit.ts",
];

async function main() {
  console.log("=================================================================");
  console.log("    RUNNING ALL 23 TEST SUITES ACROSS MARKETPLACE FEATURES      ");
  console.log("=================================================================\n");

  const results: SuiteResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const suite of testSuites) {
    const suiteName = path.basename(suite, ".ts");
    process.stdout.write(`Executing ${suiteName}... `);

    try {
      const output = execSync(`npx tsx "${suite}"`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, NODE_ENV: "test", NODE_OPTIONS: "--max-old-space-size=4096" },
      });

      // Parse output for PASSED/FAILED/SKIPPED patterns
      let passed = 0;
      let failed = 0;
      let skipped = 0;

      // Pattern 1: PASSED: X \n FAILED: Y
      const passedMatch = output.match(/PASSED:\s*(\d+)/i) || output.match(/Passed Tests:\s*(\d+)/i) || output.match(/Passed:\s*(\d+)/i);
      const failedMatch = output.match(/FAILED:\s*(\d+)/i) || output.match(/Failed Tests:\s*(\d+)/i) || output.match(/Failed:\s*(\d+)/i);
      const skippedMatch = output.match(/SKIPPED:\s*(\d+)/i) || output.match(/Skipped Tests:\s*(\d+)/i) || output.match(/Skipped:\s*(\d+)/i);

      if (passedMatch) {
        passed = parseInt(passedMatch[1], 10);
      } else {
        // Count [PASS] or ✓
        const passChecks = (output.match(/\[PASS\]/g) || []).length + (output.match(/✓\s*\[TEST/g) || []).length;
        passed = passChecks > 0 ? passChecks : 1;
      }

      if (failedMatch) {
        failed = parseInt(failedMatch[1], 10);
      } else {
        const failChecks = (output.match(/\[FAIL\]/g) || []).length + (output.match(/✗\s*\[TEST/g) || []).length;
        failed = failChecks;
      }

      if (skippedMatch) {
        skipped = parseInt(skippedMatch[1], 10);
      }

      totalPassed += passed;
      totalFailed += failed;
      totalSkipped += skipped;

      results.push({
        suite: suiteName,
        exitCode: 0,
        passed,
        failed,
        skipped,
      });

      console.log(`PASS (${passed} passed, ${failed} failed)`);
    } catch (err: any) {
      const stderr = err.stderr ? err.stderr.toString() : "";
      const stdout = err.stdout ? err.stdout.toString() : "";
      console.log(`FAIL (Exit code ${err.status || 1})`);
      console.error(stdout.slice(-500) || stderr.slice(-500));

      results.push({
        suite: suiteName,
        exitCode: err.status || 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        outputSnippet: stderr.slice(-300) || stdout.slice(-300),
      });
      totalFailed += 1;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  console.log("\n=================================================================");
  console.log("                   TEST SUITE EXECUTION SUMMARY                  ");
  console.log("=================================================================");
  console.table(
    results.map((r) => ({
      Suite: r.suite,
      Status: r.exitCode === 0 && r.failed === 0 ? "PASSED" : "FAILED",
      Passed: r.passed,
      Failed: r.failed,
      Skipped: r.skipped,
    }))
  );

  console.log(`TOTAL PASSED:  ${totalPassed}`);
  console.log(`TOTAL FAILED:  ${totalFailed}`);
  console.log(`TOTAL SKIPPED: ${totalSkipped}`);
  console.log("=================================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
