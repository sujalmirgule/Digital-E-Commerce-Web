import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";
import { submitProductSchema } from "@/lib/validations/product";
import { getStorageProvider } from "@/lib/storage/local-storage-provider";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/seller/products/:productId/submit
 *
 * Submits a seller's DRAFT product for Admin Moderation (transitions to PENDING_REVIEW).
 *
 * Verifies:
 *   1. JWT is valid and user is active
 *   2. User possesses an APPROVED SellerProfile
 *   3. Product exists and is owned by the authenticated seller (IDOR protection)
 *   4. Product is currently in DRAFT status
 *   5. Product completeness:
 *      - Title, slug, short description, description are valid
 *      - Category exists and is active
 *      - Price is valid
 *      - At least one digital file asset exists in DB
 *      - Digital asset is verified physically in storage
 *   6. Strict payload checking (rejects any client attempts to choose status, sellerId, etc.)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    // ── 1. Authentication & Seller Authorization ─────────────────────────────
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError(
          "UNAUTHORIZED",
          "Authentication required to submit products for review",
          401
        );
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can submit products for review",
        403
      );
    }

    // ── 2. Product ID parameter ──────────────────────────────────────────────
    const { productId } = params;
    if (!productId || typeof productId !== "string") {
      return apiError("INVALID_PARAM", "Invalid product ID parameter", 400);
    }

    // ── 3. Parse optional body with strict schema (rejects injected fields) ──
    const contentType = req.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return apiError("INVALID_JSON", "Malformed JSON body in request", 400);
      }

      if (body && typeof body === "object") {
        submitProductSchema.parse(body);
      }
    }

    // ── 4. Product existence, relations, and ownership (IDOR check) ──────────
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { id: true, isActive: true } },
        files: {
          select: {
            id: true,
            storageKey: true,
            fileSize: true,
            mimeType: true,
            originalFilename: true,
          },
        },
      },
    });

    if (!product) {
      return apiError("PRODUCT_NOT_FOUND", "Product not found", 404);
    }

    // IDOR Protection: product must belong to authenticated seller
    if (product.sellerId !== authSeller.sellerProfileId) {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to submit this product for review",
        403
      );
    }

    // ── 5. State Transition Guard: Product MUST be DRAFT ─────────────────────
    if (product.status !== "DRAFT") {
      if (product.status === "PENDING_REVIEW") {
        return apiError(
          "ALREADY_SUBMITTED",
          "This product has already been submitted for review",
          409
        );
      }
      if (product.status === "PUBLISHED") {
        return apiError(
          "ALREADY_PUBLISHED",
          "This product is already published and cannot be submitted for review",
          409
        );
      }
      return apiError(
        "INVALID_STATUS_TRANSITION",
        `Only DRAFT products can be submitted for review. Current status: ${product.status}`,
        409
      );
    }

    // ── 6. Completeness Validation ───────────────────────────────────────────
    if (!product.title || product.title.trim().length < 5) {
      return apiError(
        "INCOMPLETE_PRODUCT",
        "Product title must be at least 5 characters long",
        400,
        [{ field: "title", message: "Title too short" }]
      );
    }

    if (!product.shortDescription || product.shortDescription.trim().length < 20) {
      return apiError(
        "INCOMPLETE_PRODUCT",
        "Product short description must be at least 20 characters long",
        400,
        [{ field: "shortDescription", message: "Short description too short" }]
      );
    }

    if (!product.description || product.description.trim().length < 50) {
      return apiError(
        "INCOMPLETE_PRODUCT",
        "Product full description must be at least 50 characters long",
        400,
        [{ field: "description", message: "Description too short" }]
      );
    }

    if (!product.category || !product.category.isActive) {
      return apiError(
        "INCOMPLETE_PRODUCT",
        "Product category is missing or inactive",
        400,
        [{ field: "categoryId", message: "Category unavailable" }]
      );
    }

    if (!product.isFree && product.pricePaise <= 0) {
      return apiError(
        "INVALID_PRICE",
        "Paid products must have a price greater than 0 paise",
        400,
        [{ field: "pricePaise", message: "Price must be greater than 0" }]
      );
    }

    // ── 7. Digital Asset Validation (must exist in DB and in storage) ─────────
    if (!product.files || product.files.length === 0) {
      return apiError(
        "MISSING_DIGITAL_ASSET",
        "Products must have at least one digital file uploaded before submitting for moderation",
        400,
        [{ field: "files", message: "No digital files associated with product" }]
      );
    }

    const primaryFile = product.files[0];
    const storage = getStorageProvider();
    const objectExists = await storage.objectExists(primaryFile.storageKey);

    if (!objectExists) {
      return apiError(
        "UNCONFIRMED_DIGITAL_ASSET",
        "The digital asset uploaded for this product could not be verified in storage. Please re-upload before submitting.",
        422,
        [{ field: "files", message: "File missing in storage" }]
      );
    }

    // ── 8. Atomic State Transition: DRAFT -> PENDING_REVIEW ──────────────────
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        status: "PENDING_REVIEW",
        rejectionReason: null,
        updatedAt: new Date(),
      },
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

    return apiSuccess(
      { product: updatedProduct },
      "Product submitted successfully for admin review",
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
        details[0]?.message || "Validation failed for submission data",
        400,
        details
      );
    }

    console.error("[SELLER_SUBMIT_PRODUCT_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while submitting the product for review",
      500
    );
  }
}
