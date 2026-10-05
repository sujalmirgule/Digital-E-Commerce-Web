import { prisma } from "@/lib/prisma";
import { EarningStatus, OrderStatus, ProductStatus } from "@prisma/client";

export interface SellerOverviewDTO {
  stats: {
    totalProducts: number;
    publishedProducts: number;
    pendingModeration: number;
    draftProducts: number;
    rejectedProducts: number;
    totalSales: number;
    grossRevenuePaise: number;
    platformFeePaise: number;
    netEarningsPaise: number;
    pendingBalancePaise: number;
    availableBalancePaise: number;
    averageRating: number;
    totalReviews: number;
  };
  recentSales: {
    id: string;
    orderId: string;
    productTitle: string;
    productSlug: string;
    pricePaise: number;
    sellerEarningsPaise: number;
    licenseType: string;
    createdAt: string;
    orderStatus: OrderStatus;
  }[];
  sellerProfile: {
    id: string;
    storeName: string;
    storeSlug: string;
    status: string;
    country: string;
    createdAt: string;
  };
}

export interface SellerProductListItemDTO {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  pricePaise: number;
  discountPricePaise: number | null;
  status: ProductStatus;
  rejectionReason: string | null;
  version: string;
  ratingAvg: number;
  reviewsCount: number;
  salesCount: number;
  filesCount: number;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerSaleItemDTO {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  pricePaise: number;
  platformFeePaise: number;
  sellerEarningsPaise: number;
  licenseType: string;
  orderStatus: OrderStatus;
  createdAt: string;
}

export interface SellerReviewItemDTO {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  sellerReply: string | null;
  sellerRepliedAt: string | null;
}

/**
 * Get aggregated overview for an approved seller.
 */
export async function getSellerOverview(sellerProfileId: string): Promise<SellerOverviewDTO> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    select: {
      id: true,
      storeName: true,
      storeSlug: true,
      status: true,
      country: true,
      createdAt: true,
    },
  });

  if (!profile) {
    throw new Error("SELLER_PROFILE_NOT_FOUND");
  }

  // 1. Product Status Counts
  const [
    totalProducts,
    publishedProducts,
    pendingModeration,
    draftProducts,
    rejectedProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { sellerId: sellerProfileId } }),
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.PUBLISHED } }),
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.PENDING_REVIEW } }),
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.DRAFT } }),
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.REJECTED } }),
  ]);

  // 2. Earnings & Financial Aggregates
  const earnings = await prisma.sellerEarning.findMany({
    where: { sellerId: sellerProfileId },
    select: {
      grossAmountPaise: true,
      platformFeePaise: true,
      netEarningsPaise: true,
      status: true,
    },
  });

  let grossRevenuePaise = 0;
  let platformFeePaise = 0;
  let netEarningsPaise = 0;
  let pendingBalancePaise = 0;
  let availableBalancePaise = 0;

  for (const e of earnings) {
    grossRevenuePaise += e.grossAmountPaise;
    platformFeePaise += e.platformFeePaise;
    netEarningsPaise += e.netEarningsPaise;

    if (e.status === EarningStatus.PENDING) {
      pendingBalancePaise += e.netEarningsPaise;
    } else if (e.status === EarningStatus.AVAILABLE) {
      availableBalancePaise += e.netEarningsPaise;
    }
  }

  // 3. Total Sales Items
  const totalSales = await prisma.orderItem.count({
    where: {
      sellerId: sellerProfileId,
      order: { status: OrderStatus.PAID },
    },
  });

  // 4. Ratings & Reviews across seller products
  const productRatings = await prisma.product.aggregate({
    where: { sellerId: sellerProfileId },
    _avg: { ratingAvg: true },
    _sum: { reviewsCount: true },
  });

  const averageRating = productRatings._avg.ratingAvg ? Number(productRatings._avg.ratingAvg.toFixed(2)) : 0;
  const totalReviews = productRatings._sum.reviewsCount || 0;

  // 5. Recent 5 Sales
  const recentOrderItems = await prisma.orderItem.findMany({
    where: { sellerId: sellerProfileId },
    include: {
      order: {
        select: { status: true },
      },
      product: {
        select: { slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const recentSales = recentOrderItems.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    productTitle: item.productTitle,
    productSlug: item.product.slug,
    pricePaise: item.pricePaise,
    sellerEarningsPaise: item.sellerEarningsPaise,
    licenseType: item.licenseType,
    createdAt: item.createdAt.toISOString(),
    orderStatus: item.order.status,
  }));

  return {
    stats: {
      totalProducts,
      publishedProducts,
      pendingModeration,
      draftProducts,
      rejectedProducts,
      totalSales,
      grossRevenuePaise,
      platformFeePaise,
      netEarningsPaise,
      pendingBalancePaise,
      availableBalancePaise,
      averageRating,
      totalReviews,
    },
    recentSales,
    sellerProfile: {
      id: profile.id,
      storeName: profile.storeName,
      storeSlug: profile.storeSlug,
      status: profile.status,
      country: profile.country,
      createdAt: profile.createdAt.toISOString(),
    },
  };
}

/**
 * List products for the authenticated seller with status filters and search.
 */
export async function getSellerProducts(
  sellerProfileId: string,
  options?: {
    status?: ProductStatus;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  products: SellerProductListItemDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause: any = { sellerId: sellerProfileId };

  if (options?.status) {
    whereClause.status = options.status;
  }

  if (options?.search) {
    whereClause.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { slug: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [total, rawProducts] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      include: {
        media: {
          where: { type: "THUMBNAIL" },
          select: { url: true },
          take: 1,
        },
        _count: {
          select: { files: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const products: SellerProductListItemDTO[] = rawProducts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    shortDescription: p.shortDescription,
    pricePaise: p.pricePaise,
    discountPricePaise: p.discountPricePaise,
    status: p.status,
    rejectionReason: p.rejectionReason,
    version: p.version,
    ratingAvg: Number(p.ratingAvg),
    reviewsCount: p.reviewsCount,
    salesCount: p.salesCount,
    filesCount: p._count.files,
    thumbnailUrl: p.media[0]?.url || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get single product detail owned by seller with IDOR protection.
 */
export async function getSellerProductDetail(
  sellerProfileId: string,
  productId: string
): Promise<{ success: boolean; status: number; product?: any; error?: string; code?: string }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      files: {
        select: {
          id: true,
          originalFilename: true,
          fileSize: true,
          mimeType: true,
          version: true,
          downloadLimit: true,
          createdAt: true,
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

  if (!product) {
    return {
      success: false,
      status: 404,
      code: "PRODUCT_NOT_FOUND",
      error: "Product not found",
    };
  }

  // IDOR Protection: product must belong to authenticated seller
  if (product.sellerId !== sellerProfileId) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      error: "You are not authorized to view or manage this product",
    };
  }

  // Format safely (convert BigInt fileSize to number, Decimal ratingAvg to number)
  const formattedProduct = {
    ...product,
    pricePaise: product.pricePaise,
    discountPricePaise: product.discountPricePaise,
    ratingAvg: Number(product.ratingAvg),
    files: product.files.map((f) => ({
      ...f,
      fileSize: Number(f.fileSize),
      createdAt: f.createdAt.toISOString(),
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };

  return {
    success: true,
    status: 200,
    product: formattedProduct,
  };
}

/**
 * Update an existing product owned by the seller.
 * Enforces IDOR protection.
 */
export async function updateSellerProduct(
  sellerProfileId: string,
  productId: string,
  data: {
    title?: string;
    description?: string;
    shortDescription?: string;
    pricePaise?: number;
    discountPricePaise?: number | null;
    version?: string;
    demoUrl?: string | null;
    tags?: string[];
    fileFormats?: string[];
    categoryId?: string;
  }
): Promise<{ success: boolean; status: number; product?: any; error?: string; code?: string }> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { sellerId: true, status: true },
  });

  if (!existing) {
    return {
      success: false,
      status: 404,
      code: "PRODUCT_NOT_FOUND",
      error: "Product not found",
    };
  }

  if (existing.sellerId !== sellerProfileId) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      error: "You are not authorized to modify this product",
    };
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.shortDescription && { shortDescription: data.shortDescription }),
      ...(data.pricePaise !== undefined && { pricePaise: data.pricePaise }),
      ...(data.discountPricePaise !== undefined && { discountPricePaise: data.discountPricePaise }),
      ...(data.version && { version: data.version }),
      ...(data.demoUrl !== undefined && { demoUrl: data.demoUrl }),
      ...(data.tags && { tags: data.tags }),
      ...(data.fileFormats && { fileFormats: data.fileFormats }),
      ...(data.categoryId && { categoryId: data.categoryId }),
    },
  });

  return {
    success: true,
    status: 200,
    product: {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      pricePaise: updated.pricePaise,
      discountPricePaise: updated.discountPricePaise,
      version: updated.version,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    },
  };
}

/**
 * Get sales history for products sold by the authenticated seller.
 */
export async function getSellerSales(
  sellerProfileId: string,
  options?: { page?: number; limit?: number }
): Promise<{
  sales: SellerSaleItemDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause = { sellerId: sellerProfileId };

  const [total, rawSales] = await Promise.all([
    prisma.orderItem.count({ where: whereClause }),
    prisma.orderItem.findMany({
      where: whereClause,
      include: {
        order: {
          select: { status: true },
        },
        product: {
          select: { slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const sales: SellerSaleItemDTO[] = rawSales.map((s) => ({
    id: s.id,
    orderId: s.orderId,
    productId: s.productId,
    productTitle: s.productTitle,
    productSlug: s.product.slug,
    pricePaise: s.pricePaise,
    platformFeePaise: s.platformFeePaise,
    sellerEarningsPaise: s.sellerEarningsPaise,
    licenseType: s.licenseType,
    orderStatus: s.order.status,
    createdAt: s.createdAt.toISOString(),
  }));

  return {
    sales,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get reviews received across products owned by the authenticated seller.
 */
export async function getSellerReviews(
  sellerProfileId: string,
  options?: { page?: number; limit?: number }
): Promise<{
  reviews: SellerReviewItemDTO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause = {
    product: {
      sellerId: sellerProfileId,
    },
  };

  const [total, rawReviews] = await Promise.all([
    prisma.review.count({ where: whereClause }),
    prisma.review.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const reviews: SellerReviewItemDTO[] = rawReviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.product.title,
    productSlug: r.product.slug,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    verifiedPurchase: true,
    createdAt: r.createdAt.toISOString(),
    sellerReply: r.sellerReply,
    sellerRepliedAt: r.sellerRepliedAt?.toISOString() || null,
  }));

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Add or update seller reply to a review on one of their products.
 * Enforces IDOR protection.
 */
export async function replyToSellerReview(
  sellerProfileId: string,
  reviewId: string,
  replyText: string
): Promise<{ success: boolean; status: number; review?: any; error?: string; code?: string }> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      product: {
        select: { sellerId: true },
      },
    },
  });

  if (!review) {
    return {
      success: false,
      status: 404,
      code: "REVIEW_NOT_FOUND",
      error: "Review not found",
    };
  }

  // IDOR Protection: review must be on a product owned by this seller
  if (review.product.sellerId !== sellerProfileId) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      error: "You are not authorized to reply to reviews on another seller's product",
    };
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      sellerReply: replyText.trim(),
      sellerRepliedAt: new Date(),
    },
    select: {
      id: true,
      productId: true,
      rating: true,
      title: true,
      comment: true,
      sellerReply: true,
      sellerRepliedAt: true,
    },
  });

  return {
    success: true,
    status: 200,
    review: {
      ...updated,
      sellerRepliedAt: updated.sellerRepliedAt?.toISOString() || null,
    },
  };
}
