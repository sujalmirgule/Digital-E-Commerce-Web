import { z } from "zod";

/**
 * Zod validation schema for POST /api/v1/payments/verify
 *
 * Enforces strict typing and rejects any injected fields (amount, status, role, buyerId).
 */
export const paymentVerifySchema = z
  .object({
    orderId: z
      .string({
        required_error: "Order ID is required",
        invalid_type_error: "Order ID must be a string",
      })
      .trim()
      .min(5, "Order ID must be at least 5 characters")
      .max(64, "Order ID cannot exceed 64 characters")
      .regex(
        /^ORD-\d{8}-[A-Za-z0-9]+$/,
        "Order ID must match format ORD-YYYYMMDD-XXXX"
      ),

    razorpayOrderId: z
      .string({
        required_error: "Razorpay Order ID is required",
        invalid_type_error: "Razorpay Order ID must be a string",
      })
      .trim()
      .min(5, "Razorpay Order ID must be at least 5 characters")
      .max(100, "Razorpay Order ID cannot exceed 100 characters")
      .startsWith("order_", "Razorpay Order ID must start with 'order_'"),

    razorpayPaymentId: z
      .string({
        required_error: "Razorpay Payment ID is required",
        invalid_type_error: "Razorpay Payment ID must be a string",
      })
      .trim()
      .min(5, "Razorpay Payment ID must be at least 5 characters")
      .max(100, "Razorpay Payment ID cannot exceed 100 characters")
      .startsWith("pay_", "Razorpay Payment ID must start with 'pay_'"),

    razorpaySignature: z
      .string({
        required_error: "Razorpay Signature is required",
        invalid_type_error: "Razorpay Signature must be a string",
      })
      .trim()
      .min(10, "Razorpay Signature is invalid")
      .max(256, "Razorpay Signature is invalid")
      .regex(
        /^[a-fA-F0-9]+$/,
        "Razorpay Signature must be a valid hexadecimal string"
      ),
  })
  .strict();

export type PaymentVerifyInput = z.infer<typeof paymentVerifySchema>;
