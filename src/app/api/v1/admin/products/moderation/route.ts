import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/products/moderation
 *
 * Lists all products in the moderation queue awaiting admin review (status: PENDING_REVIEW).
 * Protected: requires ADMIN role.
 *
 * Security:
 *   - Verifies JWT and confirms ADMIN role in PostgreSQL.
 *   - Strips storage keys, filesystem paths, seller bank/PAN details, and passwords.
 *   - Only returns metadata required for review.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError(
          "UNAUTHORIZED",
          "Authentication required to access admin resources",
          401
        );
      }
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to access product moderation",
        403
      );
    }

    const pendingProducts = await prisma.product.findMany({
      where: { status: "PENDING_REVIEW" },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        description: true,
        productType: true,
        pricePaise: true,
        discountPricePaise: true,
        isFree: true,
        licenseType: true,
        licenseTerms: true,
        version: true,
        tags: true,
        fileFormats: true,
        demoUrl: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
            logoUrl: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        files: {
          select: {
            id: true,
            originalFilename: true,
            fileSize: true,
            mimeType: true,
            version: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Serialize BigInt file sizes safely for JSON response
    const sanitizedProducts = pendingProducts.map((p) => ({
      ...p,
      files: p.files.map((f) => {
        const { fileSize, ...rest } = f;
        return {
          ...rest,
          fileSizeBytes: Number(fileSize),
        };
      }),
    }));

    return apiSuccess(
      { products: sanitizedProducts },
      "Pending products retrieved successfully for moderation",
      200,
      { total: sanitizedProducts.length }
    );
  } catch (error) {
    console.error("[ADMIN_MODERATION_LIST_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while fetching products for moderation",
      500
    );
  }
}
