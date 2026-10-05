import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus, EarningStatus } from "@prisma/client";

// T+7 days clearance
const CLEARANCE_DAYS = 7;

export interface EarningsSettlementResult {
  success: boolean;
  status: number;
  code?: string;
  error?: string;
  data?: {
    orderId: string;
    itemsSettled: number;
    totalGrossPaise: number;
    totalPlatformFeePaise: number;
    totalNetEarningsPaise: number;
    sellerEarnings: Array<{
      id: string;
      sellerId: string;
      orderItemId: string;
      grossAmountPaise: number;
      platformFeePaise: number;
      netEarningsPaise: number;
      status: EarningStatus;
      availableOn: string;
    }>;
    platformLedgerIds: string[];
    idempotent: boolean;
  };
}

/**
 * Atomically settle seller earnings and platform ledger entries for a PAID order.
 *
 * Financial Invariants:
 *   1. Order.status MUST be PAID and Payment.status MUST be CAPTURED.
 *   2. Uses OrderItem.pricePaise / platformFeePaise / sellerEarningsPaise snapshots — never re-reads product price.
 *   3. gross = platformFee + netSeller MUST hold for every line item.
 *   4. Idempotent — second invocation returns existing records without creating duplicates.
 *   5. Concurrent calls are protected by unique constraint on (orderId, orderItemId).
 *
 * Security Invariants:
 *   - sellerId derived from OrderItem.sellerId — NEVER from client input.
 *   - No bank details, PAN, secrets, or credential data is processed or returned.
 */
export async function settleSellerEarnings(
  orderId: string
): Promise<EarningsSettlementResult> {
  // -----------------------------------------------------------------------
  // 1. Load Order with PAID status + items + CAPTURED payment
  // -----------------------------------------------------------------------
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          seller: {
            select: {
              id: true,
              storeName: true,
              status: true,
            },
          },
          product: {
            select: { id: true, title: true },
          },
        },
      },
      payments: {
        where: { status: PaymentStatus.CAPTURED },
        take: 1,
      },
      sellerEarnings: true,
      platformLedgers: true,
    },
  });

  if (!order) {
    return {
      success: false,
      status: 404,
      code: "ORDER_NOT_FOUND",
      error: `Order '${orderId}' not found`,
    };
  }

  // 2. Payment gate — PAID + CAPTURED required
  if (order.status !== OrderStatus.PAID) {
    return {
      success: false,
      status: 400,
      code: "ORDER_NOT_PAID",
      error: `Order is in state '${order.status}'. Only PAID orders can be settled.`,
    };
  }

  if (order.payments.length === 0) {
    return {
      success: false,
      status: 400,
      code: "PAYMENT_NOT_CAPTURED",
      error: "No CAPTURED payment found for this order.",
    };
  }

  if (order.items.length === 0) {
    return {
      success: false,
      status: 400,
      code: "ORDER_HAS_NO_ITEMS",
      error: "Order has no OrderItems to settle.",
    };
  }

  // -----------------------------------------------------------------------
  // 3. Idempotency check — if already settled, return existing records
  // -----------------------------------------------------------------------
  const settledItemIds = new Set(
    order.sellerEarnings.map((e) => e.orderItemId ?? "")
  );
  const allSettled =
    order.items.length > 0 &&
    order.items.every((item) => settledItemIds.has(item.id));

  if (allSettled) {
    const existing = order.sellerEarnings;
    const totalGross = existing.reduce((s, e) => s + e.grossAmountPaise, 0);
    const totalFee = existing.reduce((s, e) => s + e.platformFeePaise, 0);
    const totalNet = existing.reduce((s, e) => s + e.netEarningsPaise, 0);
    return {
      success: true,
      status: 200,
      data: {
        orderId,
        itemsSettled: existing.length,
        totalGrossPaise: totalGross,
        totalPlatformFeePaise: totalFee,
        totalNetEarningsPaise: totalNet,
        sellerEarnings: existing.map((e) => ({
          id: e.id,
          sellerId: e.sellerId,
          orderItemId: e.orderItemId ?? "",
          grossAmountPaise: e.grossAmountPaise,
          platformFeePaise: e.platformFeePaise,
          netEarningsPaise: e.netEarningsPaise,
          status: e.status,
          availableOn: e.availableOn.toISOString(),
        })),
        platformLedgerIds: order.platformLedgers.map((l) => l.id),
        idempotent: true,
      },
    };
  }

  // -----------------------------------------------------------------------
  // 4. Atomic settlement transaction
  // -----------------------------------------------------------------------
  const availableOn = new Date(
    Date.now() + CLEARANCE_DAYS * 24 * 60 * 60 * 1000
  );

  // Financial validation — verify invariants from frozen OrderItem snapshots
  for (const item of order.items) {
    const gross = item.pricePaise;
    const fee = item.platformFeePaise;
    const net = item.sellerEarningsPaise;

    if (gross <= 0) {
      return {
        success: false,
        status: 400,
        code: "INVALID_ORDER_ITEM_AMOUNT",
        error: `OrderItem ${item.id} has non-positive gross amount.`,
      };
    }
    if (fee < 0 || net < 0) {
      return {
        success: false,
        status: 400,
        code: "INVALID_FINANCIAL_SNAPSHOT",
        error: `OrderItem ${item.id} has negative fee or net earnings.`,
      };
    }
    // Invariant: gross = fee + net
    if (gross !== fee + net) {
      return {
        success: false,
        status: 400,
        code: "FINANCIAL_INVARIANT_VIOLATION",
        error: `OrderItem ${item.id}: gross(${gross}) ≠ fee(${fee}) + net(${net})`,
      };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const createdEarnings: Awaited<ReturnType<typeof tx.sellerEarning.create>>[] = [];
      const createdLedgerIds: string[] = [];

      for (const item of order.items) {
        // Skip already settled items
        if (settledItemIds.has(item.id)) continue;

        const gross = item.pricePaise;
        const fee = item.platformFeePaise;
        const net = item.sellerEarningsPaise;
        const sellerId = item.sellerId; // Authoritative from DB — not from client

        // Create SellerEarning record
        const earning = await tx.sellerEarning.create({
          data: {
            sellerId,
            orderId,
            orderItemId: item.id,
            grossAmountPaise: gross,
            platformFeePaise: fee,
            netEarningsPaise: net,
            status: EarningStatus.PENDING,
            availableOn,
          },
        });
        createdEarnings.push(earning);

        // Create PlatformLedger record
        const ledger = await tx.platformLedger.create({
          data: {
            orderId,
            orderItemId: item.id,
            feePaise: fee,
            grossAmountPaise: gross,
            netSellerPaise: net,
            status: "RECORDED",
          },
        });
        createdLedgerIds.push(ledger.id);

        // Update SellerProfile balance atomically (using BigInt fields)
        await tx.sellerProfile.update({
          where: { id: sellerId },
          data: {
            totalRevenuePaise: { increment: gross },
            netEarningsPaise: { increment: net },
            pendingBalance: { increment: net },
          },
        });
      }

      return { createdEarnings, createdLedgerIds };
    });

    const totalGross = result.createdEarnings.reduce(
      (s, e) => s + e.grossAmountPaise,
      0
    );
    const totalFee = result.createdEarnings.reduce(
      (s, e) => s + e.platformFeePaise,
      0
    );
    const totalNet = result.createdEarnings.reduce(
      (s, e) => s + e.netEarningsPaise,
      0
    );

    return {
      success: true,
      status: 200,
      data: {
        orderId,
        itemsSettled: result.createdEarnings.length,
        totalGrossPaise: totalGross,
        totalPlatformFeePaise: totalFee,
        totalNetEarningsPaise: totalNet,
        sellerEarnings: result.createdEarnings.map((e) => ({
          id: e.id,
          sellerId: e.sellerId,
          orderItemId: e.orderItemId ?? "",
          grossAmountPaise: e.grossAmountPaise,
          platformFeePaise: e.platformFeePaise,
          netEarningsPaise: e.netEarningsPaise,
          status: e.status,
          availableOn: e.availableOn.toISOString(),
        })),
        platformLedgerIds: result.createdLedgerIds,
        idempotent: false,
      },
    };
  } catch (error) {
    // Handle unique constraint violation (concurrent requests)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      // Re-fetch to return idempotent response
      return settleSellerEarnings(orderId);
    }
    console.error("[SELLER_EARNINGS_SETTLEMENT_ERROR]", error);
    return {
      success: false,
      status: 500,
      code: "SETTLEMENT_FAILED",
      error: "An unexpected error occurred during financial settlement.",
    };
  }
}
