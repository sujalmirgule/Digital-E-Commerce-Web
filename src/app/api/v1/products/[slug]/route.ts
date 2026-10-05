import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { productIdentifierSchema } from "@/lib/validations/product";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products/:slug
 *
 * Public product detail endpoint. Supports lookup by product slug or product ID.
 *
 * Security & Isolation:
 *   - Strictly enforces status = 'PUBLISHED'.
 *   - Unpublished products (DRAFT, PENDING_REVIEW, REJECTED, ARCHIVED) return 404 Not Found.
 *   - Does not reveal whether an unpublished product exists or not (anti-enumeration).
 *   - Never exposes private ProductFile records, storageKey, or filesystem paths.
 *   - Never exposes seller internal user ID, email, PAN, bank accounts, or financial metrics.
 *   - Buy Now entry point exposes placeholder checkout entry link without performing transactions.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const rawIdentifier = params.slug;

    // 1. Validate identifier format
    const validationResult = productIdentifierSchema.safeParse(rawIdentifier);
    if (!validationResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid product identifier format",
        400,
        validationResult.error.errors.map((e) => ({
          field: "identifier",
          message: e.message,
        }))
      );
    }

    const identifier = validationResult.data;

    // 2. Query published product by slug or id
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: identifier },
          { slug: identifier },
        ],
        status: "PUBLISHED",
      },
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
        requirements: true,
        fileFormats: true,
        demoUrl: true,
        ratingAvg: true,
        reviewsCount: true,
        salesCount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
          },
        },
        seller: {
          select: {
            storeName: true,
            storeSlug: true,
            bio: true,
            description: true,
            logoUrl: true,
            bannerUrl: true,
            country: true,
            websiteUrl: true,
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            url: true,
            altText: true,
            displayOrder: true,
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    // 3. Return 404 for nonexistent or unpublished products
    if (!product) {
      return apiError("NOT_FOUND", "Product not found", 404);
    }

    // 4. Construct safe public DTO
    const thumbnailUrl =
      product.media.find((m) => m.type === "THUMBNAIL")?.url ||
      product.media[0]?.url ||
      null;

    const publicProduct = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      productType: product.productType,
      pricePaise: product.pricePaise,
      discountPricePaise: product.discountPricePaise,
      isFree: product.isFree,
      licenseType: product.licenseType,
      licenseTerms: product.licenseTerms,
      version: product.version,
      tags: product.tags,
      requirements: product.requirements,
      fileFormats: product.fileFormats,
      demoUrl: product.demoUrl,
      ratingAvg: Number(product.ratingAvg),
      reviewsCount: product.reviewsCount,
      status: product.status,
      thumbnailUrl,
      media: product.media,
      category: product.category,
      seller: product.seller,
      buyNow: {
        enabled: true,
        productId: product.id,
        checkoutUrl: `/checkout/${product.id}`,
      },
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    return apiSuccess(
      {
        product: publicProduct,
        ...publicProduct,
      },
      "Product details retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[PUBLIC_PRODUCT_DETAIL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while fetching product details",
      500
    );
  }
}
