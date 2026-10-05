import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { settleSellerEarnings } from "@/lib/services/seller-earnings";
import { generateReceiptForOrder } from "@/lib/services/receipt";
import { createNotification } from "@/lib/services/notification";
import { processOrderRefund } from "@/lib/services/order-lifecycle";

export const dynamic = "force-dynamic";

/**
 * Validates Razorpay webhook cryptographic HMAC-SHA256 signature.
 */
function validateWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/v1/payments/webhook
 *
 * Authoritative Server-to-Server webhook listener for asynchronous Razorpay events:
 *  - payment.captured / order.paid
 *  - refund.processed / payment.refunded
 *  - payment.failed
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    const isMock =
      process.env.MOCK_PAYMENTS === "true" ||
      !webhookSecret ||
      webhookSecret === "your_razorpay_webhook_secret";

    // Validate signature unless in explicit test mock mode
    if (!isMock) {
      const isValid = validateWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return apiError("INVALID_SIGNATURE", "Webhook signature verification failed", 400);
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return apiError("INVALID_JSON", "Malformed webhook JSON payload", 400);
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const refundEntity = payload.payload?.refund?.entity;
    const orderEntity = payload.payload?.order?.entity;

    // 1. Handle Refund Processed Event
    if (event === "refund.processed" || event === "payment.refunded") {
      const paymentId = refundEntity?.payment_id || paymentEntity?.id;
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;

      // Find order by razorpayPaymentId or razorpayOrderId or refundEntity.notes.orderId
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            ...(paymentId ? [{ razorpayPaymentId: paymentId }] : []),
            ...(rzpOrderId ? [{ razorpayOrderId: rzpOrderId }] : []),
            ...(refundEntity?.notes?.orderId ? [{ id: refundEntity.notes.orderId }] : []),
          ],
        },
      });

      if (order) {
        await processOrderRefund({
          orderId: order.id,
          adminId: "SYSTEM",
          reason: "Gateway webhook: refund.processed",
          isWebhook: true,
        });
      }

      return apiSuccess({ received: true, event }, "Refund webhook processed", 200);
    }

    // 2. Handle Payment Captured Event
    if (event === "payment.captured" || event === "order.paid") {
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rzpPaymentId = paymentEntity?.id;

      if (!rzpOrderId) {
        return apiSuccess({ received: true }, "No order ID in payload", 200);
      }

      const order = await prisma.order.findUnique({
        where: { razorpayOrderId: rzpOrderId },
      });

      if (order && order.status !== OrderStatus.PAID && order.status !== OrderStatus.REFUNDED) {
        const now = new Date();
        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PAID,
              paidAt: now,
              razorpayPaymentId: rzpPaymentId || order.razorpayPaymentId,
            },
          }),
          prisma.payment.upsert({
            where: { razorpayPaymentId: rzpPaymentId || order.razorpayPaymentId || `pay_${order.id}` },
            create: {
              orderId: order.id,
              razorpayOrderId: rzpOrderId,
              razorpayPaymentId: rzpPaymentId || `pay_${order.id}`,
              amountPaise: order.totalAmountPaise,
              currency: order.currency,
              status: PaymentStatus.CAPTURED,
              verifiedAt: now,
              rawWebhookPayload: payload,
            },
            update: {
              status: PaymentStatus.CAPTURED,
              verifiedAt: now,
              rawWebhookPayload: payload,
            },
          }),
        ]);

        // Background non-blocking settlements & receipts
        settleSellerEarnings(order.id).catch((err) =>
          console.error("[WEBHOOK_SELLER_EARNINGS_ERROR]", err)
        );
        generateReceiptForOrder(order.id).catch((err) =>
          console.error("[WEBHOOK_RECEIPT_ERROR]", err)
        );
        createNotification({
          userId: order.buyerId,
          type: "PAYMENT_SUCCESS",
          title: "Payment Successful",
          message: `Your payment was confirmed. Order #${order.id} is ready.`,
          linkUrl: `/dashboard/orders/${order.id}`,
          dedupKey: `webhook_payment_success_${order.id}`,
        }).catch((err) => console.error("[WEBHOOK_NOTIFICATION_ERROR]", err));
      }

      return apiSuccess({ received: true, event }, "Payment webhook processed", 200);
    }

    // 3. Handle Payment Failed Event
    if (event === "payment.failed") {
      const rzpOrderId = paymentEntity?.order_id;
      if (rzpOrderId) {
        const order = await prisma.order.findUnique({
          where: { razorpayOrderId: rzpOrderId },
        });
        if (order && order.status === OrderStatus.PENDING) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.FAILED,
              failureReason: paymentEntity?.error_description || "Payment failed at gateway",
            },
          });
        }
      }
      return apiSuccess({ received: true, event }, "Payment failure recorded", 200);
    }

    return apiSuccess({ received: true, event }, "Webhook event acknowledged", 200);
  } catch (error) {
    console.error("[PAYMENTS_WEBHOOK_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Webhook processing failed", 500);
  }
}
