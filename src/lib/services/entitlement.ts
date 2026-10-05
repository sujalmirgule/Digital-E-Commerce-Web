import { prisma } from "@/lib/prisma";
import { Entitlement, EntitlementStatus, OrderStatus, PaymentStatus } from "@prisma/client";

export interface ProvisionResult {
  success: boolean;
  status: number;
  code?: string;
  error?: string;
  orderId?: string;
  entitlements?: Array<{
    id: string;
    orderId: string;
    productId: string;
    status: EntitlementStatus;
    isActive: boolean;
    grantedAt: Date;
  }>;
  alreadyProvisioned?: boolean;
}

export interface BuyerLibraryProductDTO {
  id: string;
  title: string;
  slug: string;
  version: string;
  thumbnailUrl: string | null;
}

export interface BuyerLibraryFileDTO {
  id: string;
  filename: string;
  fileSize: number;
  downloadCount: number;
  maxAllowed: number | null;
}

export interface BuyerLibraryItemDTO {
  entitlementId: string;
  orderId: string;
  purchasedAt: string;
  product: BuyerLibraryProductDTO;
  file: BuyerLibraryFileDTO | null;
}

/**
 * Reusable server-side ownership check querying PostgreSQL.
 *
 * Returns true only if the user holds an ACTIVE, valid entitlement for the product.
 * Independent of client-submitted claims.
 */
export async function hasProductEntitlement(
  userId: string,
  productId: string
): Promise<boolean> {
  const count = await prisma.entitlement.count({
    where: {
      buyerId: userId,
      productId,
      isActive: true,
      status: EntitlementStatus.ACTIVE,
    },
  });
  return count > 0;
}

/**
 * Reusable helper to fetch an active entitlement for a user and product.
 * Useful for future download authorization layers.
 */
export async function getActiveEntitlement(
  userId: string,
  productId: string
) {
  return prisma.entitlement.findFirst({
    where: {
      buyerId: userId,
      productId,
      isActive: true,
      status: EntitlementStatus.ACTIVE,
    },
    select: {
      id: true,
      buyerId: true,
      orderId: true,
      productId: true,
      status: true,
      isActive: true,
      grantedAt: true,
    },
  });
}

/**
 * Authoritatively provisions digital entitlements for an authenticated buyer purchase.
 *
 * Flow & Invariants:
 *   1. Authenticated User must match Order.buyerId (or ADMIN).
 *   2. Order must be strictly in PAID state.
 *   3. At least one Payment record must be in CAPTURED state.
 *   4. Products are resolved strictly from OrderItems (never client input).
 *   5. Idempotent: safe replay returns existing entitlements without duplicates.
 *   6. Concurrent safe: handles unique constraint races (P2002) cleanly.
 *   7. Zero downloads created, zero storage keys leaked.
 */
export async function provisionOrderEntitlements({
  orderId,
  authenticatedUserId,
  requestedProductId,
  isAdmin = false,
}: {
  orderId: string;
  authenticatedUserId: string;
  requestedProductId?: string;
  isAdmin?: boolean;
}): Promise<ProvisionResult> {
  // 1. Fetch internal order with items and payments
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!order) {
    return {
      success: false,
      status: 404,
      code: "NOT_FOUND",
      error: `Order '${orderId}' not found`,
    };
  }

  // 2. Buyer authorization & cross-user access block
  if (order.buyerId !== authenticatedUserId && !isAdmin) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      error: "You are not authorized to provision entitlements for this order",
    };
  }

  // 3. Payment gate: Order must be PAID
  if (order.status !== OrderStatus.PAID) {
    return {
      success: false,
      status: 400,
      code: "ORDER_NOT_PAID",
      error: `Order must be in PAID status to provision entitlements. Current status: '${order.status}'`,
    };
  }

  // 4. Payment gate: Payment must be CAPTURED
  const hasCapturedPayment = order.payments.some(
    (p) => p.status === PaymentStatus.CAPTURED
  );
  if (!hasCapturedPayment) {
    return {
      success: false,
      status: 400,
      code: "PAYMENT_NOT_CAPTURED",
      error:
        "No captured payment found for this order. Entitlement provisioning requires a CAPTURED payment.",
    };
  }

  // 5. Order items validation
  if (!order.items || order.items.length === 0) {
    return {
      success: false,
      status: 400,
      code: "ORDER_HAS_NO_ITEMS",
      error: "Order does not contain any purchased items",
    };
  }

  // 6. Optional productId validation (product substitution guard)
  if (requestedProductId) {
    const itemMatches = order.items.some(
      (item) => item.productId === requestedProductId
    );
    if (!itemMatches) {
      return {
        success: false,
        status: 400,
        code: "PRODUCT_MISMATCH",
        error: `Product '${requestedProductId}' does not belong to the purchased items in order '${orderId}'`,
      };
    }
  }

  // 7. Check if all items in this order are already provisioned (Idempotency)
  const existingEntitlements = await prisma.entitlement.findMany({
    where: { orderId: order.id },
    select: {
      id: true,
      orderId: true,
      productId: true,
      status: true,
      isActive: true,
      grantedAt: true,
    },
  });

  const existingProductIds = new Set(
    existingEntitlements.map((e) => e.productId)
  );

  const missingItems = order.items.filter(
    (item) => !existingProductIds.has(item.productId)
  );

  if (missingItems.length === 0 && existingEntitlements.length > 0) {
    return {
      success: true,
      status: 200,
      orderId: order.id,
      entitlements: existingEntitlements,
      alreadyProvisioned: true,
    };
  }

  // 8. Provision missing entitlements with race condition protection
  const provisionedEntitlements: Array<{
    id: string;
    orderId: string;
    productId: string;
    status: EntitlementStatus;
    isActive: boolean;
    grantedAt: Date;
  }> = [...existingEntitlements];

  for (const item of missingItems) {
    // Verify product exists in database catalog
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { id: true, title: true, status: true },
    });

    if (!product) {
      return {
        success: false,
        status: 404,
        code: "PRODUCT_NOT_FOUND",
        error: `Product '${item.productId}' referenced in order item was not found`,
      };
    }

    try {
      const newEntitlement = await prisma.entitlement.create({
        data: {
          buyerId: order.buyerId,
          orderId: order.id,
          orderItemId: item.id,
          productId: item.productId,
          status: EntitlementStatus.ACTIVE,
          isActive: true,
          grantedAt: order.paidAt ?? new Date(),
        },
        select: {
          id: true,
          orderId: true,
          productId: true,
          status: true,
          isActive: true,
          grantedAt: true,
        },
      });
      provisionedEntitlements.push(newEntitlement);
    } catch (err: any) {
      if (err.code === "P2002") {
        // Unique constraint violation (orderId_productId): concurrent request created it
        const concurrentEntitlement = await prisma.entitlement.findUnique({
          where: {
            orderId_productId: {
              orderId: order.id,
              productId: item.productId,
            },
          },
          select: {
            id: true,
            orderId: true,
            productId: true,
            status: true,
            isActive: true,
            grantedAt: true,
          },
        });

        if (concurrentEntitlement) {
          provisionedEntitlements.push(concurrentEntitlement);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
  }

  return {
    success: true,
    status: 200,
    orderId: order.id,
    entitlements: provisionedEntitlements,
    alreadyProvisioned: false,
  };
}

/**
 * Retrieves the authenticated buyer's library according to the API contract.
 *
 * Never exposes storageKey, private file locations, password hashes, or seller KYC details.
 * Prevents duplicate items for the same product in the user's library.
 */
export async function getBuyerLibrary(
  userId: string
): Promise<BuyerLibraryItemDTO[]> {
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
          status: true,
          media: {
            where: { type: "THUMBNAIL" },
            select: { url: true },
            orderBy: { displayOrder: "asc" },
            take: 1,
          },
          files: {
            select: {
              id: true,
              originalFilename: true,
              fileSize: true,
              downloadLimit: true,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      grantedAt: "desc",
    },
  });

  const seenProductIds = new Set<string>();
  const libraryItems: BuyerLibraryItemDTO[] = [];

  for (const ent of entitlements) {
    // Duplicate prevention: each unique product appears once with latest order metadata
    if (seenProductIds.has(ent.productId)) {
      continue;
    }
    seenProductIds.add(ent.productId);

    const thumbnail = ent.product.media[0]?.url ?? null;
    const primaryFile = ent.product.files[0] ?? null;

    libraryItems.push({
      entitlementId: ent.id,
      orderId: ent.orderId,
      purchasedAt: (ent.order?.paidAt ?? ent.grantedAt).toISOString(),
      product: {
        id: ent.product.id,
        title: ent.product.title,
        slug: ent.product.slug,
        version: ent.product.version,
        thumbnailUrl: thumbnail,
      },
      file: primaryFile
        ? {
            id: primaryFile.id,
            filename: primaryFile.originalFilename,
            fileSize: Number(primaryFile.fileSize),
            downloadCount: 0, // Feature 12 boundary: actual download records not provisioned yet
            maxAllowed: primaryFile.downloadLimit ?? null,
          }
        : null,
    });
  }

  return libraryItems;
}
