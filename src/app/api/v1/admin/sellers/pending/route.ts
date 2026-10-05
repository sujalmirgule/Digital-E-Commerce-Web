import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/sellers/pending
 * Lists all seller applications currently awaiting moderation (status === PENDING).
 * Protected: requires ADMIN role.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication required to access admin resources",
        401
      );
    }

    if (authUser.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to access this resource",
        403
      );
    }

    const pendingSellers = await prisma.sellerProfile.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        userId: true,
        storeName: true,
        storeSlug: true,
        bio: true,
        description: true,
        country: true,
        status: true,
        panNumberMasked: true,
        bankAccountLast4: true,
        bankIfsc: true,
        bankAccountHolder: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess(
      { sellers: pendingSellers },
      "Pending seller applications retrieved successfully",
      200,
      { total: pendingSellers.length }
    );
  } catch (error) {
    console.error("[ADMIN_PENDING_SELLERS_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while fetching pending seller applications",
      500
    );
  }
}
