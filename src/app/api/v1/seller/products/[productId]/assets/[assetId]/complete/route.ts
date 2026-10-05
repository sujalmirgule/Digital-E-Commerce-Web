import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getStorageProvider } from "@/lib/storage/local-storage-provider";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/seller/products/:productId/assets/:assetId/complete
 *
 * Step 2 of the two-step upload flow — Upload Completion Verification.
 *
 * The client calls this AFTER performing the PUT to the uploadUrl.
 * The server VERIFIES the object actually exists in storage before confirming.
 *
 * SECURITY:
 *   - Re-validates full ownership chain: JWT → User → SellerProfile → Product → Asset.
 *   - The server does NOT trust the client's claim that the upload succeeded.
 *   - Storage existence is verified independently.
 *   - Product remains DRAFT — this endpoint does NOT publish the product.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string; assetId: string } }
) {
  try {
    // ── 1. Authentication ────────────────────────────────────────────────────
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required", 401);
      }
      return apiError("FORBIDDEN", "Only approved sellers can complete uploads", 403);
    }

    // ── 2. Params ────────────────────────────────────────────────────────────
    const { productId, assetId } = params;
    if (!productId || !assetId) {
      return apiError("INVALID_PARAM", "Invalid product or asset ID parameter", 400);
    }

    // ── 3. Product ownership (IDOR) ─────────────────────────────────────────
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true, status: true, title: true },
    });

    if (!product) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    if (product.sellerId !== authSeller.sellerProfileId) {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to complete uploads for this product",
        403
      );
    }

    if (product.status !== "DRAFT") {
      return apiError(
        "PRODUCT_NOT_DRAFT",
        `Upload completion is only valid for DRAFT products. Current status: ${product.status}`,
        409
      );
    }

    // ── 4. Asset record must exist and belong to this product ────────────────
    const asset = await prisma.productFile.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        productId: true,
        storageKey: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!asset) {
      return apiError("ASSET_NOT_FOUND", "Asset record not found", 404);
    }

    if (asset.productId !== product.id) {
      return apiError(
        "ASSET_PRODUCT_MISMATCH",
        "Asset does not belong to this product",
        403
      );
    }

    // ── 5. Verify the object actually exists in storage ──────────────────────
    // We do NOT trust the client's claim. We verify independently.
    const storage = getStorageProvider();
    const objectExists = await storage.objectExists(asset.storageKey);

    if (!objectExists) {
      return apiError(
        "UPLOAD_NOT_FOUND",
        "Upload could not be verified. The file was not found in storage. Please re-initialize and retry the upload.",
        422
      );
    }

    // ── 6. Optionally verify actual file size ────────────────────────────────
    const metadata = await storage.getObjectMetadata(asset.storageKey);
    const confirmedSizeBytes = metadata?.sizeBytes ?? Number(asset.fileSize);

    // ── 7. Product remains DRAFT — we only update asset fields ───────────────
    // No status change on the Product model.
    const confirmedAsset = await prisma.productFile.update({
      where: { id: asset.id },
      data: {
        // Update fileSize with actual confirmed size from storage if available
        fileSize: BigInt(confirmedSizeBytes),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        productId: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
        storageKey: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Verify product still DRAFT (sanity check — should not change in this flow)
    const productAfter = await prisma.product.findUnique({
      where: { id: product.id },
      select: { status: true },
    });

    return apiSuccess(
      {
        asset: {
          id: confirmedAsset.id,
          productId: confirmedAsset.productId,
          originalFilename: confirmedAsset.originalFilename,
          mimeType: confirmedAsset.mimeType,
          fileSizeBytes: Number(confirmedAsset.fileSize),
          version: confirmedAsset.version,
          uploadVerified: true,
          createdAt: confirmedAsset.createdAt,
          updatedAt: confirmedAsset.updatedAt,
        },
        product: {
          id: product.id,
          title: product.title,
          status: productAfter?.status ?? product.status,
        },
      },
      "Upload verified and asset metadata confirmed. Product remains in DRAFT status.",
      200
    );
  } catch (error) {
    console.error("[UPLOAD_COMPLETE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while completing the upload",
      500
    );
  }
}
