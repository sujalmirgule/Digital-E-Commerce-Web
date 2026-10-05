import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { processOrderRefund } from "@/lib/services/order-lifecycle";
import { prisma } from "@/lib/prisma";
import { RefundStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/v1/admin/refunds/[id]/approve
 *
 * Approves a buyer's pending refund request by ID, executing the authoritative
 * provider refund and complete financial reversal.
 * Protected: requires ADMIN role.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
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
        "Administrative privileges are required to approve refunds",
        403
      );
    }

    const { id: requestId } = params;
    if (!requestId) {
      return apiError("INVALID_REQUEST_ID", "Refund request ID is required", 400);
    }

    const request = await prisma.refundRequest.findUnique({
      where: { id: requestId },
      include: { order: true },
    });

    if (!request) {
      return apiError("REQUEST_NOT_FOUND", "Refund request not found", 404);
    }

    if (request.status !== RefundStatus.PENDING) {
      return apiError(
        "REQUEST_NOT_PENDING",
        `Refund request is already in status '${request.status}'`,
        400
      );
    }

    let note: string | undefined;
    try {
      const rawText = await req.text();
      if (rawText.trim()) {
        const body = JSON.parse(rawText);
        if (body.note && typeof body.note === "string") {
          note = body.note;
        }
      }
    } catch {
      // Optional body
    }

    const result = await processOrderRefund({
      orderId: request.orderId,
      adminId: auth.user.id,
      reason: request.reason,
      note,
    });

    if (!result.success || !result.data) {
      return apiError(
        result.code || "REFUND_APPROVAL_FAILED",
        result.error || "Failed to execute refund",
        result.status || 500
      );
    }

    return apiSuccess(
      {
        requestId: request.id,
        ...result.data,
      },
      "Refund request approved and processed successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_REFUND_APPROVE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to approve refund request",
      500
    );
  }
}
