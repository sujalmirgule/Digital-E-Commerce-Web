import { NextRequest } from "next/server";
import { getAuthenticatedSeller } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getSellerProductDetail,
  updateSellerProduct,
  archiveSellerProduct,
} from "@/lib/services/seller-dashboard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    productId: string;
  };
}

/**
 * GET /api/v1/seller/products/[productId]
 *
 * Retrieves a single product owned by the authenticated APPROVED seller.
 * Enforces IDOR protection.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to view product", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can view their product inventory",
        403
      );
    }

    const { productId } = params;
    if (!productId) {
      return apiError("INVALID_PRODUCT_ID", "Product ID is required", 400);
    }

    const result = await getSellerProductDetail(authSeller.sellerProfileId, productId);
    if (!result.success || !result.product) {
      return apiError(
        result.code || "PRODUCT_FETCH_FAILED",
        result.error || "Failed to retrieve product details",
        result.status || 404
      );
    }

    return apiSuccess(result.product, "Product details retrieved successfully", 200);
  } catch (error) {
    console.error("[SELLER_PRODUCT_DETAIL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve product details",
      500
    );
  }
}

/**
 * PATCH /api/v1/seller/products/[productId]
 *
 * Updates an existing product owned by the authenticated APPROVED seller.
 * Enforces IDOR protection.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to update product", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can update products",
        403
      );
    }

    const { productId } = params;
    if (!productId) {
      return apiError("INVALID_PRODUCT_ID", "Product ID is required", 400);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body", 400);
    }

    const result = await updateSellerProduct(authSeller.sellerProfileId, productId, body);
    if (!result.success || !result.product) {
      return apiError(
        result.code || "PRODUCT_UPDATE_FAILED",
        result.error || "Failed to update product",
        result.status || 400
      );
    }

    return apiSuccess(result.product, "Product updated successfully", 200);
  } catch (error) {
    console.error("[SELLER_PRODUCT_UPDATE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to update product",
      500
    );
  }
}

/**
 * DELETE /api/v1/seller/products/[productId]
 *
 * Safely archives a product owned by the authenticated APPROVED seller.
 * Enforces IDOR protection: seller can only archive their own products.
 * Preserves all historical transaction and order records.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to delete product", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can delete products",
        403
      );
    }

    const { productId } = params;
    if (!productId) {
      return apiError("INVALID_PRODUCT_ID", "Product ID is required", 400);
    }

    const result = await archiveSellerProduct(authSeller.sellerProfileId, productId);
    if (!result.success || !result.product) {
      return apiError(
        result.code || "PRODUCT_ARCHIVE_FAILED",
        result.error || "Failed to delete product",
        result.status || 400
      );
    }

    return apiSuccess(
      result.product,
      "Product archived and removed from active marketplace listings successfully",
      200
    );
  } catch (error) {
    console.error("[SELLER_PRODUCT_DELETE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to delete product",
      500
    );
  }
}

