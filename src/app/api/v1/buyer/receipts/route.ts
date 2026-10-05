import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBuyerReceiptsList } from "@/lib/services/buyer-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/buyer/receipts
 *
 * Retrieves all receipts issued for purchases made by the authenticated buyer.
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await getBuyerReceiptsList(auth.user.id, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
    });

    return apiSuccess(result, "Buyer receipts retrieved successfully", 200);
  } catch (error) {
    console.error("[BUYER_RECEIPTS_LIST_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve receipts list",
      500
    );
  }
}
