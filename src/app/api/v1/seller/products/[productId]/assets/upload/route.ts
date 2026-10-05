import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { uploadInitSchema, getMaxFileSizeBytes, sanitizeFilename } from "@/lib/validations/upload";
import { generateObjectKey } from "@/lib/storage/object-key";
import { getStorageProvider } from "@/lib/storage/local-storage-provider";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/seller/products/:productId/assets/upload
 *
 * Step 1 of the two-step upload flow.
 *
 * Validates:
 *   1. JWT authentication
 *   2. APPROVED seller status
 *   3. Product exists
 *   4. Product owned by authenticated seller (IDOR protection)
 *   5. Product is in DRAFT status
 *   6. File metadata (name, content-type, size)
 *
 * Returns:
 *   - uploadUrl   — where the client should PUT the raw file bytes
 *   - assetId     — the pending ProductFile record id
 *   - objectKey   — server-generated storage key (for reference only)
 *   - expiresAt   — when the upload authorization expires
 *
 * NEVER returns:
 *   - storage credentials
 *   - bucket names
 *   - filesystem paths
 *   - password hashes
 *   - JWT secrets
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    // ── 1. Authentication ────────────────────────────────────────────────────
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to upload product assets", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can upload product assets",
        403
      );
    }

    // ── 2. Product param ─────────────────────────────────────────────────────
    const { productId } = params;
    if (!productId || typeof productId !== "string") {
      return apiError("INVALID_PARAM", "Invalid product ID parameter", 400);
    }

    // ── 3. Product existence + ownership (IDOR protection) ──────────────────
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sellerId: true,
        title: true,
        status: true,
      },
    });

    if (!product) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // IDOR: verify the product belongs to the authenticated seller, not ANY other seller.
    if (product.sellerId !== authSeller.sellerProfileId) {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to upload assets to this product",
        403
      );
    }

    // ── 4. Product must be DRAFT ─────────────────────────────────────────────
    if (product.status !== "DRAFT") {
      return apiError(
        "PRODUCT_NOT_DRAFT",
        `Assets can only be uploaded to DRAFT products. Current status: ${product.status}`,
        409
      );
    }

    // ── 5. Parse + validate request body ────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body in request", 400);
    }

    if (!body || typeof body !== "object") {
      return apiError("INVALID_PAYLOAD", "Request body must be a valid JSON object", 400);
    }

    const validatedData = uploadInitSchema.parse(body);

    // ── 6. File size enforcement (server-side — do not rely on frontend) ─────
    const maxSizeBytes = getMaxFileSizeBytes();
    if (validatedData.fileSizeBytes > maxSizeBytes) {
      return apiError(
        "FILE_TOO_LARGE",
        `File size ${validatedData.fileSizeBytes} bytes exceeds the maximum allowed size of ${maxSizeBytes} bytes (${Math.round(maxSizeBytes / 1024 / 1024)} MB)`,
        413,
        [{ field: "fileSizeBytes", message: "File is too large" }]
      );
    }

    // ── 7. Check for existing asset on this product ──────────────────────────
    // Per architecture: replace is allowed for DRAFT products.
    // Re-validate ownership before touching the old asset.
    const existingFile = await prisma.productFile.findFirst({
      where: { productId: product.id },
      select: { id: true, storageKey: true },
    });

    // ── 8. Generate secure server-side object key ────────────────────────────
    // The client never controls any segment of this key.
    const objectKey = generateObjectKey(product.id, validatedData.fileName);

    // ── 9. Authorize upload with storage provider ───────────────────────────
    const storage = getStorageProvider();
    const authorization = await storage.authorizeUpload({
      objectKey,
      contentType: validatedData.contentType,
      fileSizeBytes: validatedData.fileSizeBytes,
      expiresInSeconds: 900, // 15 minutes
    });

    // ── 10. Create/update ProductFile record with PENDING status ─────────────
    const safeOriginalFilename = sanitizeFilename(validatedData.fileName);
    const normalizedContentType = validatedData.contentType.trim().toLowerCase().split(";")[0].trim();

    let assetRecord;
    if (existingFile) {
      // Replace: update existing record and schedule old object deletion.
      const oldKey = existingFile.storageKey;
      assetRecord = await prisma.productFile.update({
        where: { id: existingFile.id },
        data: {
          originalFilename: safeOriginalFilename,
          fileSize: BigInt(validatedData.fileSizeBytes),
          mimeType: normalizedContentType,
          storageKey: objectKey,
          version: "1.0.0",
          updatedAt: new Date(),
        },
        select: {
          id: true,
          productId: true,
          originalFilename: true,
          mimeType: true,
          storageKey: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Best-effort cleanup of old storage object (non-blocking)
      storage.deleteObject(oldKey).catch((err) => {
        console.warn("[STORAGE_CLEANUP_WARN] Failed to delete old object:", oldKey, err);
      });
    } else {
      // New asset record
      assetRecord = await prisma.productFile.create({
        data: {
          productId: product.id,
          originalFilename: safeOriginalFilename,
          fileSize: BigInt(validatedData.fileSizeBytes),
          mimeType: normalizedContentType,
          storageKey: objectKey,
          version: "1.0.0",
        },
        select: {
          id: true,
          productId: true,
          originalFilename: true,
          mimeType: true,
          storageKey: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // ── 11. Return minimal upload authorization — NEVER return credentials ───
    return apiSuccess(
      {
        assetId: assetRecord.id,
        uploadUrl: authorization.uploadUrl,
        objectKey: authorization.objectKey,
        provider: authorization.provider,
        expiresAt: authorization.expiresAt,
        // Include product context for frontend display only
        product: {
          id: product.id,
          title: product.title,
          status: product.status,
        },
      },
      "Upload authorization generated. Use the uploadUrl to PUT your file, then call the complete endpoint.",
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
        details[0]?.message || "File metadata validation failed",
        400,
        details
      );
    }

    console.error("[UPLOAD_INIT_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while initializing the upload",
      500
    );
  }
}
