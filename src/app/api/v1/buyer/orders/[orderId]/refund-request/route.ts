import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  requestRefund,
  getBuyerRefundRequest,
} from "@/lib/services/order-lifecycle";
import { requestRefundSchema } from "@/lib/validations/refund";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    orderId: string;
  };
}

/**
 * POST /api/v1/buyer/orders/[orderId]/refund-request
 *
 * Submits a formal refund request on a PAID order.
 * Transitions order status to REFUND_REQUESTED and queues for admin review.
 * Protected: requires authenticated buyer who owns the order.
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

    if (!auth.user.isActive) {
      return apiError(
        "ACCOUNT_SUSPENDED",
        "Your account is inactive. Please contact support.",
        403
      );
    }

    const { orderId } = params;
    if (!orderId) {
      return apiError("INVALID_ORDER_ID", "Order ID is required", 400);
    }

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Invalid JSON payload in request body", 400);
    }

    const parseResult = requestRefundSchema.safeParse(bodyData);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid refund request payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const { reason } = parseResult.data;

    const result = await requestRefund({
      orderId,
      buyerId: auth.user.id,
      reason,
    });

    if (!result.success || !result.data) {
      return apiError(
        result.code || "REFUND_REQUEST_FAILED",
        result.error || "Failed to submit refund request",
        result.status || 400
      );
    }

    return apiSuccess(
      result.data,
      "Refund request submitted successfully. Our team will review your request.",
      201
    );
  } catch (error) {
    console.error("[BUYER_REFUND_REQUEST_POST_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to submit refund request",
      500
    );
  }
}

/**
 * GET /api/v1/buyer/orders/[orderId]/refund-request
 *
 * Retrieves the refund request status for a specific order owned by the buyer.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    const { orderId } = params;
    if (!orderId) {
      return apiError("INVALID_ORDER_ID", "Order ID is required", 400);
    }

    // Verify order ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        status: true,
        refundedAt: true,
        providerRefundId: true,
      },
    });

    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    if (order.buyerId !== auth.user.id && auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "You are not authorized to view refund details for this order",
        403
      );
    }

    const refundRequest = await getBuyerRefundRequest(orderId, order.buyerId);

    return apiSuccess(
      {
        orderId: order.id,
        orderStatus: order.status,
        refundedAt: order.refundedAt?.toISOString() || null,
        providerRefundId: order.providerRefundId,
        refundRequest: refundRequest
          ? {
              id: refundRequest.id,
              reason: refundRequest.reason,
              status: refundRequest.status,
              amountPaise: refundRequest.amountPaise,
              adminNotes: refundRequest.adminNotes,
              createdAt: refundRequest.createdAt.toISOString(),
              updatedAt: refundRequest.updatedAt.toISOString(),
            }
          : null,
      },
      "Refund request status retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[BUYER_REFUND_REQUEST_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve refund request details",
      500
    );
  }
}
