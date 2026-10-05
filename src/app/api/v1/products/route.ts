import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { catalogQuerySchema } from "@/lib/validations/product";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products
 *
 * Public marketplace product catalog with pagination, category filtering,
 * price filtering, search, and allowlisted sorting.
 *
 * Security & Isolation:
 *   - Strictly enforces status = 'PUBLISHED'.
 *   - Never returns DRAFT, PENDING_REVIEW, REJECTED, or ARCHIVED products.
 *   - Never queries or exposes private ProductFile or storageKey.
 *   - Never exposes seller KYC, bank, financial, or authentication details.
 *   - Enforces strict query validation to reject arbitrary/malicious parameters.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Extract query parameters
    const searchParams = req.nextUrl.searchParams;
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    // 2. Validate with strict schema
    const parseResult = catalogQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid catalog query parameters",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const {
      page,
      limit,
      category: categorySlug,
      query: searchQuery,
      minPrice,
      maxPrice,
      productType,
      sort,
    } = parseResult.data;

    // 3. Resolve category if provided
    let categoryId: string | undefined;
    if (categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: categorySlug, isActive: true },
        select: { id: true, slug: true, name: true },
      });

      if (!cat) {
        return apiError(
          "VALIDATION_FAILED",
          `Category '${categorySlug}' does not exist or is inactive`,
          400,
          [{ field: "category", message: `Category '${categorySlug}' not found` }]
        );
      }
      categoryId = cat.id;
    }

    // 4. Construct safe PostgreSQL WHERE clause (hardcoded status = PUBLISHED)
    const where: Prisma.ProductWhereInput = {
      status: "PUBLISHED",
      ...(categoryId ? { categoryId } : {}),
      ...(productType ? { productType } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            pricePaise: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(searchQuery
        ? {
            OR: [
              { title: { contains: searchQuery, mode: "insensitive" } },
              { shortDescription: { contains: searchQuery, mode: "insensitive" } },
              { description: { contains: searchQuery, mode: "insensitive" } },
              { tags: { has: searchQuery } },
            ],
          }
        : {}),
    };

    // 5. Safe allowlisted sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "best_selling":
        orderBy = { salesCount: "desc" };
        break;
      case "price_asc":
        orderBy = { pricePaise: "asc" };
        break;
      case "price_desc":
        orderBy = { pricePaise: "desc" };
        break;
      case "rating":
        orderBy = { ratingAvg: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const skip = (page - 1) * limit;
    const take = limit;

    // 6. Execute count & paginated retrieval in a transaction
    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
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
          ratingAvg: true,
          reviewsCount: true,
          salesCount: true,
          tags: true,
          fileFormats: true,
          createdAt: true,
          seller: {
            select: {
              storeName: true,
              storeSlug: true,
              logoUrl: true,
            },
          },
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
          media: {
            select: { url: true, type: true },
            orderBy: { displayOrder: "asc" },
            take: 1,
          },
        },
        orderBy,
        skip,
        take,
      }),
    ]);

    // 7. Sanitize public DTO
    const sanitizedProducts = products.map((p) => {
      const thumbnailUrl =
        p.media.find((m) => m.type === "THUMBNAIL")?.url ||
        p.media[0]?.url ||
        null;

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        shortDescription: p.shortDescription,
        productType: p.productType,
        pricePaise: p.pricePaise,
        discountPricePaise: p.discountPricePaise,
        isFree: p.isFree,
        licenseType: p.licenseType,
        ratingAvg: Number(p.ratingAvg),
        reviewsCount: p.reviewsCount,
        salesCount: p.salesCount,
        tags: p.tags,
        fileFormats: p.fileFormats,
        thumbnailUrl,
        seller: {
          storeName: p.seller.storeName,
          storeSlug: p.seller.storeSlug,
          logoUrl: p.seller.logoUrl,
        },
        category: {
          name: p.category.name,
          slug: p.category.slug,
        },
        createdAt: p.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return apiSuccess(
      sanitizedProducts,
      "Products retrieved successfully",
      200,
      {
        page,
        limit,
        total,
        totalPages,
      }
    );
  } catch (error) {
    console.error("[PUBLIC_CATALOG_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while fetching the product catalog",
      500
    );
  }
}
