import { prisma } from "@/lib/prisma";
import { CreateReviewInput, UpdateReviewInput, PublicReviewsQueryInput } from "@/lib/validations/review";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface RatingAggregates {
  averageRating: number;
  reviewsCount: number;
  distribution: RatingDistribution;
}

/**
 * Recalculate and persist product rating aggregates.
 * Ensures Product.ratingAvg and Product.reviewsCount stay accurate and in sync.
 */
export async function recalculateProductRatingAggregates(
  productId: string
): Promise<RatingAggregates> {
  const reviews = await prisma.review.findMany({
    where: {
      productId,
      isVisible: true,
    },
    select: {
      rating: true,
    },
  });

  const reviewsCount = reviews.length;
  const distribution: RatingDistribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  let totalRatingSum = 0;
  for (const r of reviews) {
    totalRatingSum += r.rating;
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as keyof RatingDistribution]++;
    }
  }

  const averageRating =
    reviewsCount === 0
      ? 0.0
      : Number((totalRatingSum / reviewsCount).toFixed(2));

  // Update denormalized aggregates on Product
  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: averageRating,
      reviewsCount,
    },
  });

  return {
    averageRating,
    reviewsCount,
    distribution,
  };
}

/**
 * Check if an authenticated buyer is eligible to review a product.
 *
 * Rules:
 *   1. Must have an ACTIVE entitlement OR a PAID order item with CAPTURED payment.
 *   2. Must NOT have already submitted a review for this product.
 */
export async function checkBuyerReviewEligibility(
  productId: string,
  buyerId: string
) {
  // Check if buyer has already reviewed this product
  const existingReview = await prisma.review.findUnique({
    where: {
      productId_buyerId: {
        productId,
        buyerId,
      },
    },
  });

  if (existingReview) {
    return {
      eligible: false,
      alreadyReviewed: true,
      existingReviewId: existingReview.id,
      code: "ALREADY_REVIEWED",
      message: "You have already reviewed this product. You may edit your existing review.",
    };
  }

  // 1. Check authoritative Entitlement layer
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      buyerId,
      productId,
      isActive: true,
      order: {
        status: OrderStatus.PAID,
        payments: {
          some: { status: PaymentStatus.CAPTURED },
        },
      },
    },
    select: { orderId: true },
  });

  if (entitlement) {
    return {
      eligible: true,
      alreadyReviewed: false,
      orderId: entitlement.orderId,
    };
  }

  // 2. Check OrderItem layer (PAID order with CAPTURED payment)
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        buyerId,
        status: OrderStatus.PAID,
        payments: {
          some: { status: PaymentStatus.CAPTURED },
        },
      },
    },
    select: { orderId: true },
  });

  if (orderItem) {
    return {
      eligible: true,
      alreadyReviewed: false,
      orderId: orderItem.orderId,
    };
  }

  return {
    eligible: false,
    alreadyReviewed: false,
    code: "NOT_PURCHASED",
    message: "Only verified purchasers may submit a review for this product.",
  };
}

/**
 * Submit a verified buyer review.
 */
export async function createProductReview(params: {
  productId: string;
  buyerId: string;
  data: CreateReviewInput;
}) {
  const { productId, buyerId, data } = params;

  // 1. Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, title: true },
  });

  if (!product) {
    return {
      success: false,
      code: "PRODUCT_NOT_FOUND",
      error: "Product not found",
      status: 404,
    };
  }

  // 2. Verify eligibility (verified purchase)
  const eligibility = await checkBuyerReviewEligibility(productId, buyerId);
  if (!eligibility.eligible) {
    return {
      success: false,
      code: eligibility.code || "FORBIDDEN",
      error: eligibility.message,
      status: eligibility.alreadyReviewed ? 409 : 403,
    };
  }

  // 3. Create review record
  try {
    const review = await prisma.review.create({
      data: {
        productId,
        buyerId,
        orderId: eligibility.orderId!,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        isVisible: true,
      },
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // 4. Update product rating aggregates
    const aggregates = await recalculateProductRatingAggregates(productId);

    return {
      success: true,
      review,
      aggregates,
      status: 201,
    };
  } catch (err: any) {
    if (err.code === "P2002") {
      return {
        success: false,
        code: "DUPLICATE_REVIEW",
        error: "A review from this buyer for this product already exists",
        status: 409,
      };
    }
    throw err;
  }
}

/**
 * Update an existing review (Buyer editing own review or Admin).
 */
export async function updateProductReview(params: {
  reviewId: string;
  userId: string;
  isAdmin: boolean;
  data: UpdateReviewInput;
}) {
  const { reviewId, userId, isAdmin, data } = params;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return {
      success: false,
      code: "REVIEW_NOT_FOUND",
      error: "Review not found",
      status: 404,
    };
  }

  // IDOR check: buyer can only edit own review
  if (review.buyerId !== userId && !isAdmin) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "You do not have permission to edit this review",
      status: 403,
    };
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      rating: data.rating !== undefined ? data.rating : review.rating,
      title: data.title !== undefined ? data.title : review.title,
      comment: data.comment !== undefined ? data.comment : review.comment,
    },
    include: {
      buyer: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  // If rating changed, recalculate product aggregates
  let aggregates: RatingAggregates | undefined;
  if (data.rating !== undefined && data.rating !== review.rating) {
    aggregates = await recalculateProductRatingAggregates(review.productId);
  }

  return {
    success: true,
    review: updatedReview,
    aggregates,
    status: 200,
  };
}

/**
 * Delete a review (Buyer deleting own review or Admin).
 */
export async function deleteProductReview(params: {
  reviewId: string;
  userId: string;
  isAdmin: boolean;
}) {
  const { reviewId, userId, isAdmin } = params;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return {
      success: false,
      code: "REVIEW_NOT_FOUND",
      error: "Review not found",
      status: 404,
    };
  }

  // IDOR check: buyer can only delete own review
  if (review.buyerId !== userId && !isAdmin) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "You do not have permission to delete this review",
      status: 403,
    };
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  // Recalculate aggregates
  const aggregates = await recalculateProductRatingAggregates(review.productId);

  return {
    success: true,
    aggregates,
    status: 200,
  };
}

/**
 * Admin Moderation Action: hide, restore, or delete review.
 */
export async function moderateReview(params: {
  reviewId: string;
  action: "hide" | "restore" | "delete";
}) {
  const { reviewId, action } = params;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return {
      success: false,
      code: "REVIEW_NOT_FOUND",
      error: "Review not found",
      status: 404,
    };
  }

  if (action === "delete") {
    await prisma.review.delete({ where: { id: reviewId } });
  } else {
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        isVisible: action === "restore",
      },
    });
  }

  const aggregates = await recalculateProductRatingAggregates(review.productId);

  return {
    success: true,
    action,
    reviewId,
    aggregates,
    status: 200,
  };
}

/**
 * Public Review Display for a Product.
 * Zero sensitive data leakage (no email, phone, passwords, or payment details).
 */
export async function getPublicProductReviews(
  productId: string,
  options: PublicReviewsQueryInput
) {
  const { page, limit, rating, sort } = options;
  const skip = (page - 1) * limit;

  const where: any = {
    productId,
    isVisible: true,
  };

  if (rating) {
    where.rating = rating;
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "highest") {
    orderBy = { rating: "desc" };
  } else if (sort === "lowest") {
    orderBy = { rating: "asc" };
  }

  const [reviews, totalMatching, allVisibleReviews] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.findMany({
      where: { productId, isVisible: true },
      select: { rating: true },
    }),
  ]);

  // Compute live aggregates across all visible reviews
  const totalCount = allVisibleReviews.length;
  const distribution: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of allVisibleReviews) {
    sum += r.rating;
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as keyof RatingDistribution]++;
    }
  }

  const averageRating = totalCount === 0 ? 0.0 : Number((sum / totalCount).toFixed(2));

  // Mask reviewer names for privacy if needed (e.g. John Doe -> John D.)
  const formattedReviews = reviews.map((r) => {
    const nameParts = (r.buyer.fullName || "Verified Buyer").trim().split(" ");
    const safeDisplayName =
      nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0];

    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      verifiedPurchase: true,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      sellerReply: r.sellerReply,
      sellerRepliedAt: r.sellerRepliedAt?.toISOString() || null,
      reviewer: {
        displayName: safeDisplayName,
        avatarUrl: r.buyer.avatarUrl,
      },
    };
  });

  return {
    reviews: formattedReviews,
    ratingSummary: {
      averageRating,
      reviewsCount: totalCount,
      distribution,
    },
    pagination: {
      page,
      limit,
      total: totalMatching,
      totalPages: Math.ceil(totalMatching / limit) || 1,
    },
  };
}
