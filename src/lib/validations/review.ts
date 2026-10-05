import { z } from "zod";

/**
 * Text sanitization helper:
 * Rejects script tags, HTML tags, and dangerous markup.
 */
function sanitizeText(val: string): boolean {
  const forbiddenPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    /javascript:/gi,
    /<[^>]+>/g, // Any HTML tags
  ];
  return !forbiddenPatterns.some((pattern) => pattern.test(val));
}

/**
 * Create Review Schema
 * Strictly validates rating (integer 1..5) and safe text.
 * Rejects injected client fields (verifiedPurchase, buyerId, orderId, etc.).
 */
export const createReviewSchema = z
  .object({
    rating: z
      .number({
        required_error: "Rating is required",
        invalid_type_error: "Rating must be a number",
      })
      .int("Rating must be an integer (1 to 5)")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating must be at most 5"),

    title: z
      .string({
        required_error: "Review title is required",
      })
      .trim()
      .min(2, "Review title must be at least 2 characters")
      .max(100, "Review title must not exceed 100 characters")
      .refine(sanitizeText, {
        message: "Review title contains invalid or unsafe characters (HTML/scripts forbidden)",
      }),

    comment: z
      .string({
        required_error: "Review comment is required",
      })
      .trim()
      .min(5, "Review comment must be at least 5 characters")
      .max(2000, "Review comment must not exceed 2000 characters")
      .refine(sanitizeText, {
        message: "Review comment contains invalid or unsafe characters (HTML/scripts forbidden)",
      }),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/**
 * Update Review Schema
 * Allows updating rating, title, and/or comment.
 */
export const updateReviewSchema = z
  .object({
    rating: z
      .number()
      .int("Rating must be an integer (1 to 5)")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating must be at most 5")
      .optional(),

    title: z
      .string()
      .trim()
      .min(2, "Review title must be at least 2 characters")
      .max(100, "Review title must not exceed 100 characters")
      .refine(sanitizeText, {
        message: "Review title contains invalid or unsafe characters",
      })
      .optional(),

    comment: z
      .string()
      .trim()
      .min(5, "Review comment must be at least 5 characters")
      .max(2000, "Review comment must not exceed 2000 characters")
      .refine(sanitizeText, {
        message: "Review comment contains invalid or unsafe characters",
      })
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.rating !== undefined ||
      data.title !== undefined ||
      data.comment !== undefined,
    { message: "At least one field (rating, title, or comment) must be provided for update" }
  );

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/**
 * Public Reviews Query Schema
 */
export const publicReviewsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sort: z.enum(["recent", "highest", "lowest"]).default("recent"),
  })
  .strict();

export type PublicReviewsQueryInput = z.infer<typeof publicReviewsQuerySchema>;

/**
 * Admin Reviews Query Schema
 */
export const adminReviewsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    productId: z.string().trim().optional(),
    buyerId: z.string().trim().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    isVisible: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    isReported: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

export type AdminReviewsQueryInput = z.infer<typeof adminReviewsQuerySchema>;

/**
 * Admin Moderation Action Schema
 */
export const adminModerationActionSchema = z
  .object({
    action: z.enum(["hide", "restore", "delete"]),
    reason: z.string().trim().max(250).optional(),
  })
  .strict();

export type AdminModerationActionInput = z.infer<typeof adminModerationActionSchema>;
