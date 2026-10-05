import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/products/:productId
 *
 * Inspects a product's full review details and associated file metadata.
 * Protected: requires ADMIN role.
 *
 * Security:
 *   - Verifies JWT and confirms ADMIN role in PostgreSQL.
 *   - Strips storage keys, filesystem paths, seller bank/PAN details, and passwords.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
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
        "Administrative privileges are required to access product moderation details",
        403
      );
    }

    const { productId } = params;
    if (!productId || typeof productId !== "string") {
      return apiError("INVALID_PARAM", "Invalid product ID parameter", 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
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
    });

    if (!product) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    const sanitizedProduct = {
      ...product,
      files: product.files.map((f) => {
        const { fileSize, ...rest } = f;
        return {
          ...rest,
          fileSizeBytes: Number(fileSize),
        };
      }),
    };

    return apiSuccess(
      { product: sanitizedProduct },
      "Product details retrieved successfully for admin review",
      200
    );
  } catch (error) {
    console.error("[ADMIN_PRODUCT_DETAIL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while fetching product details",
      500
    );
  }
}
