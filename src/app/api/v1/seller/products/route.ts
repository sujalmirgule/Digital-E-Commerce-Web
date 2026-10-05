import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";
import { createProductSchema } from "@/lib/validations/product";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ZodError } from "zod";
import { ProductStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/seller/products
 * Creates a new DRAFT product for the authenticated APPROVED seller.
 * The seller is derived from the JWT — the client cannot supply sellerId.
 */
export async function POST(req: NextRequest) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      // Distinguish 401 vs 403 based on auth state
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError(
          "UNAUTHORIZED",
          "Authentication required to create products",
          401
        );
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can create products. Your account must have an approved seller profile.",
        403
      );
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

    const validatedData = createProductSchema.parse(body);

    // Verify the categoryId exists
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
      select: { id: true, isActive: true },
    });

    if (!category) {
      return apiError(
        "CATEGORY_NOT_FOUND",
        "The specified category does not exist",
        404,
        [{ field: "categoryId", message: "Category not found" }]
      );
    }

    if (!category.isActive) {
      return apiError(
        "CATEGORY_INACTIVE",
        "The specified category is not active",
        400,
        [{ field: "categoryId", message: "Category is not available for new products" }]
      );
    }

    // Generate a unique slug from the title
    const baseSlug = validatedData.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // Ensure slug uniqueness with a suffix
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const product = await prisma.product.create({
      data: {
        sellerId: authSeller.sellerProfileId,
        categoryId: validatedData.categoryId,
        title: validatedData.title.trim(),
        slug,
        shortDescription: validatedData.shortDescription.trim(),
        description: validatedData.description.trim(),
        productType: validatedData.productType,
        pricePaise: validatedData.pricePaise,
        discountPricePaise: validatedData.discountPricePaise ?? null,
        isFree: validatedData.isFree,
        licenseType: validatedData.licenseType,
        licenseTerms: validatedData.licenseTerms ?? null,
        version: validatedData.version,
        tags: validatedData.tags,
        fileFormats: validatedData.fileFormats,
        requirements: validatedData.requirements ?? null,
        demoUrl: validatedData.demoUrl ?? null,
        status: "DRAFT",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        productType: true,
        pricePaise: true,
        discountPricePaise: true,
        isFree: true,
        licenseType: true,
        version: true,
        tags: true,
        fileFormats: true,
        demoUrl: true,
        status: true,
        sellerId: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      { product },
      "Draft product created successfully",
      201
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return apiError(
        "VALIDATION_FAILED",
        details[0]?.message || "Validation failed for product data",
        400,
        details
      );
    }

    console.error("[CREATE_PRODUCT_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while creating the product",
      500
    );
  }
}

/**
 * GET /api/v1/seller/products
 *
 * Retrieves all products owned by the authenticated APPROVED seller.
 * Supports status filtering (DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED),
 * text search on title/slug, and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const authSeller = await getAuthenticatedSeller(req);
    if (!authSeller) {
      const hasAuth = req.headers.get("authorization");
      if (!hasAuth) {
        return apiError("UNAUTHORIZED", "Authentication required to view seller products", 401);
      }
      return apiError(
        "FORBIDDEN",
        "Only approved sellers can view their product inventory",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const statusParam = searchParams.get("status");
    const search = searchParams.get("search") || undefined;

    let status: ProductStatus | undefined;
    if (statusParam && Object.values(ProductStatus).includes(statusParam as ProductStatus)) {
      status = statusParam as ProductStatus;
    }

    const { getSellerProducts } = await import("@/lib/services/seller-dashboard");
    const result = await getSellerProducts(authSeller.sellerProfileId, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
      status,
      search,
    });

    return apiSuccess(result, "Seller products retrieved successfully", 200);
  } catch (error) {
    console.error("[SELLER_PRODUCTS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve seller products",
      500
    );
  }
}

