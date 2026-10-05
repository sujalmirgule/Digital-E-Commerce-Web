import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { catalogQuerySchema, normalizeSearchQuery } from "@/lib/validations/product";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products
 *
 * Public marketplace product catalog with advanced search, filtering,
 * price ranges, seller filtering, ratings, and allowlisted sorting.
 *
 * Security & Isolation:
 *   - Strictly enforces status = 'PUBLISHED'.
 *   - Never returns DRAFT, PENDING_REVIEW, REJECTED, ARCHIVED, or SUSPENDED products.
 *   - Strictly restricts to sellers with status = 'APPROVED'.
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
      category,
      categorySlug,
      query,
      q,
      minPrice,
      priceMin,
      maxPrice,
      priceMax,
      rating,
      minRating,
      seller,
      sellerSlug,
      licenseType,
      productType,
      sort,
    } = parseResult.data;

    // Normalize parameters and aliases
    const rawSearchQuery = query || q || "";
    const searchQuery = normalizeSearchQuery(rawSearchQuery);
    const effectiveCategory = category || categorySlug;
    const effectiveMinPrice = priceMin !== undefined ? priceMin : minPrice;
    const effectiveMaxPrice = priceMax !== undefined ? priceMax : maxPrice;
    const effectiveRating = minRating !== undefined ? minRating : rating;
    const effectiveSeller = seller || sellerSlug;

    // 3. Resolve category if provided (supports slug or CUID)
    let categoryId: string | undefined;
    if (effectiveCategory) {
      const cat = await prisma.category.findFirst({
        where: {
          OR: [{ slug: effectiveCategory }, { id: effectiveCategory }],
          isActive: true,
        },
        select: { id: true, slug: true, name: true },
      });

      if (!cat) {
        return apiError(
          "VALIDATION_FAILED",
          `Category '${effectiveCategory}' does not exist or is inactive`,
          400,
          [{ field: "category", message: `Category '${effectiveCategory}' not found` }]
        );
      }
      categoryId = cat.id;
    }

    // 4. Construct safe PostgreSQL WHERE clause
    let sellerWhereClause: Prisma.ProductWhereInput["seller"] = {
      status: "APPROVED",
    };
    if (effectiveSeller) {
      sellerWhereClause = {
        OR: [{ storeSlug: effectiveSeller }, { id: effectiveSeller }],
        status: "APPROVED",
      };
    }

    const where: Prisma.ProductWhereInput = {
      status: "PUBLISHED",
      seller: sellerWhereClause,
      ...(categoryId ? { categoryId } : {}),
      ...(productType ? { productType } : {}),
      ...(licenseType ? { licenseType } : {}),
      ...(effectiveRating !== undefined ? { ratingAvg: { gte: effectiveRating } } : {}),
      ...(effectiveMinPrice !== undefined || effectiveMaxPrice !== undefined
        ? {
            pricePaise: {
              ...(effectiveMinPrice !== undefined ? { gte: effectiveMinPrice } : {}),
              ...(effectiveMaxPrice !== undefined ? { lte: effectiveMaxPrice } : {}),
            },
          }
        : {}),
    };

    if (searchQuery) {
      const rawTokens = searchQuery
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
      const tokens = Array.from(new Set(rawTokens)).slice(0, 5);

      const orClauses: Prisma.ProductWhereInput[] = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { shortDescription: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { tags: { has: searchQuery } },
      ];

      // If user typed multiple keywords, match products containing all tokens across searchable fields
      if (tokens.length > 1) {
        orClauses.push({
          AND: tokens.map((token) => ({
            OR: [
              { title: { contains: token, mode: "insensitive" } },
              { shortDescription: { contains: token, mode: "insensitive" } },
              { description: { contains: token, mode: "insensitive" } },
              { tags: { has: token } },
            ],
          })),
        });
      }

      where.OR = orClauses;
    }

    // 5. Safe allowlisted sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
    switch (sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "popular":
      case "best_selling":
        orderBy = [{ salesCount: "desc" }, { ratingAvg: "desc" }];
        break;
      case "price_asc":
      case "price_low":
        orderBy = { pricePaise: "asc" };
        break;
      case "price_desc":
      case "price_high":
        orderBy = { pricePaise: "desc" };
        break;
      case "rating":
        orderBy = [{ ratingAvg: "desc" }, { reviewsCount: "desc" }];
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
        filters: {
          category: effectiveCategory || null,
          query: searchQuery || null,
          minPrice: effectiveMinPrice ?? null,
          maxPrice: effectiveMaxPrice ?? null,
          rating: effectiveRating ?? null,
          seller: effectiveSeller || null,
          licenseType: licenseType || null,
          productType: productType || null,
          sort,
        },
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
