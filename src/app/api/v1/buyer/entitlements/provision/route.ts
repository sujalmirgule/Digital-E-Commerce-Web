import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { provisionOrderEntitlements } from "@/lib/services/entitlement";
import { provisionEntitlementSchema } from "@/lib/validations/entitlement";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/buyer/entitlements/provision
 *
 * Direct body-driven post-payment entitlement provisioning.
 * Accepts: { orderId: string, productId?: string }
 */
export async function POST(req: NextRequest) {
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

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid JSON format in request body",
        400
      );
    }

    const parseResult = provisionEntitlementSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid entitlement provisioning payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const { orderId, productId } = parseResult.data;

    const result = await provisionOrderEntitlements({
      orderId,
      authenticatedUserId: authUser.id,
      requestedProductId: productId,
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
    console.error("[BUYER_ENTITLEMENT_PROVISION_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred during entitlement provisioning",
      500
    );
  }
}
