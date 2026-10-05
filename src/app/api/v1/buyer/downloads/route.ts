import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBuyerDownloadsList } from "@/lib/services/buyer-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/buyer/downloads
 *
 * Retrieves all digital assets currently accessible to the authenticated buyer for direct download.
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

    const downloads = await getBuyerDownloadsList(auth.user.id);

    return apiSuccess(downloads, "Buyer downloads list retrieved successfully", 200);
  } catch (error) {
    console.error("[BUYER_DOWNLOADS_LIST_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve downloads list",
      500
    );
  }
}
