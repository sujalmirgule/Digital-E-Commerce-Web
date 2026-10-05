import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { getStorageProvider } from "@/lib/storage/local-storage-provider";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/products/:productId/approve
 *
 * Approves a product awaiting review and immediately publishes it:
 * PENDING_REVIEW -> PUBLISHED
 *
 * Guards:
 *   1. Authenticated ADMIN user only.
 *   2. Self-approval forbidden: admin cannot approve products from their own SellerProfile.
 *   3. Product must be in PENDING_REVIEW status.
 *   4. Digital file asset must exist and be verified in storage.
 *   5. Atomic conditional update prevents race conditions (concurrent approve/reject).
 *   6. Records an AuditLog entry.
 */
async function handleApprove(
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
          "Authentication required to perform admin actions",
          401
        );
      }
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to approve products",
        403
      );
    }

    const { productId } = params;
    if (!productId || typeof productId !== "string") {
      return apiError("INVALID_PARAM", "Invalid product ID parameter", 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: {
            id: true,
            userId: true,
            storeName: true,
          },
        },
        files: {
          select: {
            id: true,
            storageKey: true,
            fileSize: true,
          },
        },
      },
    });

    if (!product) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Rule: Seller cannot approve their own product even if they possess admin role
    if (product.seller.userId === admin.id) {
      return apiError(
        "SELF_APPROVAL_FORBIDDEN",
        "An administrator cannot approve their own product",
        403
      );
    }

    // State transition guards
    if (product.status === "PUBLISHED") {
      return apiError(
        "ALREADY_APPROVED",
        "This product is already approved and published",
        400
      );
    }

    if (product.status !== "PENDING_REVIEW") {
      return apiError(
        "INVALID_STATUS_TRANSITION",
        `Cannot approve product with status '${product.status}'. Only PENDING_REVIEW products can be approved.`,
        400
      );
    }

    // Asset verification guard: must have verified digital asset
    if (!product.files || product.files.length === 0) {
      return apiError(
        "MISSING_DIGITAL_ASSET",
        "Cannot approve product: no digital files are associated with this product",
        400
      );
    }

    const storage = getStorageProvider();
    const assetExists = await storage.objectExists(product.files[0].storageKey);
    if (!assetExists) {
      return apiError(
        "UNCONFIRMED_DIGITAL_ASSET",
        "Cannot approve product: the associated digital file does not exist in storage",
        422
      );
    }

    // Atomic conditional update inside a transaction to prevent race conditions
    let updatedProduct;
    try {
      updatedProduct = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            status: "PENDING_REVIEW",
          },
          data: {
            status: "PUBLISHED",
            rejectionReason: null,
            updatedAt: new Date(),
          },
        });

        if (updateResult.count === 0) {
          throw new Error("CONCURRENT_STATUS_CHANGE");
        }

        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "APPROVE_PRODUCT",
            targetEntity: "Product",
            targetId: product.id,
            metadata: {
              previousStatus: "PENDING_REVIEW",
              newStatus: "PUBLISHED",
              productTitle: product.title,
            },
          },
        });

        return tx.product.findUnique({
          where: { id: product.id },
          select: {
            id: true,
            title: true,
            slug: true,
            shortDescription: true,
            productType: true,
            pricePaise: true,
            discountPricePaise: true,
            isFree: true,
            licenseType: true,
            version: true,
            tags: true,
            fileFormats: true,
            status: true,
            rejectionReason: true,
            sellerId: true,
            categoryId: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === "CONCURRENT_STATUS_CHANGE") {
        return apiError(
          "CONFLICT_STATUS_CHANGED",
          "The product status was modified concurrently by another operation",
          409
        );
      }
      throw err;
    }

    return apiSuccess(
      { product: updatedProduct },
      `Product '${updatedProduct?.title}' has been successfully approved and published`,
      200
    );
  } catch (error) {
    console.error("[ADMIN_APPROVE_PRODUCT_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while approving the product",
      500
    );
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: { productId: string } }
) {
  return handleApprove(req, ctx);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { productId: string } }
) {
  return handleApprove(req, ctx);
}
