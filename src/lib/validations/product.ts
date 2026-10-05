import { z } from "zod";

const SUPPORTED_PRODUCT_TYPES = ["DIGITAL_DOWNLOAD", "SOFTWARE", "BUNDLE"] as const;
const SUPPORTED_LICENSE_TYPES = ["PERSONAL", "COMMERCIAL", "EXTENDED"] as const;

export const createProductSchema = z
  .object({
    title: z
      .string({
        required_error: "Product title is required",
        invalid_type_error: "Product title must be a string",
      })
      .trim()
      .min(5, "Title must be at least 5 characters long")
      .max(150, "Title cannot exceed 150 characters"),
    shortDescription: z
      .string({
        required_error: "Short description is required",
        invalid_type_error: "Short description must be a string",
      })
      .trim()
      .min(20, "Short description must be at least 20 characters long")
      .max(300, "Short description cannot exceed 300 characters"),
    description: z
      .string({
        required_error: "Full description is required",
        invalid_type_error: "Full description must be a string",
      })
      .trim()
      .min(50, "Description must be at least 50 characters long")
      .max(10000, "Description cannot exceed 10,000 characters"),
    categoryId: z
      .string({
        required_error: "Category is required",
        invalid_type_error: "Category must be a string",
      })
      .trim()
      .min(1, "Category ID is required"),
    productType: z
      .enum(SUPPORTED_PRODUCT_TYPES, {
        required_error: "Product type is required",
        invalid_type_error: `Product type must be one of: ${SUPPORTED_PRODUCT_TYPES.join(", ")}`,
      })
      .default("DIGITAL_DOWNLOAD"),
    pricePaise: z
      .number({
        required_error: "Price is required",
        invalid_type_error: "Price must be a number",
      })
      .int("Price must be an integer in paise (e.g. ₹799 = 79900)")
      .min(0, "Price cannot be negative"),
    discountPricePaise: z
      .number()
      .int("Discount price must be an integer in paise")
      .min(0, "Discount price cannot be negative")
      .optional()
      .nullable(),
    isFree: z.boolean().optional().default(false),
    licenseType: z
      .enum(SUPPORTED_LICENSE_TYPES, {
        invalid_type_error: `License type must be one of: ${SUPPORTED_LICENSE_TYPES.join(", ")}`,
      })
      .optional()
      .default("COMMERCIAL"),
    licenseTerms: z.string().trim().max(5000).optional().nullable(),
    version: z
      .string()
      .trim()
      .regex(/^\d+\.\d+\.\d+$/, "Version must follow semver format (e.g. 1.0.0)")
      .optional()
      .default("1.0.0"),
    tags: z
      .array(z.string().trim().min(1).max(30))
      .max(15, "Cannot exceed 15 tags")
      .optional()
      .default([]),
    fileFormats: z
      .array(z.string().trim().min(1).max(20).toUpperCase())
      .max(10, "Cannot exceed 10 file formats")
      .optional()
      .default([]),
    requirements: z.string().trim().max(3000).optional().nullable(),
    demoUrl: z
      .string()
      .trim()
      .url("Demo URL must be a valid URL")
      .optional()
      .nullable(),
  })
  .strict({
    message: "Unexpected fields were included in the product creation request",
  })
  .refine(
    (data) => {
      // If isFree is false, price must be > 0
      if (!data.isFree && data.pricePaise === 0) return false;
      return true;
    },
    {
      message: "Paid products must have a price greater than 0 paise",
      path: ["pricePaise"],
    }
  )
  .refine(
    (data) => {
      // discountPrice must be less than price if provided
      if (
        data.discountPricePaise !== null &&
        data.discountPricePaise !== undefined &&
        data.discountPricePaise >= data.pricePaise
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Discount price must be less than the regular price",
      path: ["discountPricePaise"],
    }
  );

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Validation schema for seller submitting a product for review.
 * Enforces strict mode to reject any client attempts to inject status, sellerId, etc.
 */
export const submitProductSchema = z
  .object({
    notes: z
      .string()
      .trim()
      .max(1000, "Submission notes cannot exceed 1,000 characters")
      .optional()
      .nullable(),
  })
  .strict({
    message: "Unexpected fields were included in the product submission request",
  });

export type SubmitProductInput = z.infer<typeof submitProductSchema>;

/**
 * Validation schema for admin rejecting a product.
 * Requires a non-empty rejectionReason.
 */
export const adminRejectProductSchema = z
  .object({
    rejectionReason: z
      .string({
        required_error: "rejectionReason is required",
        invalid_type_error: "rejectionReason must be a string",
      })
      .trim()
      .min(5, "Rejection reason must be at least 5 characters long")
      .max(1000, "Rejection reason cannot exceed 1,000 characters"),
  })
  .strict({
    message: "Unexpected fields were included in the rejection request",
  });

export type AdminRejectProductInput = z.infer<typeof adminRejectProductSchema>;
