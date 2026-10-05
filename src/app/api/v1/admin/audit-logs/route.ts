import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminAuditLogs } from "@/lib/services/admin-dashboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/audit-logs
 *
 * Lists all audit log records for administrative compliance.
 * Protected: requires ADMIN role.
 * Security: Logs never expose secrets or raw payment credentials.
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
        "Administrative privileges are required to access audit logs",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const action = searchParams.get("action") || undefined;
    const targetEntity = searchParams.get("targetEntity") || undefined;

    const data = await getAdminAuditLogs({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      action,
      targetEntity,
    });

    return apiSuccess(data, "Audit logs retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_AUDIT_LOGS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve audit logs",
      500
    );
  }
}
