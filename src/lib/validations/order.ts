import { z } from "zod";

/**
 * Validation schema for buyer checkout and order initialization.
 * Enforces strict payload verification to reject any client-side attempts
 * to inject price, amount, buyerId, sellerId, status, or currency.
 */
export const checkoutOrderSchema = z
  .object({
    productId: z
      .string({
        required_error: "productId is required",
        invalid_type_error: "productId must be a string",
      })
      .trim()
      .min(1, "productId cannot be empty")
      .max(150, "productId cannot exceed 150 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "productId contains invalid characters"),
    licenseType: z
      .enum(["PERSONAL", "COMMERCIAL", "EXTENDED"], {
        invalid_type_error: "licenseType must be one of: PERSONAL, COMMERCIAL, EXTENDED",
      })
      .optional()
      .default("COMMERCIAL"),
    idempotencyKey: z
      .string({
        invalid_type_error: "idempotencyKey must be a string",
      })
      .trim()
      .min(8, "idempotencyKey must be at least 8 characters long")
      .max(128, "idempotencyKey cannot exceed 128 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "idempotencyKey contains invalid characters")
      .optional()
      .nullable(),
  })
  .strict({
    message: "Unexpected fields were included in the checkout request",
  });

export type CheckoutOrderInput = z.infer<typeof checkoutOrderSchema>;

/**
 * Validation helper for idempotency keys passed via request headers.
 */
export const idempotencyKeyHeaderSchema = z
  .string()
  .trim()
  .min(8, "idempotencyKey must be at least 8 characters long")
  .max(128, "idempotencyKey cannot exceed 128 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "idempotencyKey contains invalid characters");
