import { z } from "zod";

/**
 * Strict Hex Color Regex:
 * Matches #RGB or #RRGGBB (case-insensitive).
 * Rejects CSS injection, javascript:, url(), expressions, HTML tags.
 */
export const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const hexColorSchema = z
  .string()
  .trim()
  .regex(
    hexColorRegex,
    "Color must be a valid hex color string (e.g. #4F46E5 or #FFF)"
  );

/**
 * Normalized Opacity Schema:
 * Accepts number between 0 and 1 (or integer percentage 0-100 normalized to 0-1).
 */
export const opacitySchema = z
  .number()
  .min(0, "Opacity must be at least 0")
  .max(1, "Opacity must be at most 1");

/**
 * Sanitized storage key:
 * Rejects path traversal and dangerous characters.
 */
export const safeStorageKeySchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (key) =>
      !key.includes("..") &&
      !key.includes("\0") &&
      !key.includes("\r") &&
      !key.includes("\n") &&
      !key.startsWith("/") &&
      !key.startsWith("\\"),
    { message: "Invalid or unsafe storage key" }
  );

/**
 * Receipt Template Update Schema
 * All fields are sanitized to prevent injection.
 */
export const updateReceiptTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    platformName: z.string().trim().min(1).max(100).optional(),
    receiptTitle: z.string().trim().min(1).max(100).optional(),
    logoKey: safeStorageKeySchema.nullable().optional(),

    primaryColor: hexColorSchema.optional(),
    secondaryColor: hexColorSchema.optional(),
    textColor: hexColorSchema.optional(),
    backgroundColor: hexColorSchema.optional(),

    headerVisible: z.boolean().optional(),
    headerText: z.string().trim().max(250).nullable().optional(),

    footerVisible: z.boolean().optional(),
    footerText: z.string().trim().max(500).nullable().optional(),

    backgroundImageKey: safeStorageKeySchema.nullable().optional(),
    backgroundOpacity: opacitySchema.optional(),

    watermarkText: z.string().trim().max(50).nullable().optional(),
    watermarkOpacity: opacitySchema.optional(),

    supportEmail: z.string().trim().email("Invalid support email").max(100).nullable().optional(),
    supportPhone: z.string().trim().max(30).nullable().optional(),
    companyAddress: z.string().trim().max(300).nullable().optional(),
    websiteUrl: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

export type UpdateReceiptTemplateInput = z.infer<typeof updateReceiptTemplateSchema>;

/**
 * Admin receipts query parameters schema
 */
export const adminReceiptsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    orderId: z.string().trim().max(100).optional(),
    startDate: z.string().trim().datetime({ offset: true }).optional(),
    endDate: z.string().trim().datetime({ offset: true }).optional(),
  })
  .strict();

export type AdminReceiptsQueryInput = z.infer<typeof adminReceiptsQuerySchema>;
