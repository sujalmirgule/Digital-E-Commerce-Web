import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt, JwtPayload } from "@/lib/jwt";
import { apiSuccess, apiError } from "@/lib/api-response";
import { paymentVerifySchema } from "@/lib/validations/payment";
import { verifyPaymentSignature } from "@/lib/payment/razorpay";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { settleSellerEarnings } from "@/lib/services/seller-earnings";
import { generateReceiptForOrder } from "@/lib/services/receipt";
import { createNotification } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/payments/verify
 *
 * Cryptographically verifies Razorpay client payment callback using HMAC-SHA256.
 *
 * Flow:
 *   1. Authenticates buyer session via verified JWT.
 *   2. Strictly validates request body (orderId, razorpayOrderId, razorpayPaymentId, signature).
 *   3. Performs timing-safe HMAC-SHA256 signature verification.
 *   4. Verifies database order ownership and matching gateway reference.
 *   5. Idempotently returns success if order was already verified with same payment ID.
 *   6. Atomically updates Order to status PAID and creates Payment record in status CAPTURED.
 *   7. Strictly out of scope for Feature 11: Entitlements, Downloads, Invoices, Seller Earnings.
 *   8. Zero sensitive data leakage.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication is required to verify payment",
        401
      );
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
      return apiError(
        "UNAUTHORIZED",
        "Invalid authorization header format",
        401
      );
    }

    const token = parts[1].trim();
    const payload = verifyJwt<JwtPayload>(token);
    if (!payload || !payload.sub) {
      return apiError(
        "UNAUTHORIZED",
        "Invalid or expired authentication token",
        401
      );
    }

    const authUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (!authUser) {
      return apiError(
        "UNAUTHORIZED",
        "Authenticated user not found",
        401
      );
    }

    if (!authUser.isActive) {
      return apiError(
        "FORBIDDEN",
        "Your account is inactive or suspended. Cannot verify payment.",
        403
      );
    }

    // 2. Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid JSON format in request body",
        400
      );
    }

    const parseResult = paymentVerifySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid payment verification payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = parseResult.data;

    // 3. Cryptographic HMAC-SHA256 signature verification
    const isValidSignature = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      return apiError(
        "INVALID_SIGNATURE",
        "Payment verification failed: cryptographic signature mismatch",
        400
      );
    }

    // 4. Retrieve and verify internal database order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });

    if (!order) {
      return apiError("NOT_FOUND", `Order '${orderId}' not found`, 404);
    }

    // Authorization & IDOR protection: only buyer (or admin) can verify
    if (order.buyerId !== authUser.id && authUser.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "You are not authorized to verify this order",
        403
      );
    }

    // Verify order reference binds strictly to the given razorpayOrderId
    if (order.razorpayOrderId !== razorpayOrderId) {
      return apiError(
        "ORDER_MISMATCH",
        "Razorpay order ID does not match the internal order record",
        400
      );
    }

    // 5. Handle duplicate verification & idempotency
    if (order.status === OrderStatus.PAID) {
      // If already paid with the exact same payment reference -> safe idempotent 200
      if (order.razorpayPaymentId === razorpayPaymentId) {
        const downloadCount = await prisma.download.count({
          where: { orderId: order.id, isActive: true },
        });
        const downloadReady = downloadCount > 0;

        return apiSuccess(
          {
            orderId: order.id,
            status: "PAID",
            paidAt: order.paidAt,
            downloadReady,
            alreadyVerified: true,
            message: "Payment already verified for this order.",
          },
          "Payment already verified for this order.",
          200
        );
      } else {
        // Attempting to use a different payment ID on an already paid order
        return apiError(
          "ORDER_ALREADY_PAID",
          "This order has already been fulfilled with a different payment reference",
          409
        );
      }
    }

    // Order must be in a payable state (PENDING or PAYMENT_PROCESSING)
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.FAILED ||
      order.status === OrderStatus.REFUNDED
    ) {
      return apiError(
        "INVALID_ORDER_STATE",
        `Order is in terminal state '${order.status}' and cannot be verified`,
        400
      );
    }

    // 6. Atomic state transition in Prisma transaction
    const now = new Date();

    const [updatedOrder, paymentRecord] = await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: now,
          razorpayPaymentId,
          razorpaySignature,
        },
      }),
      prisma.payment.upsert({
        where: { razorpayPaymentId },
        create: {
          orderId: order.id,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          amountPaise: order.totalAmountPaise,
          currency: order.currency,
          status: PaymentStatus.CAPTURED,
          verifiedAt: now,
        },
        update: {
          status: PaymentStatus.CAPTURED,
          verifiedAt: now,
        },
      }),
    ]);

    // 7. Trigger Feature 14 seller earnings settlement (async, non-blocking, idempotent)
    // Settlement failure must NEVER roll back the PAID state.
    settleSellerEarnings(updatedOrder.id).catch((err) => {
      console.error("[SELLER_EARNINGS_SETTLEMENT_ERROR]", err);
    });

    // 8. Trigger Feature 15 automatic receipt generation (async, non-blocking, idempotent)
    // Receipt failure must NEVER roll back the PAID state.
    generateReceiptForOrder(updatedOrder.id).catch((err) => {
      console.error("[RECEIPT_GENERATION_ERROR]", err);
    });

    // 9. Trigger Feature 20 payment notifications (async, non-blocking)
    // Notify the buyer their payment succeeded
    createNotification({
      userId: authUser.id,
      type: "PAYMENT_SUCCESS",
      title: "Payment Successful",
      message: `Your payment was confirmed. Order #${updatedOrder.id} is ready.`,
      linkUrl: `/buyer/orders/${updatedOrder.id}`,
      dedupKey: `payment_success_${updatedOrder.id}`,
      metadata: { orderId: updatedOrder.id, amountPaise: updatedOrder.totalAmountPaise },
    }).catch((err) => console.error("[PAYMENT_NOTIFICATION_BUYER_ERROR]", err));

    // Notify the seller(s) of a new purchase — fetch order items to get seller IDs
    prisma.orderItem.findMany({
      where: { orderId: updatedOrder.id },
      include: { product: { include: { seller: { select: { userId: true } } } } },
    }).then((items) => {
      const sellerIdSet = new Set(items.map((i) => i.product.seller.userId));
      const sellerIds = Array.from(sellerIdSet);
      return Promise.all(
        sellerIds.map((sellerId) =>
          createNotification({
            userId: sellerId,
            type: "NEW_SALE",
            title: "New Sale!",
            message: `You have a new purchase. Order #${updatedOrder.id} has been placed.`,
            linkUrl: "/seller/orders",
            dedupKey: `new_sale_${updatedOrder.id}_${sellerId}`,
            metadata: { orderId: updatedOrder.id },
          })
        )
      );
    }).catch((err) => console.error("[PAYMENT_NOTIFICATION_SELLER_ERROR]", err));

    // 9. Check if digital downloads are provisioned (Feature 12 boundary check)
    const downloadCount = await prisma.download.count({
      where: { orderId: updatedOrder.id, isActive: true },
    });
    const downloadReady = downloadCount > 0;

    const message = downloadReady
      ? "Payment verified successfully. Your files are ready."
      : "Payment verified successfully.";

    // 10. Return safe checkout verification response (zero sensitive data leakage)
    return apiSuccess(
      {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        paidAt: updatedOrder.paidAt,
        receiptId: `REC-${updatedOrder.id.replace(/^ORD-/, "")}`,
        downloadReady,
        message,
        payment: {
          id: paymentRecord.id,
          amountPaise: paymentRecord.amountPaise,
          currency: paymentRecord.currency,
          status: paymentRecord.status,
          verifiedAt: paymentRecord.verifiedAt,
        },
      },
      message,
      200
    );
  } catch (error) {
    console.error("[PAYMENT_VERIFICATION_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred during payment verification",
      500
    );
  }
}
