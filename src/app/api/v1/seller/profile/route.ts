import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/seller/profile
 *
 * Retrieves the authenticated seller's store profile, status, and account settings.
 */
export async function GET(req: NextRequest) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to view seller profile", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can view their seller profile",
        403
      );
    }

    const profile = await prisma.sellerProfile.findUnique({
      where: { id: authSeller.sellerProfileId },
      select: {
        id: true,
        storeName: true,
        storeSlug: true,
        status: true,
        country: true,
        totalRevenuePaise: true,
        netEarningsPaise: true,
        availableBalance: true,
        pendingBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return apiError("SELLER_PROFILE_NOT_FOUND", "Seller profile not found", 404);
    }

    return apiSuccess(
      {
        ...profile,
        totalRevenuePaise: Number(profile.totalRevenuePaise),
        netEarningsPaise: Number(profile.netEarningsPaise),
        availableBalance: Number(profile.availableBalance),
        pendingBalance: Number(profile.pendingBalance),
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      "Seller profile retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[SELLER_PROFILE_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve seller profile",
      500
    );
  }
}

/**
 * PATCH /api/v1/seller/profile
 *
 * Updates editable settings for the seller store profile.
 */
export async function PATCH(req: NextRequest) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to update seller profile", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can update their seller profile",
        403
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body", 400);
    }

    const { storeName } = body;
    if (storeName !== undefined && (typeof storeName !== "string" || storeName.trim().length < 2)) {
      return apiError("VALIDATION_FAILED", "Store name must be at least 2 characters", 400);
    }

    const updated = await prisma.sellerProfile.update({
      where: { id: authSeller.sellerProfileId },
      data: {
        ...(storeName && { storeName: storeName.trim() }),
      },
      select: {
        id: true,
        storeName: true,
        storeSlug: true,
        status: true,
        country: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      {
        ...updated,
        updatedAt: updated.updatedAt.toISOString(),
      },
      "Seller profile updated successfully",
      200
    );
  } catch (error) {
    console.error("[SELLER_PROFILE_PATCH_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to update seller profile",
      500
    );
  }
}
