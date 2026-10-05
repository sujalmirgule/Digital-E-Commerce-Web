import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminUsers } from "@/lib/services/admin-dashboard";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/users
 *
 * Lists all registered users on the platform.
 * Protected: requires ADMIN role.
 * Security: NEVER returns passwordHash, reset tokens, or secret credentials.
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
        "Administrative privileges are required to access users register",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || searchParams.get("q") || undefined;
    const roleParam = searchParams.get("role") as UserRole | null;
    const isActiveParam = searchParams.get("isActive");

    const validRoles: UserRole[] = ["BUYER", "ADMIN"];
    if (roleParam && !validRoles.includes(roleParam)) {
      return apiSuccess(
        {
          users: [],
          pagination: {
            page: isNaN(page) ? 1 : page,
            limit: isNaN(limit) ? 20 : limit,
            total: 0,
            totalPages: 0,
          },
        },
        "Users register retrieved successfully",
        200
      );
    }
    const role = roleParam && validRoles.includes(roleParam) ? roleParam : undefined;

    let isActive: boolean | undefined = undefined;
    if (isActiveParam === "true") isActive = true;
    if (isActiveParam === "false") isActive = false;

    const data = await getAdminUsers({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      role,
      isActive,
      search,
    });

    return apiSuccess(data, "Users register retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_USERS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve users register",
      500
    );
  }
}
