import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBuyerOverview } from "@/lib/services/buyer-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/buyer/dashboard/overview
 *
 * Provides aggregated, authoritative metrics and recent activity for the buyer's central dashboard.
 * Requires an authenticated, active buyer session.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    if (!auth.user.isActive) {
      return apiError(
        "ACCOUNT_SUSPENDED",
        "Your account is inactive. Please contact support.",
        403
      );
    }

    const overview = await getBuyerOverview(auth.user.id);

    return apiSuccess(overview, "Buyer dashboard overview retrieved successfully", 200);
  } catch (error) {
    console.error("[BUYER_DASHBOARD_OVERVIEW_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to load buyer dashboard overview",
      500
    );
  }
}
