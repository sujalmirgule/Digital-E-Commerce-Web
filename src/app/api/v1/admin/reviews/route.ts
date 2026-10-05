import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { adminReviewsQuerySchema } from "@/lib/validations/review";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/reviews
 *
 * Administrator review management register.
 * Supports filtering by product, buyer, rating, visibility, report status, and text search.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Only platform administrators may access the review moderation register",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const rawQuery = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      productId: searchParams.get("productId") || undefined,
      buyerId: searchParams.get("buyerId") || undefined,
      rating: searchParams.get("rating") || undefined,
      isVisible: searchParams.get("isVisible") || undefined,
      isReported: searchParams.get("isReported") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const parsedQuery = adminReviewsQuerySchema.safeParse(rawQuery);
    if (!parsedQuery.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid query parameters",
        400,
        parsedQuery.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const { page, limit, productId, buyerId, rating, isVisible, isReported, search } =
      parsedQuery.data;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (productId) where.productId = productId;
    if (buyerId) where.buyerId = buyerId;
    if (rating) where.rating = rating;
    if (isVisible !== undefined) where.isVisible = isVisible;
    if (isReported !== undefined) where.isReported = isReported;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { comment: { contains: search, mode: "insensitive" } },
        { buyer: { fullName: { contains: search, mode: "insensitive" } } },
        { buyer: { email: { contains: search, mode: "insensitive" } } },
        { product: { title: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          buyer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return apiSuccess(
      {
        reviews,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      },
      "Review register retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_REVIEWS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve reviews register",
      500
    );
  }
}
