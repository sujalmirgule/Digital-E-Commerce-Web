import { z } from "zod";

/**
 * Validation schema for buyer cancelling an order.
 */
export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .max(500, "Reason cannot exceed 500 characters")
    .optional(),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

/**
 * Validation schema for buyer requesting a refund on a paid order.
 */
export const requestRefundSchema = z.object({
  reason: z
    .string({ required_error: "Refund reason is required" })
    .min(5, "Refund reason must be at least 5 characters")
    .max(1000, "Refund reason cannot exceed 1000 characters"),
});

export type RequestRefundInput = z.infer<typeof requestRefundSchema>;

/**
 * Validation schema for admin processing a direct refund.
 */
export const adminRefundSchema = z.object({
  reason: z
    .string()
    .max(500, "Reason cannot exceed 500 characters")
    .optional(),
  note: z
    .string()
    .max(500, "Note cannot exceed 500 characters")
    .optional(),
});

export type AdminRefundInput = z.infer<typeof adminRefundSchema>;

/**
 * Validation schema for admin rejecting a refund request.
 */
export const rejectRefundSchema = z.object({
  adminNotes: z
    .string({ required_error: "Rejection explanation is required" })
    .min(3, "Rejection explanation must be at least 3 characters")
    .max(1000, "Rejection explanation cannot exceed 1000 characters"),
});

export type RejectRefundInput = z.infer<typeof rejectRefundSchema>;
