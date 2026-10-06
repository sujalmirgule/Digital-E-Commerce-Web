import { prisma } from "@/lib/prisma";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  SellerStatus,
  UserRole,
} from "@prisma/client";

/**
 * ===========================================================================
 * FEATURE 19: ADMIN DASHBOARD DOMAIN SERVICE
 * ===========================================================================
 * Central authoritative service for platform analytics, management registers,
 * and security governance.
 */

export interface PlatformOverviewStats {
  users: {
    total: number;
    buyers: number;
    admins: number;
  };
  sellers: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  products: {
    total: number;
    published: number;
    pendingModeration: number;
    draft: number;
    rejected: number;
  };
  orders: {
    total: number;
    paid: number;
    completed?: number;
    pending: number;
    failed: number;
    cancelled: number;
  };
  financials: {
    grossTransactionValuePaise: number;
    grossVolumePaise?: number;
    platformCommissionPaise: number;
    platformFeePaise?: number;
    sellerNetEarningsPaise: number;
    sellerEarningsPaise?: number;
  };
  receiptsCount: number;
  receiptCount?: number;
  reviewsCount: number;
  reviewCount?: number;
}

export interface RecentOrderSummary {
  id: string;
  orderId?: string;
  buyerName: string;
  buyerEmail: string;
  totalAmountPaise: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface RecentAuditLogItem {
  id: string;
  action: string;
  targetEntity: string;
  targetId: string;
  adminName: string;
  adminEmail: string;
  createdAt: string;
}

export interface SystemHealthData {
  status: "HEALTHY" | "DEGRADED" | "OPERATIONAL";
  database: any;
  server?: {
    uptimeSeconds: number;
    environment: string;
    nodeVersion: string;
  };
  latencyMs: number;
  nodeVersion: string;
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * Aggregates all high-level platform KPIs securely from the authoritative database.
 */
export async function getPlatformOverview(): Promise<{
  stats: PlatformOverviewStats;
  recentOrders: RecentOrderSummary[];
  recentAuditLogs: RecentAuditLogItem[];
  systemHealth: SystemHealthData;
}> {
  const startTime = Date.now();

  // Run all primary counters in parallel
  const [
    totalUsers,
    buyersCount,
    adminsCount,
    totalSellers,
    approvedSellers,
    pendingSellers,
    rejectedSellers,
    totalProducts,
    publishedProducts,
    pendingModerationProducts,
    draftProducts,
    rejectedProducts,
    totalOrders,
    paidOrders,
    pendingOrders,
    failedOrders,
    cancelledOrders,
    financialAggregate,
    receiptsCount,
    reviewsCount,
    recentOrdersRaw,
    recentAuditLogsRaw,
  ] = await Promise.all([
    // Users
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.BUYER } }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),

    // Sellers
    prisma.sellerProfile.count(),
    prisma.sellerProfile.count({ where: { status: "APPROVED" } }),
    prisma.sellerProfile.count({ where: { status: "PENDING" } }),
    prisma.sellerProfile.count({ where: { status: "REJECTED" } }),

    // Products
    prisma.product.count(),
    prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
    prisma.product.count({ where: { status: ProductStatus.PENDING_REVIEW } }),
    prisma.product.count({ where: { status: ProductStatus.DRAFT } }),
    prisma.product.count({ where: { status: ProductStatus.REJECTED } }),

    // Orders
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.PAID } }),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.order.count({ where: { status: OrderStatus.FAILED } }),
    prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),

    // Financials for PAID orders
    prisma.order.aggregate({
      where: { status: OrderStatus.PAID },
      _sum: {
        totalAmountPaise: true,
        platformFeePaise: true,
      },
    }),

    // Receipts & Reviews
    prisma.receipt.count(),
    prisma.review.count(),

    // Recent 5 orders
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        buyerNameSnapshot: true,
        buyerEmailSnapshot: true,
        totalAmountPaise: true,
        status: true,
        createdAt: true,
        paidAt: true,
      },
    }),

    // Recent 5 audit logs
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        admin: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const latencyMs = Date.now() - startTime;

  const grossTransactionValuePaise = financialAggregate._sum.totalAmountPaise || 0;
  const platformCommissionPaise = financialAggregate._sum.platformFeePaise || 0;
  const sellerNetEarningsPaise = Math.max(0, grossTransactionValuePaise - platformCommissionPaise);

  const stats: PlatformOverviewStats = {
    users: {
      total: totalUsers,
      buyers: buyersCount,
      admins: adminsCount,
    },
    sellers: {
      total: totalSellers,
      approved: approvedSellers,
      pending: pendingSellers,
      rejected: rejectedSellers,
    },
    products: {
      total: totalProducts,
      published: publishedProducts,
      pendingModeration: pendingModerationProducts,
      draft: draftProducts,
      rejected: rejectedProducts,
    },
    orders: {
      total: totalOrders,
      paid: paidOrders,
      completed: paidOrders,
      pending: pendingOrders,
      failed: failedOrders,
      cancelled: cancelledOrders,
    },
    financials: {
      grossTransactionValuePaise,
      grossVolumePaise: grossTransactionValuePaise,
      platformCommissionPaise,
      platformFeePaise: platformCommissionPaise,
      sellerNetEarningsPaise,
      sellerEarningsPaise: sellerNetEarningsPaise,
    },
    receiptsCount,
    receiptCount: receiptsCount,
    reviewsCount,
    reviewCount: reviewsCount,
  };

  const recentOrders: RecentOrderSummary[] = recentOrdersRaw.map((o) => ({
    id: o.id,
    orderId: o.id,
    buyerName: o.buyerNameSnapshot || "Customer",
    buyerEmail: o.buyerEmailSnapshot || "customer@example.com",
    totalAmountPaise: o.totalAmountPaise,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() || null,
  }));

  const recentAuditLogs: RecentAuditLogItem[] = recentAuditLogsRaw.map((log) => ({
    id: log.id,
    action: log.action,
    targetEntity: log.targetEntity,
    targetId: log.targetId,
    adminName: log.admin.fullName,
    adminEmail: log.admin.email,
    createdAt: log.createdAt.toISOString(),
  }));

  const systemHealth: SystemHealthData = {
    status: "OPERATIONAL",
    database: "CONNECTED",
    latencyMs,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  return {
    stats,
    ...stats,
    recentOrders,
    recentAuditLogs,
    systemHealth,
  };
}

/**
 * Lists all sellers on the platform with status filtering and search.
 */
export async function getAdminSellers(options?: {
  status?: SellerStatus;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  sellers: Array<{
    id: string;
    userId: string;
    storeName: string;
    storeSlug: string;
    status: string;
    country: string;
    totalRevenuePaise: number;
    netEarningsPaise: number;
    availableBalance: number;
    pendingBalance: number;
    rejectionReason: string | null;
    createdAt: string;
    user: {
      fullName: string;
      email: string;
      isActive: boolean;
    };
    productsCount: number;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.status) {
    whereClause.status = options.status;
  }
  if (options?.search) {
    const s = options.search.trim();
    whereClause.OR = [
      { storeName: { contains: s, mode: "insensitive" } },
      { storeSlug: { contains: s, mode: "insensitive" } },
      { user: { email: { contains: s, mode: "insensitive" } } },
      { user: { fullName: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [total, rawSellers] = await Promise.all([
    prisma.sellerProfile.count({ where: whereClause }),
    prisma.sellerProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            isActive: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const sellers = rawSellers.map((s) => ({
    id: s.id,
    userId: s.userId,
    storeName: s.storeName,
    storeSlug: s.storeSlug,
    status: s.status,
    country: s.country,
    totalRevenuePaise: Number(s.totalRevenuePaise),
    netEarningsPaise: Number(s.netEarningsPaise),
    availableBalance: Number(s.availableBalance),
    pendingBalance: Number(s.pendingBalance),
    rejectionReason: s.rejectionReason,
    createdAt: s.createdAt.toISOString(),
    user: {
      fullName: s.user.fullName,
      email: s.user.email,
      isActive: s.user.isActive,
    },
    productsCount: s._count.products,
  }));

  return {
    sellers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Lists all products on the platform with status filtering and search.
 */
export async function getAdminProducts(options?: {
  status?: ProductStatus;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  products: Array<{
    id: string;
    title: string;
    slug: string;
    pricePaise: number;
    discountPricePaise: number | null;
    status: ProductStatus;
    rejectionReason: string | null;
    category: {
      id: string;
      name: string;
    };
    seller: {
      id: string;
      storeName: string;
      storeSlug: string;
    };
    ratingAvg: number;
    reviewsCount: number;
    filesCount: number;
    createdAt: string;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.status) {
    whereClause.status = options.status;
  }
  if (options?.search) {
    const s = options.search.trim();
    whereClause.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { slug: { contains: s, mode: "insensitive" } },
      { seller: { storeName: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [total, rawProducts] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true },
        },
        seller: {
          select: { id: true, storeName: true, storeSlug: true },
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

  const products = rawProducts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    pricePaise: p.pricePaise,
    discountPricePaise: p.discountPricePaise,
    status: p.status,
    rejectionReason: p.rejectionReason,
    category: p.category,
    seller: p.seller,
    sellerStoreName: p.seller.storeName,
    ratingAvg: Number(p.ratingAvg),
    reviewsCount: p.reviewsCount,
    filesCount: p._count.files,
    createdAt: p.createdAt.toISOString(),
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
 * Lists all orders on the platform with status filtering and search.
 */
export async function getAdminOrders(options?: {
  status?: OrderStatus;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  orders: Array<{
    id: string;
    buyerNameSnapshot: string;
    buyerEmailSnapshot: string;
    totalAmountPaise: number;
    platformFeePaise: number;
    currency: string;
    status: OrderStatus;
    itemsCount: number;
    paymentMethod: string | null;
    paymentStatus: string | null;
    receiptId: string | null;
    createdAt: string;
    paidAt: string | null;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.status) {
    whereClause.status = options.status;
  }
  if (options?.search) {
    const s = options.search.trim();
    whereClause.OR = [
      { id: { contains: s, mode: "insensitive" } },
      { buyerEmailSnapshot: { contains: s, mode: "insensitive" } },
      { buyerNameSnapshot: { contains: s, mode: "insensitive" } },
      { razorpayOrderId: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, rawOrders] = await Promise.all([
    prisma.order.count({ where: whereClause }),
    prisma.order.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { items: true },
        },
        payments: {
          select: { method: true, status: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        receipt: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const orders = rawOrders.map((o) => ({
    id: o.id,
    buyerNameSnapshot: o.buyerNameSnapshot || "Customer",
    buyerName: o.buyerNameSnapshot || "Customer",
    buyerEmailSnapshot: o.buyerEmailSnapshot || "customer@example.com",
    totalAmountPaise: o.totalAmountPaise,
    platformFeePaise: o.platformFeePaise,
    currency: o.currency,
    status: o.status,
    itemsCount: o._count.items,
    itemCount: o._count.items,
    paymentMethod: o.payments[0]?.method || null,
    paymentStatus: o.payments[0]?.status || null,
    receiptId: o.receipt?.id || null,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() || null,
  }));

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
 * Retrieves detailed breakdown of a single order for administrators.
 */
export async function getAdminOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          seller: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
      payments: {
        select: {
          id: true,
          amountPaise: true,
          currency: true,
          status: true,
          method: true,
          razorpayPaymentId: true,
          verifiedAt: true,
          createdAt: true,
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      receipt: {
        select: {
          id: true,
          invoiceNumber: true,
          amountPaidPaise: true,
          currency: true,
          issuedAt: true,
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    buyerNameSnapshot: order.buyerNameSnapshot,
    buyerEmailSnapshot: order.buyerEmailSnapshot,
    subtotalPaise: order.subtotalPaise,
    platformFeePaise: order.platformFeePaise,
    totalAmountPaise: order.totalAmountPaise,
    currency: order.currency,
    status: order.status,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    paidAt: order.paidAt?.toISOString() || null,
    refundedAt: order.refundedAt?.toISOString() || null,
    refundReason: order.refundReason || null,
    providerRefundId: order.providerRefundId || null,
    failureReason: order.failureReason || null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productTitle: item.productTitle,
      productSlug: item.product.slug,
      sellerStoreName: item.seller.storeName,
      pricePaise: item.pricePaise,
      platformFeePaise: item.platformFeePaise,
      sellerEarningsPaise: item.sellerEarningsPaise,
      licenseType: item.licenseType,
    })),
    payment: order.payments[0]
      ? {
          ...order.payments[0],
          verifiedAt: order.payments[0].verifiedAt?.toISOString() || null,
          createdAt: order.payments[0].createdAt.toISOString(),
        }
      : null,
    receipt: order.receipt
      ? {
          id: order.receipt.id,
          invoiceNumber: order.receipt.invoiceNumber,
          amountPaidPaise: order.receipt.amountPaidPaise,
          downloadUrl: `/api/v1/buyer/receipts/${order.receipt.id}/download`,
          createdAt: order.receipt.issuedAt.toISOString(),
        }
      : null,
  };
}

/**
 * Lists all payment records on the platform safely.
 * Never leaks Razorpay secrets, database connection URLs, or card security codes.
 */
export async function getAdminPayments(options?: {
  status?: PaymentStatus;
  method?: PaymentMethod;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  payments: Array<{
    id: string;
    orderId: string;
    razorpayOrderId: string | null;
    razorpayPaymentId: string;
    amountPaise: number;
    currency: string;
    status: PaymentStatus;
    method: PaymentMethod;
    verifiedAt: string | null;
    createdAt: string;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.status) {
    whereClause.status = options.status;
  }
  if (options?.method) {
    whereClause.method = options.method;
  }
  if (options?.search) {
    const s = options.search.trim();
    whereClause.OR = [
      { razorpayPaymentId: { contains: s, mode: "insensitive" } },
      { razorpayOrderId: { contains: s, mode: "insensitive" } },
      { orderId: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, rawPayments] = await Promise.all([
    prisma.payment.count({ where: whereClause }),
    prisma.payment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        orderId: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        amountPaise: true,
        currency: true,
        status: true,
        method: true,
        verifiedAt: true,
        createdAt: true,
        order: {
          select: {
            buyerEmailSnapshot: true,
            buyerNameSnapshot: true,
          },
        },
      },
    }),
  ]);

  const payments = rawPayments.map((p) => ({
    id: p.id,
    orderId: p.orderId,
    razorpayOrderId: p.razorpayOrderId,
    razorpayPaymentId: p.razorpayPaymentId,
    amountPaise: p.amountPaise,
    currency: p.currency,
    status: p.status,
    method: p.method,
    paymentMethod: p.method,
    buyerEmail: p.order?.buyerEmailSnapshot || null,
    buyerName: p.order?.buyerNameSnapshot || null,
    verifiedAt: p.verifiedAt?.toISOString() || null,
    createdAt: p.createdAt.toISOString(),
  }));

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Lists all user accounts safely.
 * Never exposes passwords or password hashes.
 */
export async function getAdminUsers(options?: {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    isEmailVerified: boolean;
    hasSellerProfile: boolean;
    sellerStatus: string | null;
    createdAt: string;
    ordersCount: number;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.role) {
    whereClause.role = options.role;
  }
  if (options?.isActive !== undefined) {
    whereClause.isActive = options.isActive;
  }
  if (options?.search) {
    const s = options.search.trim();
    whereClause.OR = [
      { fullName: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, rawUsers] = await Promise.all([
    prisma.user.count({ where: whereClause }),
    prisma.user.findMany({
      where: whereClause,
      include: {
        sellerProfile: {
          select: { status: true },
        },
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const users = rawUsers.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    isEmailVerified: u.isEmailVerified,
    hasSellerProfile: !!u.sellerProfile,
    sellerProfile: u.sellerProfile ? { status: u.sellerProfile.status } : null,
    sellerStatus: u.sellerProfile?.status || null,
    createdAt: u.createdAt.toISOString(),
    ordersCount: u._count.orders,
  }));

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves safe detailed user information for administrator inspection.
 * Strips passwordHash, tokens, secrets.
 */
export async function getAdminUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
      sellerProfile: {
        select: {
          id: true,
          storeName: true,
          storeSlug: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          orders: true,
          reviews: true,
          downloads: true,
          wishlists: true,
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    sellerProfile: user.sellerProfile
      ? {
          id: user.sellerProfile.id,
          storeName: user.sellerProfile.storeName,
          storeSlug: user.sellerProfile.storeSlug,
          status: user.sellerProfile.status,
          rejectionReason: user.sellerProfile.rejectionReason,
          createdAt: user.sellerProfile.createdAt.toISOString(),
        }
      : null,
    sellerStatus: user.sellerProfile?.status || null,
    ordersCount: user._count.orders,
    reviewsCount: user._count.reviews,
    downloadsCount: user._count.downloads,
    wishlistsCount: user._count.wishlists,
  };
}

/**
 * Toggles user active state (activation / deactivation).
 * Self-deactivation by the authenticated admin is forbidden.
 */
export async function toggleUserStatus(
  adminUserId: string,
  targetUserId: string,
  isActive: boolean
): Promise<{ success: boolean; status: number; user?: any; error?: string; code?: string }> {
  if (adminUserId === targetUserId) {
    return {
      success: false,
      status: 400,
      code: "SELF_DEACTIVATION_FORBIDDEN",
      error: "An administrator cannot deactivate their own account",
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });

  if (!targetUser) {
    return {
      success: false,
      status: 404,
      code: "USER_NOT_FOUND",
      error: "Target user not found",
    };
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Log in AuditLog
  await prisma.auditLog
    .create({
      data: {
        adminId: adminUserId,
        action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
        targetEntity: "User",
        targetId: targetUserId,
        metadata: {
          userEmail: targetUser.email,
          previousState: targetUser.isActive,
          newState: isActive,
        },
      },
    })
    .catch((err) => console.error("[AUDIT_LOG_ERROR]", err));

  return {
    success: true,
    status: 200,
    user: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    },
  };
}

/**
 * Lists audit logs for admin governance and compliance.
 */
export async function getAdminAuditLogs(options?: {
  action?: string;
  targetEntity?: string;
  page?: number;
  limit?: number;
}): Promise<{
  logs: Array<{
    id: string;
    action: string;
    targetEntity: string;
    targetId: string;
    metadata: any;
    ipAddress: string | null;
    createdAt: string;
    admin: {
      fullName: string;
      email: string;
    };
  }>;
  auditLogs?: Array<any>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (options?.action) {
    whereClause.action = options.action;
  }
  if (options?.targetEntity) {
    whereClause.targetEntity = options.targetEntity;
  }

  const [total, rawLogs] = await Promise.all([
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.findMany({
      where: whereClause,
      include: {
        admin: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const logs = rawLogs.map((l) => ({
    id: l.id,
    adminId: l.adminId,
    action: l.action,
    targetEntity: l.targetEntity,
    targetId: l.targetId,
    metadata: l.metadata,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
    admin: {
      fullName: l.admin.fullName,
      email: l.admin.email,
    },
  }));

  return {
    logs,
    auditLogs: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * System health verification verifying live PostgreSQL connectivity and latency.
 */
export async function getSystemHealth(): Promise<SystemHealthData> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return {
      status: "HEALTHY",
      database: {
        status: "CONNECTED",
        connected: true,
        latencyMs,
      },
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
      },
      latencyMs,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      status: "DEGRADED",
      database: {
        status: "ERROR",
        connected: false,
        latencyMs,
      },
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
      },
      latencyMs,
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
