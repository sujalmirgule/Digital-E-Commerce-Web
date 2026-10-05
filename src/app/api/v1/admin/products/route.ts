import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAdminProducts } from "@/lib/services/admin-dashboard";
import { ProductStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/products
 *
 * Lists all catalog products with status filtering, search, and metadata.
 * Protected: requires ADMIN role.
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
        "Administrative privileges are required to access products register",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || searchParams.get("q") || undefined;
    const statusParam = searchParams.get("status") as ProductStatus | null;

    const validStatuses: ProductStatus[] = [
      "DRAFT",
      "PENDING_REVIEW",
      "APPROVED",
      "PUBLISHED",
      "REJECTED",
      "ARCHIVED",
      "SUSPENDED",
    ];
    const status =
      statusParam && validStatuses.includes(statusParam) ? statusParam : undefined;

    const data = await getAdminProducts({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      status,
      search,
    });

    return apiSuccess(data, "Products register retrieved successfully", 200);
  } catch (error) {
    console.error("[ADMIN_PRODUCTS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve products register",
      500
    );
  }
}
