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

/**
 * Valid sort options for public product catalog discovery.
 */
export const catalogSortOptions = [
  "newest",
  "best_selling",
  "price_asc",
  "price_desc",
  "rating",
] as const;

export type CatalogSortOption = (typeof catalogSortOptions)[number];

/**
 * Validation schema for public catalog query parameters.
 * Enforces strict mode to reject arbitrary/injected query parameters.
 */
export const catalogQuerySchema = z
  .object({
    page: z
      .preprocess((val) => {
        if (val === undefined || val === null || val === "") return 1;
        const num = Number(val);
        return isNaN(num) ? val : num;
      }, z.number({ invalid_type_error: "Page must be a valid number" }).int("Page must be an integer").min(1, "Page must be at least 1"))
      .default(1),
    limit: z
      .preprocess((val) => {
        if (val === undefined || val === null || val === "") return 20;
        const num = Number(val);
        return isNaN(num) ? val : num;
      }, z.number({ invalid_type_error: "Limit must be a valid number" }).int("Limit must be an integer").min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100"))
      .default(20),
    category: z
      .string({ invalid_type_error: "Category must be a string" })
      .trim()
      .min(1, "Category slug cannot be empty")
      .max(100, "Category slug cannot exceed 100 characters")
      .regex(/^[a-z0-9-]+$/, "Category slug must only contain lowercase alphanumeric characters and hyphens")
      .optional(),
    query: z
      .string({ invalid_type_error: "Search query must be a string" })
      .trim()
      .min(1, "Search query cannot be empty")
      .max(100, "Search query cannot exceed 100 characters")
      .optional(),
    minPrice: z
      .preprocess((val) => {
        if (val === undefined || val === null || val === "") return undefined;
        const num = Number(val);
        return isNaN(num) ? val : num;
      }, z.number({ invalid_type_error: "minPrice must be a valid number" }).int("minPrice must be an integer in paise").min(0, "minPrice must be greater than or equal to 0").optional()),
    maxPrice: z
      .preprocess((val) => {
        if (val === undefined || val === null || val === "") return undefined;
        const num = Number(val);
        return isNaN(num) ? val : num;
      }, z.number({ invalid_type_error: "maxPrice must be a valid number" }).int("maxPrice must be an integer in paise").min(0, "maxPrice must be greater than or equal to 0").optional()),
    productType: z
      .enum(["DIGITAL_DOWNLOAD", "SOFTWARE", "BUNDLE"], {
        invalid_type_error: "productType must be one of: DIGITAL_DOWNLOAD, SOFTWARE, BUNDLE",
      })
      .optional(),
    sort: z
      .enum(catalogSortOptions, {
        invalid_type_error: `Sort must be one of: ${catalogSortOptions.join(", ")}`,
      })
      .default("newest"),
  })
  .strict({
    message: "Unexpected query parameters provided",
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: "minPrice cannot be greater than maxPrice",
      path: ["minPrice"],
    }
  );

export type CatalogQueryInput = z.infer<typeof catalogQuerySchema>;

/**
 * Validation schema for product ID or slug in public detail endpoint.
 * Accepts alphanumeric characters, hyphens, and underscores.
 */
export const productIdentifierSchema = z
  .string({
    required_error: "Product identifier is required",
    invalid_type_error: "Product identifier must be a string",
  })
  .trim()
  .min(1, "Product identifier cannot be empty")
  .max(150, "Product identifier cannot exceed 150 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Product identifier contains invalid characters");

