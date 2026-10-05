import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { toggleUserStatus } from "@/lib/services/admin-dashboard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/v1/admin/users/[id]
 *
 * Updates user account state (activate / deactivate).
 * Protected: requires ADMIN role.
 * Invariant: Self-deactivation forbidden. Password manipulation forbidden.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
        "Administrative privileges are required to update user status",
        403
      );
    }

    const { id } = params;
    if (!id) {
      return apiError("INVALID_USER_ID", "User ID is required", 400);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body", 400);
    }

    if (body.isActive === undefined || typeof body.isActive !== "boolean") {
      return apiError("VALIDATION_FAILED", "Field 'isActive' must be a boolean", 400);
    }

    const result = await toggleUserStatus(auth.user.id, id, body.isActive);
    if (!result.success || !result.user) {
      return apiError(
        result.code || "UPDATE_FAILED",
        result.error || "Failed to update user status",
        result.status || 400
      );
    }

    return apiSuccess({ user: result.user, ...result.user }, "User status updated successfully", 200);
  } catch (error) {
    console.error("[ADMIN_USER_PATCH_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to update user status",
      500
    );
  }
}
