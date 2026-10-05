import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminPayments } from "@/lib/services/admin-dashboard";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/payments
 *
 * Lists all payment transactions processed on the platform.
 * Protected: requires ADMIN role.
 * Security: Zero leakage of Razorpay API secrets, card CVVs, or database internals.
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

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to access payments register",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || searchParams.get("q") || undefined;
    const statusParam = searchParams.get("status");
    const methodParam = searchParams.get("method") as PaymentMethod | null;

    const validStatuses: string[] = [
      "PENDING",
      "AUTHORIZED",
      "CAPTURED",
      "FAILED",
      "REFUNDED",
    ];

    let status: PaymentStatus | undefined = undefined;
    if (statusParam) {
      if (statusParam === "COMPLETED") {
        status = "CAPTURED" as PaymentStatus;
      } else if (validStatuses.includes(statusParam)) {
        status = statusParam as PaymentStatus;
      } else {
        return apiSuccess(
          {
            payments: [],
            pagination: {
              page: isNaN(page) ? 1 : page,
              limit: isNaN(limit) ? 20 : limit,
              total: 0,
              totalPages: 0,
            },
          },
          "Payments register retrieved successfully",
          200
        );
      }
    }

    const validMethods: PaymentMethod[] = ["UPI", "CARD", "NETBANKING", "WALLET", "OTHER"];
    const method =
      methodParam && validMethods.includes(methodParam) ? methodParam : undefined;

    const data = await getAdminPayments({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      status,
      method,
      search,
    });

    return apiSuccess(data, "Payments register retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_PAYMENTS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve payments register",
      500
    );
  }
}
