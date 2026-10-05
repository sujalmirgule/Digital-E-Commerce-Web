import { z } from "zod";

/**
 * Zod validation schema for entitlement provisioning.
 *
 * Strict validation: rejects client attempts to inject authorization or ownership fields
 * such as userId, buyerId, sellerId, paymentStatus, or role.
 */
export const provisionEntitlementSchema = z
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

    // Optional productId for single-item validation; if provided, must match OrderItem
    productId: z
      .string({
        invalid_type_error: "Product ID must be a string",
      })
      .trim()
      .min(1, "Product ID cannot be empty")
      .optional(),
  })
  .strict();

export type ProvisionEntitlementInput = z.infer<typeof provisionEntitlementSchema>;
