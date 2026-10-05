import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { adminRejectProductSchema } from "@/lib/validations/product";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ZodError } from "zod";
import { createNotification } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/products/:productId/reject
 *
 * Rejects a product awaiting review:
 * PENDING_REVIEW -> REJECTED
 *
 * Guards:
 *   1. Authenticated ADMIN user only.
 *   2. Self-rejection forbidden: admin cannot reject products from their own SellerProfile.
 *   3. Product must be in PENDING_REVIEW status.
 *   4. Rejection reason must be validated (5-1000 characters).
 *   5. Atomic conditional update prevents race conditions.
 *   6. Records an AuditLog entry.
 */
async function handleReject(
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
        "Administrative privileges are required to reject products",
        403
      );
    }

    const { productId } = params;
    if (!productId || typeof productId !== "string") {
      return apiError("INVALID_PARAM", "Invalid product ID parameter", 400);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body in request", 400);
    }

    if (!body || typeof body !== "object") {
      return apiError("INVALID_PAYLOAD", "Request body must be a valid JSON object", 400);
    }

    const validatedData = adminRejectProductSchema.parse(body);

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
      },
    });

    if (!product) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // Rule: Seller cannot reject their own product even if they possess admin role
    if (product.seller.userId === admin.id) {
      return apiError(
        "SELF_REJECTION_FORBIDDEN",
        "An administrator cannot reject their own product",
        403
      );
    }

    // State transition guards
    if (product.status === "REJECTED") {
      return apiError(
        "ALREADY_REJECTED",
        "This product is already rejected",
        400
      );
    }

    if (product.status !== "PENDING_REVIEW") {
      return apiError(
        "INVALID_STATUS_TRANSITION",
        `Cannot reject product with status '${product.status}'. Only PENDING_REVIEW products can be rejected.`,
        400
      );
    }

    // Atomic conditional update inside transaction to prevent race conditions
    let updatedProduct;
    try {
      updatedProduct = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            status: "PENDING_REVIEW",
          },
          data: {
            status: "REJECTED",
            rejectionReason: validatedData.rejectionReason.trim(),
            updatedAt: new Date(),
          },
        });

        if (updateResult.count === 0) {
          throw new Error("CONCURRENT_STATUS_CHANGE");
        }

        await tx.auditLog.create({
          data: {
            adminId: admin.id,
            action: "REJECT_PRODUCT",
            targetEntity: "Product",
            targetId: product.id,
            metadata: {
              previousStatus: "PENDING_REVIEW",
              newStatus: "REJECTED",
              productTitle: product.title,
              rejectionReason: validatedData.rejectionReason.trim(),
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

    // Notify seller their product was rejected (async, non-blocking, idempotent)
    createNotification({
      userId: product.seller.userId,
      type: "PRODUCT_REJECTED",
      title: "Product Requires Revision",
      message: `Your product '${product.title}' was not approved. Reason: ${validatedData.rejectionReason.trim()}`,
      linkUrl: "/seller/products",
      dedupKey: `product_rejected_${product.id}`,
    }).catch((err) => console.error("[PRODUCT_REJECTION_NOTIFICATION_ERROR]", err));

    return apiSuccess(
      { product: updatedProduct },
      `Product '${updatedProduct?.title}' has been rejected`,
      200
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return apiError(
        "VALIDATION_FAILED",
        details[0]?.message || "Validation failed for rejection reason",
        400,
        details
      );
    }

    console.error("[ADMIN_REJECT_PRODUCT_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while rejecting the product",
      500
    );
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: { productId: string } }
) {
  return handleReject(req, ctx);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { productId: string } }
) {
  return handleReject(req, ctx);
}
