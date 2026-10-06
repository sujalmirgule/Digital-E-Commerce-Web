import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminPaymentDetail } from "@/lib/services/admin-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/payments/:paymentId
 *
 * Retrieve full payment details including order, items, buyer, and receipt status.
 * Protected: requires ADMIN role.
 * Security: Zero leakage of Razorpay API secret, database credentials, JWT secrets, or passwords.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to inspect payment details",
        403
      );
    }

    const { paymentId } = params;
    if (!paymentId || typeof paymentId !== "string") {
      return apiError("INVALID_PARAM", "Invalid payment ID parameter", 400);
    }

    const data = await getAdminPaymentDetail(paymentId);
    if (!data) {
      return apiError("NOT_FOUND", `Payment transaction '${paymentId}' not found`, 404);
    }

    return apiSuccess(data, "Payment transaction details retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_PAYMENT_DETAIL_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve payment details",
      500
    );
  }
}
