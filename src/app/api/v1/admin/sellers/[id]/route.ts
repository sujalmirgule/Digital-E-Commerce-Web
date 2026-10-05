import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/sellers/[id]
 * Inspects a specific seller application.
 * Protected: requires ADMIN role.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    if (!id || typeof id !== "string") {
      return apiError("INVALID_ID", "Invalid seller profile ID", 400);
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        storeName: true,
        storeSlug: true,
        bio: true,
        description: true,
        country: true,
        status: true,
        rejectionReason: true,
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
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!seller) {
      return apiError("SELLER_NOT_FOUND", "Seller profile not found", 404);
    }

    return apiSuccess(
      { seller },
      "Seller profile retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_SELLER_DETAIL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while fetching seller details",
      500
    );
  }
}
