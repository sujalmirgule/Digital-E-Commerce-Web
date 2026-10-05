import { prisma } from "@/lib/prisma";
import {
  OrderStatus,
  PaymentStatus,
  EntitlementStatus,
  EarningStatus,
  RefundStatus,
  NotificationType,
} from "@prisma/client";
import { refundRazorpayPayment } from "@/lib/payment/razorpay";
import { createNotification } from "@/lib/services/notification";

// -----------------------------------------------------------------------------
// 1. ORDER & PAYMENT STATE MACHINES
// -----------------------------------------------------------------------------

/**
 * Authoritative map of valid transitions for OrderStatus.
 * Prevents arbitrary status jumps.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [
    OrderStatus.PAYMENT_PROCESSING,
    OrderStatus.CANCELLED,
    OrderStatus.PAID,
    OrderStatus.FAILED,
  ],
  PAYMENT_PROCESSING: [
    OrderStatus.PAID,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
  ],
  PAID: [
    OrderStatus.REFUND_REQUESTED,
    OrderStatus.REFUNDED,
  ],
  REFUND_REQUESTED: [
    OrderStatus.REFUNDED,
    OrderStatus.PAID, // When refund dispute/request is rejected/dismissed
  ],
  FAILED: [], // Terminal
  CANCELLED: [], // Terminal
  REFUNDED: [], // Terminal
  PARTIALLY_REFUNDED: [
    OrderStatus.REFUNDED,
  ],
};

/**
 * Checks whether an Order transition is architecturally valid.
 */
export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true; // Idempotent same-state
  return VALID_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Authoritative map of valid transitions for PaymentStatus.
 */
export const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: [
    PaymentStatus.AUTHORIZED,
    PaymentStatus.CAPTURED,
    PaymentStatus.FAILED,
  ],
  AUTHORIZED: [
    PaymentStatus.CAPTURED,
    PaymentStatus.FAILED,
  ],
  CAPTURED: [
    PaymentStatus.REFUNDED,
  ],
  FAILED: [], // Terminal
  REFUNDED: [], // Terminal
};

/**
 * Checks whether a Payment transition is architecturally valid.
 */
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return VALID_PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

// -----------------------------------------------------------------------------
// 2. ORDER CANCELLATION
// -----------------------------------------------------------------------------

export interface CancelOrderParams {
  orderId: string;
  userId: string;
  isAdmin?: boolean;
  reason?: string;
}

export interface CancelOrderResult {
  success: boolean;
  status: number;
  code?: string;
  error?: string;
  data?: {
    orderId: string;
    previousStatus: OrderStatus;
    status: OrderStatus;
    cancelledAt: string;
    reason: string;
    idempotent?: boolean;
  };
}

/**
 * Cancels an order that has not yet been paid.
 *
 * Rules:
 *  - Only PENDING or PAYMENT_PROCESSING orders may be cancelled.
 *  - PAID orders CANNOT be cancelled; a refund must be requested instead.
 *  - Terminal states (CANCELLED, FAILED, REFUNDED) cannot be cancelled.
 *  - Idempotent: cancelling an already CANCELLED order returns safe 200 with idempotent: true.
 *  - Strictly checks buyer ownership (or ADMIN privileges).
 */
export async function cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
  const { orderId, userId, isAdmin = false, reason = "Cancelled by buyer" } = params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });

  if (!order) {
    return {
      success: false,
      status: 404,
      code: "ORDER_NOT_FOUND",
      error: `Order '${orderId}' not found`,
    };
  }

  // IDOR check: only buyer or admin can cancel
  if (order.buyerId !== userId && !isAdmin) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      error: "You are not authorized to cancel this order",
    };
  }

  // Idempotency: if already cancelled
  if (order.status === OrderStatus.CANCELLED) {
    return {
      success: true,
      status: 200,
      data: {
        orderId: order.id,
        previousStatus: OrderStatus.CANCELLED,
        status: OrderStatus.CANCELLED,
        cancelledAt: order.updatedAt.toISOString(),
        reason: order.failureReason || reason,
        idempotent: true,
      },
    };
  }

  // Gate: Paid orders require a refund, not cancellation
  if (order.status === OrderStatus.PAID || order.status === OrderStatus.REFUND_REQUESTED) {
    return {
      success: false,
      status: 400,
      code: "ORDER_ALREADY_PAID",
      error: "Paid orders cannot be cancelled directly. Please submit a refund request.",
    };
  }

  // Gate: Refunded orders cannot be cancelled
  if (order.status === OrderStatus.REFUNDED || order.status === OrderStatus.PARTIALLY_REFUNDED) {
    return {
      success: false,
      status: 400,
      code: "ORDER_ALREADY_REFUNDED",
      error: "Order has already been refunded and cannot be cancelled.",
    };
  }

  // Gate: Failed orders cannot be cancelled
  if (order.status === OrderStatus.FAILED) {
    return {
      success: false,
      status: 400,
      code: "ORDER_FAILED",
      error: "Order is already marked as failed.",
    };
  }

  // Verify transition validity
  if (!canTransitionOrder(order.status, OrderStatus.CANCELLED)) {
    return {
      success: false,
      status: 400,
      code: "INVALID_STATE_TRANSITION",
      error: `Cannot transition order from '${order.status}' to 'CANCELLED'.`,
    };
  }

  // Execute cancellation atomically
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        failureReason: reason,
        updatedAt: now,
      },
    });

    // Mark any uncaptured payment attempts as FAILED
    await tx.payment.updateMany({
      where: {
        orderId: order.id,
        status: { in: [PaymentStatus.CREATED, PaymentStatus.AUTHORIZED] },
      },
      data: {
        status: PaymentStatus.FAILED,
        errorDescription: `Order cancelled by ${isAdmin ? "administrator" : "buyer"}: ${reason}`,
      },
    });
  });

  return {
    success: true,
    status: 200,
    data: {
      orderId: order.id,
      previousStatus: order.status,
      status: OrderStatus.CANCELLED,
      cancelledAt: now.toISOString(),
      reason,
      idempotent: false,
    },
  };
}

// -----------------------------------------------------------------------------
// 3. REFUND REQUEST SUBMISSION (BUYER FLOW)
// -----------------------------------------------------------------------------

export interface RequestRefundParams {
  orderId: string;
  buyerId: string;
  reason: string;
}

export interface RequestRefundResult {
  success: boolean;
  status: number;
  code?: string;
  error?: string;
  data?: {
    requestId: string;
    orderId: string;
    buyerId: string;
    amountPaise: number;
    reason: string;
    status: RefundStatus;
    orderStatus: OrderStatus;
    createdAt: string;
  };
}

/**
 * Submits a refund request on a paid order for admin evaluation.
 *
 * Rules:
 *  - Order must be strictly in PAID state.
 *  - Buyer must be the owner of the order.
 *  - Cannot submit if already in REFUND_REQUESTED or REFUNDED.
 *  - Transitions order to REFUND_REQUESTED.
 *  - Does NOT directly mark the order REFUNDED.
 */
export async function requestRefund(params: RequestRefundParams): Promise<RequestRefundResult> {
  const { orderId, buyerId, reason } = params;

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      status: 400,
      code: "INVALID_REASON",
      error: "Refund reason must be at least 5 characters long.",
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      refundRequests: {
        where: { status: RefundStatus.PENDING },
      },
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

  // IDOR protection: only buyer who owns the order can request refund
  if (order.buyerId !== buyerId) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      error: "You are not authorized to request a refund for this order.",
    };
  }

  // Order state validation
  if (order.status === OrderStatus.REFUNDED || order.status === OrderStatus.PARTIALLY_REFUNDED) {
    return {
      success: false,
      status: 400,
      code: "ORDER_ALREADY_REFUNDED",
      error: "This order has already been refunded.",
    };
  }

  if (order.status === OrderStatus.REFUND_REQUESTED || order.refundRequests.length > 0) {
    return {
      success: false,
      status: 409,
      code: "REFUND_ALREADY_REQUESTED",
      error: "A refund request is already pending review for this order.",
    };
  }

  if (order.status === OrderStatus.CANCELLED) {
    return {
      success: false,
      status: 400,
      code: "ORDER_CANCELLED",
      error: "Cannot request a refund on a cancelled order.",
    };
  }

  if (order.status !== OrderStatus.PAID) {
    return {
      success: false,
      status: 400,
      code: "ORDER_NOT_PAID",
      error: `Cannot request a refund on an order in status '${order.status}'. Must be PAID.`,
    };
  }

  // Verify transition validity
  if (!canTransitionOrder(order.status, OrderStatus.REFUND_REQUESTED)) {
    return {
      success: false,
      status: 400,
      code: "INVALID_STATE_TRANSITION",
      error: `Cannot transition order from '${order.status}' to 'REFUND_REQUESTED'.`,
    };
  }

  // Atomic state change: Order -> REFUND_REQUESTED and create RefundRequest record
  const result = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.REFUND_REQUESTED,
        refundReason: reason.trim(),
      },
    });

    const refundRequest = await tx.refundRequest.create({
      data: {
        orderId: order.id,
        buyerId: order.buyerId,
        reason: reason.trim(),
        amountPaise: order.totalAmountPaise,
        status: RefundStatus.PENDING,
      },
    });

    return { updatedOrder, refundRequest };
  });

  // Notify buyer asynchronously
  createNotification({
    userId: order.buyerId,
    type: NotificationType.ACCOUNT_ALERT,
    title: "Refund Request Submitted",
    message: `Your refund request for order #${order.id} has been received and is under administrative review.`,
    linkUrl: `/dashboard/orders/${order.id}`,
    dedupKey: `refund_request_submitted_${result.refundRequest.id}`,
    metadata: { orderId: order.id, requestId: result.refundRequest.id },
  }).catch((err) => console.error("[REFUND_NOTIFICATION_ERROR]", err));

  return {
    success: true,
    status: 201,
    data: {
      requestId: result.refundRequest.id,
      orderId: result.updatedOrder.id,
      buyerId: result.updatedOrder.buyerId,
      amountPaise: result.refundRequest.amountPaise,
      reason: result.refundRequest.reason,
      status: result.refundRequest.status,
      orderStatus: result.updatedOrder.status,
      createdAt: result.refundRequest.createdAt.toISOString(),
    },
  };
}

// -----------------------------------------------------------------------------
// 4. AUTHORITATIVE REFUND EXECUTION (ADMIN / GATEWAY WEBHOOK)
// -----------------------------------------------------------------------------

export interface ProcessOrderRefundParams {
  orderId: string;
  adminId?: string;
  reason?: string;
  note?: string;
  isWebhook?: boolean;
}

export interface ProcessOrderRefundResult {
  success: boolean;
  status: number;
  code?: string;
  error?: string;
  data?: {
    orderId: string;
    status: OrderStatus;
    providerRefundId: string;
    amountRefundedPaise: number;
    entitlementsRevoked: number;
    downloadsDeactivated: number;
    earningsReversed: number;
    sellerBalanceAdjustments: Array<{
      sellerId: string;
      grossDeductedPaise: number;
      netDeductedPaise: number;
    }>;
    refundedAt: string;
    idempotent: boolean;
  };
}

/**
 * Authoritatively executes an order refund with complete financial reversal.
 *
 * Requirements & Invariants:
 *  1. Only ADMIN or verified gateway webhook may initiate.
 *  2. Server authoritatively determines amounts, buyerId, sellerId, and balances.
 *  3. Calls authoritative Razorpay Refund API — NEVER fakes provider confirmation.
 *  4. Idempotency: Retrying on an already REFUNDED order safely returns existing refund details.
 *  5. Concurrency: Protected against concurrent duplicate calls — executes exactly one reversal.
 *  6. Revokes Entitlements (status: REVOKED, isActive: false).
 *  7. Deactivates Downloads (isActive: false).
 *  8. Reverses SellerEarnings (status: REFUNDED_DEDUCTED) and PlatformLedger (status: REVERSED).
 *  9. Reverses SellerProfile balances (pendingBalance or availableBalance, totalRevenue, netEarnings).
 *  10. Preserves historical Receipt intact.
 *  11. Dispatches notifications to Buyer and Sellers.
 *  12. Records AuditLog.
 */
export async function processOrderRefund(
  params: ProcessOrderRefundParams
): Promise<ProcessOrderRefundResult> {
  const { orderId, adminId = "SYSTEM", reason = "Administrative refund", note, isWebhook = false } = params;

  // 1. Initial lookup to verify order state and idempotency
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: true,
      items: true,
      entitlements: true,
      downloads: true,
      sellerEarnings: true,
      platformLedgers: true,
      refundRequests: { where: { status: RefundStatus.PENDING } },
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

  // Idempotency: If already REFUNDED, return safe idempotent 200 without calling provider or mutating DB
  if (order.status === OrderStatus.REFUNDED) {
    return {
      success: true,
      status: 200,
      data: {
        orderId: order.id,
        status: OrderStatus.REFUNDED,
        providerRefundId: order.providerRefundId || "rfnd_already_processed",
        amountRefundedPaise: order.totalAmountPaise,
        entitlementsRevoked: order.entitlements.filter((e) => !e.isActive).length,
        downloadsDeactivated: order.downloads.filter((d) => !d.isActive).length,
        earningsReversed: order.sellerEarnings.filter(
          (e) => e.status === EarningStatus.REFUNDED_DEDUCTED
        ).length,
        sellerBalanceAdjustments: [],
        refundedAt: order.refundedAt?.toISOString() || order.updatedAt.toISOString(),
        idempotent: true,
      },
    };
  }

  // State gate: Must be PAID or REFUND_REQUESTED
  if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.REFUND_REQUESTED) {
    return {
      success: false,
      status: 400,
      code: "INVALID_ORDER_STATE",
      error: `Order '${orderId}' is in state '${order.status}' and cannot be refunded. Only PAID orders can be refunded.`,
    };
  }

  // Payment gate: Order must have at least one CAPTURED payment
  const capturedPayment = order.payments.find(
    (p) => p.status === PaymentStatus.CAPTURED
  );

  if (!capturedPayment) {
    return {
      success: false,
      status: 400,
      code: "NO_CAPTURED_PAYMENT",
      error: "Order has no CAPTURED payment record to refund.",
    };
  }

  // 2. Call authoritative Razorpay Refund API
  // Never fake a refund without provider confirmation
  let refundResult: Awaited<ReturnType<typeof refundRazorpayPayment>>;
  try {
    refundResult = await refundRazorpayPayment({
      paymentId: capturedPayment.razorpayPaymentId,
      amountPaise: order.totalAmountPaise,
      notes: {
        orderId: order.id,
        adminId,
        reason,
      },
      receipt: `REF-${order.id}`,
    });
  } catch (providerErr: any) {
    console.error("[PROVIDER_REFUND_ERROR]", providerErr);
    return {
      success: false,
      status: 502,
      code: "PROVIDER_REFUND_FAILED",
      error: providerErr.message || "Payment gateway rejected or failed the refund request.",
    };
  }

  const providerRefundId = refundResult.refundId;
  const now = new Date();

  // 3. Execute atomic financial reversal and state transitions in Prisma transaction
  try {
    const reversalResult = await prisma.$transaction(async (tx) => {
      // Re-fetch order inside transaction to protect against concurrent execution
      const freshOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          sellerEarnings: true,
          platformLedgers: true,
        },
      });

      if (!freshOrder) {
        throw new Error("ORDER_NOT_FOUND");
      }

      // If a concurrent transaction already refunded it, abort gracefully
      if (freshOrder.status === OrderStatus.REFUNDED) {
        return {
          alreadyRefunded: true,
          providerRefundId: freshOrder.providerRefundId || providerRefundId,
          sellerAdjustments: [],
        };
      }

      // 3.1 Update Order state
      await tx.order.update({
        where: { id: freshOrder.id },
        data: {
          status: OrderStatus.REFUNDED,
          refundedAt: now,
          refundReason: reason,
          providerRefundId,
        },
      });

      // 3.2 Update Payment state
      await tx.payment.update({
        where: { id: capturedPayment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundId: providerRefundId,
          refundedAt: now,
        },
      });

      // 3.3 Revoke Entitlements
      const entitlementUpdate = await tx.entitlement.updateMany({
        where: { orderId: freshOrder.id, isActive: true },
        data: {
          status: EntitlementStatus.REVOKED,
          isActive: false,
          revokedAt: now,
        },
      });

      // 3.4 Deactivate Downloads
      const downloadUpdate = await tx.download.updateMany({
        where: { orderId: freshOrder.id, isActive: true },
        data: {
          isActive: false,
        },
      });

      // 3.5 Reverse Seller Earnings and Adjust Seller Profile Balances
      const sellerAdjustments: Array<{
        sellerId: string;
        grossDeductedPaise: number;
        netDeductedPaise: number;
      }> = [];

      for (const earning of freshOrder.sellerEarnings) {
        // Skip if already marked refunded
        if (earning.status === EarningStatus.REFUNDED_DEDUCTED) continue;

        const gross = earning.grossAmountPaise;
        const net = earning.netEarningsPaise;
        const sellerId = earning.sellerId;

        // Update earning status to REFUNDED_DEDUCTED
        await tx.sellerEarning.update({
          where: { id: earning.id },
          data: {
            status: EarningStatus.REFUNDED_DEDUCTED,
          },
        });

        // Deduct from SellerProfile balances (BigInt safe arithmetic)
        const profile = await tx.sellerProfile.findUnique({
          where: { id: sellerId },
          select: {
            id: true,
            totalRevenuePaise: true,
            netEarningsPaise: true,
            pendingBalance: true,
            availableBalance: true,
          },
        });

        if (profile) {
          const grossBig = BigInt(gross);
          const netBig = BigInt(net);

          // Clamped non-negative updates
          const newRevenue = profile.totalRevenuePaise > grossBig
            ? profile.totalRevenuePaise - grossBig
            : BigInt(0);
          const newNet = profile.netEarningsPaise > netBig
            ? profile.netEarningsPaise - netBig
            : BigInt(0);

          if (earning.status === EarningStatus.PENDING) {
            const newPending = profile.pendingBalance > netBig
              ? profile.pendingBalance - netBig
              : BigInt(0);

            await tx.sellerProfile.update({
              where: { id: sellerId },
              data: {
                totalRevenuePaise: newRevenue,
                netEarningsPaise: newNet,
                pendingBalance: newPending,
              },
            });
          } else if (earning.status === EarningStatus.AVAILABLE) {
            const newAvailable = profile.availableBalance > netBig
              ? profile.availableBalance - netBig
              : BigInt(0);

            await tx.sellerProfile.update({
              where: { id: sellerId },
              data: {
                totalRevenuePaise: newRevenue,
                netEarningsPaise: newNet,
                availableBalance: newAvailable,
              },
            });
          }

          sellerAdjustments.push({
            sellerId,
            grossDeductedPaise: gross,
            netDeductedPaise: net,
          });
        }
      }

      // 3.6 Reverse Platform Ledger entries
      await tx.platformLedger.updateMany({
        where: { orderId: freshOrder.id },
        data: {
          status: "REVERSED",
        },
      });

      // 3.7 Update any pending RefundRequest records
      await tx.refundRequest.updateMany({
        where: { orderId: freshOrder.id, status: RefundStatus.PENDING },
        data: {
          status: RefundStatus.APPROVED,
          providerRefundId,
          adminNotes: note || reason,
          processedByAdminId: adminId,
          updatedAt: now,
        },
      });

      // 3.8 Record AuditLog
      // Check if admin user exists before setting foreign key
      const adminExists = adminId !== "SYSTEM" ? await tx.user.findUnique({ where: { id: adminId } }) : null;
      if (adminExists) {
        await tx.auditLog.create({
          data: {
            adminId,
            action: "REFUND_ORDER",
            targetEntity: "Order",
            targetId: freshOrder.id,
            metadata: {
              providerRefundId,
              amountPaise: freshOrder.totalAmountPaise,
              reason,
              isWebhook,
            },
          },
        });
      }

      return {
        alreadyRefunded: false,
        providerRefundId,
        sellerAdjustments,
        entitlementsRevoked: entitlementUpdate.count,
        downloadsDeactivated: downloadUpdate.count,
        earningsReversed: freshOrder.sellerEarnings.length,
      };
    });

    if (reversalResult.alreadyRefunded) {
      return {
        success: true,
        status: 200,
        data: {
          orderId: order.id,
          status: OrderStatus.REFUNDED,
          providerRefundId: reversalResult.providerRefundId,
          amountRefundedPaise: order.totalAmountPaise,
          entitlementsRevoked: 0,
          downloadsDeactivated: 0,
          earningsReversed: 0,
          sellerBalanceAdjustments: [],
          refundedAt: now.toISOString(),
          idempotent: true,
        },
      };
    }

    // 4. Async Notifications (Buyer & Sellers)
    const amountRupees = (order.totalAmountPaise / 100).toFixed(2);

    // Notify buyer
    createNotification({
      userId: order.buyerId,
      type: NotificationType.REFUND_PROCESSED,
      title: "Refund Processed",
      message: `Your refund of ₹${amountRupees} for order #${order.id} has been processed successfully to your original payment method.`,
      linkUrl: `/dashboard/orders/${order.id}`,
      dedupKey: `refund_processed_buyer_${order.id}`,
      metadata: {
        orderId: order.id,
        amountPaise: order.totalAmountPaise,
        providerRefundId,
      },
    }).catch((err) => console.error("[REFUND_NOTIFICATION_BUYER_ERROR]", err));

    // Notify each seller
    const distinctSellerIds = Array.from(new Set(order.items.map((i) => i.sellerId)));
    for (const sellerProfileId of distinctSellerIds) {
      // Find the user for this seller profile
      prisma.sellerProfile
        .findUnique({
          where: { id: sellerProfileId },
          select: { userId: true },
        })
        .then((sp) => {
          if (sp?.userId) {
            createNotification({
              userId: sp.userId,
              type: NotificationType.REFUND_PROCESSED,
              title: "Order Refunded & Balance Adjusted",
              message: `Order #${order.id} was refunded. Your creator earnings ledger has been adjusted accordingly.`,
              linkUrl: "/seller/earnings",
              dedupKey: `refund_processed_seller_${order.id}_${sellerProfileId}`,
              metadata: {
                orderId: order.id,
                sellerProfileId,
              },
            }).catch((err) => console.error("[REFUND_NOTIFICATION_SELLER_ERROR]", err));
          }
        })
        .catch((err) => console.error("[SELLER_LOOKUP_ERROR]", err));
    }

    return {
      success: true,
      status: 200,
      data: {
        orderId: order.id,
        status: OrderStatus.REFUNDED,
        providerRefundId,
        amountRefundedPaise: order.totalAmountPaise,
        entitlementsRevoked: reversalResult.entitlementsRevoked ?? 0,
        downloadsDeactivated: reversalResult.downloadsDeactivated ?? 0,
        earningsReversed: reversalResult.earningsReversed ?? 0,
        sellerBalanceAdjustments: reversalResult.sellerAdjustments,
        refundedAt: now.toISOString(),
        idempotent: false,
      },
    };
  } catch (txError: any) {
    console.error("[REFUND_TRANSACTION_ERROR]", txError);
    return {
      success: false,
      status: 500,
      code: "REFUND_TRANSACTION_FAILED",
      error: "Financial reversal transaction encountered an unexpected error.",
    };
  }
}

// -----------------------------------------------------------------------------
// 5. REJECT REFUND REQUEST (ADMIN FLOW)
// -----------------------------------------------------------------------------

export interface RejectRefundRequestParams {
  requestId: string;
  adminId: string;
  adminNotes: string;
}

export interface RejectRefundRequestResult {
  success: boolean;
  status: number;
  code?: string;
  error?: string;
  data?: {
    requestId: string;
    orderId: string;
    status: RefundStatus;
    orderStatus: OrderStatus;
    adminNotes: string;
    processedAt: string;
  };
}

/**
 * Rejects a buyer's refund request and returns the order status from REFUND_REQUESTED back to PAID.
 */
export async function rejectRefundRequest(
  params: RejectRefundRequestParams
): Promise<RejectRefundRequestResult> {
  const { requestId, adminId, adminNotes } = params;

  if (!adminNotes || adminNotes.trim().length < 3) {
    return {
      success: false,
      status: 400,
      code: "INVALID_ADMIN_NOTES",
      error: "Rejection reason / explanation must be at least 3 characters long.",
    };
  }

  const request = await prisma.refundRequest.findUnique({
    where: { id: requestId },
    include: { order: true },
  });

  if (!request) {
    return {
      success: false,
      status: 404,
      code: "REQUEST_NOT_FOUND",
      error: `Refund request '${requestId}' not found`,
    };
  }

  if (request.status !== RefundStatus.PENDING) {
    return {
      success: false,
      status: 400,
      code: "REQUEST_NOT_PENDING",
      error: `Refund request is already in status '${request.status}' and cannot be rejected.`,
    };
  }

  const now = new Date();

  // Atomically update RefundRequest to REJECTED and Order back to PAID
  await prisma.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: request.id },
      data: {
        status: RefundStatus.REJECTED,
        adminNotes: adminNotes.trim(),
        processedByAdminId: adminId,
        updatedAt: now,
      },
    });

    await tx.order.update({
      where: { id: request.orderId },
      data: {
        status: OrderStatus.PAID,
      },
    });

    const adminExists = await tx.user.findUnique({ where: { id: adminId } });
    if (adminExists) {
      await tx.auditLog.create({
        data: {
          adminId,
          action: "REJECT_REFUND_REQUEST",
          targetEntity: "RefundRequest",
          targetId: request.id,
          metadata: {
            orderId: request.orderId,
            adminNotes,
          },
        },
      });
    }
  });

  // Notify buyer of the rejection
  createNotification({
    userId: request.buyerId,
    type: NotificationType.ACCOUNT_ALERT,
    title: "Refund Request Declined",
    message: `Your refund request for order #${request.orderId} was declined by administrators: ${adminNotes.trim()}`,
    linkUrl: `/dashboard/orders/${request.orderId}`,
    dedupKey: `refund_request_rejected_${request.id}`,
    metadata: {
      orderId: request.orderId,
      requestId: request.id,
      adminNotes,
    },
  }).catch((err) => console.error("[REJECT_REFUND_NOTIFICATION_ERROR]", err));

  return {
    success: true,
    status: 200,
    data: {
      requestId: request.id,
      orderId: request.orderId,
      status: RefundStatus.REJECTED,
      orderStatus: OrderStatus.PAID,
      adminNotes: adminNotes.trim(),
      processedAt: now.toISOString(),
    },
  };
}

// -----------------------------------------------------------------------------
// 6. ADMIN REFUNDS REGISTER & QUERY HELPERS
// -----------------------------------------------------------------------------

export interface GetAdminRefundsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export async function getAdminRefunds(params: GetAdminRefundsParams) {
  const { page = 1, limit = 20, status, search } = params;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status && status !== "ALL") {
    if (Object.values(RefundStatus).includes(status as RefundStatus)) {
      where.status = status as RefundStatus;
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { orderId: { contains: q, mode: "insensitive" } },
      { reason: { contains: q, mode: "insensitive" } },
      { buyer: { email: { contains: q, mode: "insensitive" } } },
      { buyer: { fullName: { contains: q, mode: "insensitive" } } },
      { providerRefundId: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, requests] = await Promise.all([
    prisma.refundRequest.count({ where }),
    prisma.refundRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmountPaise: true,
            currency: true,
            paidAt: true,
            refundedAt: true,
            providerRefundId: true,
            items: {
              select: {
                id: true,
                productTitle: true,
                pricePaise: true,
                seller: {
                  select: {
                    id: true,
                    storeName: true,
                  },
                },
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    }),
  ]);

  return {
    requests: requests.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      amountPaise: r.amountPaise,
      reason: r.reason,
      status: r.status,
      adminNotes: r.adminNotes,
      providerRefundId: r.providerRefundId || r.order.providerRefundId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      order: {
        id: r.order.id,
        status: r.order.status,
        totalAmountPaise: r.order.totalAmountPaise,
        currency: r.order.currency,
        paidAt: r.order.paidAt?.toISOString() || null,
        refundedAt: r.order.refundedAt?.toISOString() || null,
        items: r.order.items,
      },
      buyer: r.buyer,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves refund request details for a buyer's order.
 */
export async function getBuyerRefundRequest(orderId: string, buyerId: string) {
  const request = await prisma.refundRequest.findFirst({
    where: {
      orderId,
      buyerId,
    },
    orderBy: { createdAt: "desc" },
  });

  return request;
}
