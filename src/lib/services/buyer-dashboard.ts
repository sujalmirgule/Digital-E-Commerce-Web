import { prisma } from "@/lib/prisma";
import { EntitlementStatus, OrderStatus, PaymentStatus } from "@prisma/client";

export interface BuyerOverviewDTO {
  stats: {
    totalPurchasedProducts: number;
    totalOrders: number;
    totalReceipts: number;
    totalReviews: number;
    totalDownloads: number;
  };
  recentPurchases: {
    entitlementId: string;
    orderId: string;
    purchasedAt: string;
    product: {
      id: string;
      title: string;
      slug: string;
      version: string;
      thumbnailUrl: string | null;
      sellerName: string;
    };
    file: {
      id: string;
      filename: string;
      fileSize: number;
    } | null;
  }[];
  recentOrders: {
    id: string;
    createdAt: string;
    paidAt: string | null;
    status: OrderStatus;
    totalAmountPaise: number;
    currency: string;
    itemsCount: number;
    firstProductTitle: string;
    hasReceipt: boolean;
  }[];
  recentReceipts: {
    id: string;
    invoiceNumber: string;
    orderId: string;
    amountPaidPaise: number;
    currency: string;
    issuedAt: string;
    downloadUrl: string;
  }[];
  recentReviews: {
    id: string;
    productId: string;
    productTitle: string;
    rating: number;
    title: string;
    comment: string;
    createdAt: string;
  }[];
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
}

export interface BuyerOrderDTO {
  id: string;
  createdAt: string;
  paidAt: string | null;
  status: OrderStatus;
  subtotalPaise: number;
  discountPaise: number;
  platformFeePaise: number;
  totalAmountPaise: number;
  currency: string;
  items: {
    id: string;
    productId: string;
    productTitle: string;
    pricePaise: number;
    licenseType: string;
    sellerStoreName: string;
    thumbnailUrl: string | null;
    productSlug: string;
    productFileId: string | null;
  }[];
  payment: {
    status: PaymentStatus;
    method: string;
    razorpayPaymentId: string | null;
    verifiedAt: string | null;
  } | null;
  receipt: {
    id: string;
    invoiceNumber: string;
    downloadUrl: string;
  } | null;
}

export interface BuyerDownloadItemDTO {
  productFileId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  productVersion: string;
  thumbnailUrl: string | null;
  sellerStoreName: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
  purchasedAt: string;
}

export interface BuyerReceiptDTO {
  id: string;
  invoiceNumber: string;
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  amountPaidPaise: number;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  issuedAt: string;
  downloadUrl: string;
  items: {
    productTitle: string;
    pricePaise: number;
  }[];
}

export interface BuyerReviewItemDTO {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  productThumbnail: string | null;
  rating: number;
  title: string;
  comment: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  sellerReply: string | null;
  sellerRepliedAt: string | null;
}

/**
 * Get aggregated overview for the authenticated buyer.
 */
export async function getBuyerOverview(userId: string): Promise<BuyerOverviewDTO> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  // 1. Counts and Stats
  const [
    uniqueEntitlementsCount,
    totalOrdersCount,
    totalReceiptsCount,
    totalReviewsCount,
    totalDownloadsCount,
  ] = await Promise.all([
    // Unique products entitled
    prisma.entitlement.groupBy({
      by: ["productId"],
      where: {
        buyerId: userId,
        isActive: true,
        status: EntitlementStatus.ACTIVE,
      },
    }),
    prisma.order.count({
      where: { buyerId: userId },
    }),
    prisma.receipt.count({
      where: {
        order: { buyerId: userId },
      },
    }),
    prisma.review.count({
      where: { buyerId: userId },
    }),
    prisma.download.count({
      where: { buyerId: userId },
    }),
  ]);

  // 2. Recent Purchases / Library items (top 5)
  const entitlements = await prisma.entitlement.findMany({
    where: {
      buyerId: userId,
      isActive: true,
      status: EntitlementStatus.ACTIVE,
    },
    include: {
      order: {
        select: {
          id: true,
          paidAt: true,
          createdAt: true,
        },
      },
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          version: true,
          seller: {
            select: { storeName: true },
          },
          media: {
            where: { type: "THUMBNAIL" },
            select: { url: true },
            take: 1,
          },
          files: {
            select: {
              id: true,
              originalFilename: true,
              fileSize: true,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { grantedAt: "desc" },
    take: 5,
  });

  const recentPurchases = entitlements.map((ent) => ({
    entitlementId: ent.id,
    orderId: ent.orderId,
    purchasedAt: (ent.order?.paidAt ?? ent.grantedAt).toISOString(),
    product: {
      id: ent.product.id,
      title: ent.product.title,
      slug: ent.product.slug,
      version: ent.product.version,
      thumbnailUrl: ent.product.media[0]?.url || null,
      sellerName: ent.product.seller.storeName,
    },
    file: ent.product.files[0]
      ? {
          id: ent.product.files[0].id,
          filename: ent.product.files[0].originalFilename,
          fileSize: Number(ent.product.files[0].fileSize),
        }
      : null,
  }));

  // 3. Recent Orders (top 5)
  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    select: {
      id: true,
      createdAt: true,
      paidAt: true,
      status: true,
      totalAmountPaise: true,
      currency: true,
      items: {
        select: { productTitle: true },
        take: 1,
      },
      _count: {
        select: { items: true },
      },
      receipt: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const recentOrders = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() || null,
    status: o.status,
    totalAmountPaise: o.totalAmountPaise,
    currency: o.currency,
    itemsCount: o._count.items,
    firstProductTitle: o.items[0]?.productTitle || "Digital Product",
    hasReceipt: Boolean(o.receipt),
  }));

  // 4. Recent Receipts (top 5)
  const receipts = await prisma.receipt.findMany({
    where: {
      order: { buyerId: userId },
    },
    select: {
      id: true,
      invoiceNumber: true,
      orderId: true,
      amountPaidPaise: true,
      currency: true,
      issuedAt: true,
    },
    orderBy: { issuedAt: "desc" },
    take: 5,
  });

  const recentReceipts = receipts.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    orderId: r.orderId,
    amountPaidPaise: r.amountPaidPaise,
    currency: r.currency,
    issuedAt: r.issuedAt.toISOString(),
    downloadUrl: `/api/v1/buyer/receipts/${r.id}/download`,
  }));

  // 5. Recent Reviews (top 5)
  const reviews = await prisma.review.findMany({
    where: { buyerId: userId },
    include: {
      product: {
        select: { title: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const recentReviews = reviews.map((rev) => ({
    id: rev.id,
    productId: rev.productId,
    productTitle: rev.product.title,
    rating: rev.rating,
    title: rev.title,
    comment: rev.comment,
    createdAt: rev.createdAt.toISOString(),
  }));

  return {
    stats: {
      totalPurchasedProducts: uniqueEntitlementsCount.length,
      totalOrders: totalOrdersCount,
      totalReceipts: totalReceiptsCount,
      totalReviews: totalReviewsCount,
      totalDownloads: totalDownloadsCount,
    },
    recentPurchases,
    recentOrders,
    recentReceipts,
    recentReviews,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

/**
 * Get paginated list of orders for the authenticated buyer.
 */
export async function getBuyerOrders(
  userId: string,
  options?: { page?: number; limit?: number; status?: OrderStatus }
): Promise<{ orders: BuyerOrderDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause: { buyerId: string; status?: OrderStatus } = { buyerId: userId };
  if (options?.status) {
    whereClause.status = options.status;
  }

  const [total, rawOrders] = await Promise.all([
    prisma.order.count({ where: whereClause }),
    prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                slug: true,
                media: {
                  where: { type: "THUMBNAIL" },
                  select: { url: true },
                  take: 1,
                },
                files: {
                  select: { id: true },
                  take: 1,
                },
              },
            },
            seller: {
              select: { storeName: true },
            },
          },
        },
        payments: {
          select: {
            status: true,
            method: true,
            razorpayPaymentId: true,
            verifiedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        receipt: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const orders: BuyerOrderDTO[] = rawOrders.map((o) => {
    const payment = o.payments[0] || null;
    return {
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() || null,
      status: o.status,
      subtotalPaise: o.subtotalPaise,
      discountPaise: o.discountPaise,
      platformFeePaise: o.platformFeePaise,
      totalAmountPaise: o.totalAmountPaise,
      currency: o.currency,
      items: o.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productTitle: it.productTitle,
        pricePaise: it.pricePaise,
        licenseType: it.licenseType,
        sellerStoreName: it.seller.storeName,
        thumbnailUrl: it.product.media[0]?.url || null,
        productSlug: it.product.slug,
        productFileId: it.product.files[0]?.id || null,
      })),
      payment: payment
        ? {
            status: payment.status,
            method: payment.method,
            razorpayPaymentId: payment.razorpayPaymentId,
            verifiedAt: payment.verifiedAt?.toISOString() || null,
          }
        : null,
      receipt: o.receipt
        ? {
            id: o.receipt.id,
            invoiceNumber: o.receipt.invoiceNumber,
            downloadUrl: `/api/v1/buyer/receipts/${o.receipt.id}/download`,
          }
        : null,
    };
  });

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get detailed information for a single order owned by the authenticated buyer.
 * Enforces IDOR protection: buyers can view only their own orders unless caller is ADMIN.
 */
export async function getBuyerOrderDetail(
  userId: string,
  orderId: string,
  isAdmin = false
): Promise<{ success: boolean; status: number; order?: BuyerOrderDTO; error?: string; code?: string }> {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
              media: {
                where: { type: "THUMBNAIL" },
                select: { url: true },
                take: 1,
              },
              files: {
                select: { id: true },
                take: 1,
              },
            },
          },
          seller: {
            select: { storeName: true },
          },
        },
      },
      payments: {
        select: {
          status: true,
          method: true,
          razorpayPaymentId: true,
          verifiedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      receipt: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
    },
  });

  if (!o) {
    return {
      success: false,
      status: 404,
      code: "ORDER_NOT_FOUND",
      error: "Order not found",
    };
  }

  // IDOR Protection: Reject access if order belongs to someone else
  if (o.buyerId !== userId && !isAdmin) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      error: "You are not authorized to view this order",
    };
  }

  const payment = o.payments[0] || null;
  const orderDto: BuyerOrderDTO = {
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() || null,
    status: o.status,
    subtotalPaise: o.subtotalPaise,
    discountPaise: o.discountPaise,
    platformFeePaise: o.platformFeePaise,
    totalAmountPaise: o.totalAmountPaise,
    currency: o.currency,
    items: o.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productTitle: it.productTitle,
      pricePaise: it.pricePaise,
      licenseType: it.licenseType,
      sellerStoreName: it.seller.storeName,
      thumbnailUrl: it.product.media[0]?.url || null,
      productSlug: it.product.slug,
      productFileId: it.product.files[0]?.id || null,
    })),
    payment: payment
      ? {
          status: payment.status,
          method: payment.method,
          razorpayPaymentId: payment.razorpayPaymentId,
          verifiedAt: payment.verifiedAt?.toISOString() || null,
        }
      : null,
    receipt: o.receipt
      ? {
          id: o.receipt.id,
          invoiceNumber: o.receipt.invoiceNumber,
          downloadUrl: `/api/v1/buyer/receipts/${o.receipt.id}/download`,
        }
      : null,
  };

  return {
    success: true,
    status: 200,
    order: orderDto,
  };
}

/**
 * List all downloadable files available to the authenticated buyer across their active entitlements.
 */
export async function getBuyerDownloadsList(userId: string): Promise<BuyerDownloadItemDTO[]> {
  const entitlements = await prisma.entitlement.findMany({
    where: {
      buyerId: userId,
      isActive: true,
      status: EntitlementStatus.ACTIVE,
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          version: true,
          seller: {
            select: { storeName: true },
          },
          media: {
            where: { type: "THUMBNAIL" },
            select: { url: true },
            take: 1,
          },
          files: {
            select: {
              id: true,
              originalFilename: true,
              fileSize: true,
              mimeType: true,
            },
          },
        },
      },
    },
    orderBy: { grantedAt: "desc" },
  });

  const downloadItems: BuyerDownloadItemDTO[] = [];
  const seenFileIds = new Set<string>();

  for (const ent of entitlements) {
    for (const file of ent.product.files) {
      if (seenFileIds.has(file.id)) continue;
      seenFileIds.add(file.id);

      downloadItems.push({
        productFileId: file.id,
        productId: ent.product.id,
        productTitle: ent.product.title,
        productSlug: ent.product.slug,
        productVersion: ent.product.version,
        thumbnailUrl: ent.product.media[0]?.url || null,
        sellerStoreName: ent.product.seller.storeName,
        filename: file.originalFilename,
        fileSize: Number(file.fileSize),
        mimeType: file.mimeType,
        downloadUrl: `/api/v1/buyer/downloads/${file.id}/url`,
        purchasedAt: ent.grantedAt.toISOString(),
      });
    }
  }

  return downloadItems;
}

/**
 * List all receipts issued to the authenticated buyer.
 */
export async function getBuyerReceiptsList(
  userId: string,
  options?: { page?: number; limit?: number }
): Promise<{ receipts: BuyerReceiptDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(50, Math.max(1, options?.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause = {
    order: { buyerId: userId },
  };

  const [total, rawReceipts] = await Promise.all([
    prisma.receipt.count({ where: whereClause }),
    prisma.receipt.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            items: {
              select: {
                productTitle: true,
                pricePaise: true,
              },
            },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const receipts: BuyerReceiptDTO[] = rawReceipts.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    orderId: r.orderId,
    buyerName: r.buyerName,
    buyerEmail: r.buyerEmail,
    amountPaidPaise: r.amountPaidPaise,
    currency: r.currency,
    paymentMethod: r.paymentMethod,
    paymentId: r.paymentId,
    issuedAt: r.issuedAt.toISOString(),
    downloadUrl: `/api/v1/buyer/receipts/${r.id}/download`,
    items: r.order.items.map((it) => ({
      productTitle: it.productTitle,
      pricePaise: it.pricePaise,
    })),
  }));

  return {
    receipts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * List all reviews submitted by the authenticated buyer.
 */
export async function getBuyerReviewsList(userId: string): Promise<BuyerReviewItemDTO[]> {
  const reviews = await prisma.review.findMany({
    where: { buyerId: userId },
    include: {
      product: {
        select: {
          title: true,
          slug: true,
          media: {
            where: { type: "THUMBNAIL" },
            select: { url: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.product.title,
    productSlug: r.product.slug,
    productThumbnail: r.product.media[0]?.url || null,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    isVisible: r.isVisible,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    sellerReply: r.sellerReply,
    sellerRepliedAt: r.sellerRepliedAt?.toISOString() || null,
  }));
}
