import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { provisionOrderEntitlements } from "@/lib/services/entitlement";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    orderId: string;
  };
}

const optionalBodySchema = z
  .object({
    productId: z.string().trim().min(1).optional(),
    orderId: z.string().trim().min(1).optional(),
  })
  .strict();

/**
 * POST /api/v1/buyer/orders/[orderId]/provision
 *
 * Post-payment entitlement provisioning for a verified order.
 *
 * Invariants:
 *   - Authenticated user must own the order (Order.buyerId === User.id).
 *   - Order must be in status PAID.
 *   - Payment must be in status CAPTURED.
 *   - Product derived strictly from OrderItem.
 *   - Replay is safe and idempotent.
 *   - Concurrency safe against duplicate entitlement creation.
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
    const authUser = auth.user;

    const { orderId } = params;
    if (!orderId || !orderId.startsWith("ORD-")) {
      return apiError("VALIDATION_FAILED", "Invalid order ID format", 400);
    }

    // Parse optional body if provided
    let requestedProductId: string | undefined;
    const contentType = req.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const rawBody = await req.json();
        const parsed = optionalBodySchema.safeParse(rawBody);
        if (!parsed.success) {
          return apiError(
            "VALIDATION_FAILED",
            "Invalid provisioning payload. Injected fields are not permitted.",
            400,
            parsed.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            }))
          );
        }
        if (parsed.data.orderId && parsed.data.orderId !== orderId) {
          return apiError(
            "ORDER_MISMATCH",
            "Payload orderId does not match URL orderId parameter",
            400
          );
        }
        requestedProductId = parsed.data.productId;
      } catch {
        return apiError("VALIDATION_FAILED", "Malformed JSON body", 400);
      }
    }

    const result = await provisionOrderEntitlements({
      orderId,
      authenticatedUserId: authUser.id,
      requestedProductId,
      isAdmin: authUser.role === "ADMIN",
    });

    if (!result.success) {
      return apiError(
        result.code || "PROVISIONING_FAILED",
        result.error || "Failed to provision entitlements",
        result.status || 400
      );
    }

    const message = result.alreadyProvisioned
      ? "Entitlements already provisioned for this order."
      : "Entitlements provisioned successfully.";

    return apiSuccess(
      {
        orderId: result.orderId,
        entitlements: result.entitlements,
        alreadyProvisioned: result.alreadyProvisioned ?? false,
      },
      message,
      200
    );
  } catch (error) {
    console.error("[PROVISION_ORDER_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred during entitlement provisioning",
      500
    );
  }
}
