import { z } from "zod";

export const sellerOnboardingSchema = z
  .object({
    storeName: z
      .string({
        required_error: "Store name is required",
        invalid_type_error: "Store name must be a string",
      })
      .trim()
      .min(2, "Store name must be at least 2 characters long")
      .max(100, "Store name cannot exceed 100 characters"),
    storeSlug: z
      .string({
        required_error: "Store slug is required",
        invalid_type_error: "Store slug must be a string",
      })
      .trim()
      .toLowerCase()
      .min(2, "Store slug must be at least 2 characters long")
      .max(50, "Store slug cannot exceed 50 characters")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Store slug must contain only lowercase letters, numbers, and single hyphens"
      ),
    bio: z
      .string()
      .trim()
      .max(255, "Bio cannot exceed 255 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional(),
    panNumber: z
      .string({
        required_error: "PAN number is required",
        invalid_type_error: "PAN number must be a string",
      })
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please provide a valid Indian PAN number (e.g. ABCDE1234F)"),
    bankAccount: z
      .string({
        required_error: "Bank account number is required",
        invalid_type_error: "Bank account number must be a string",
      })
      .trim()
      .regex(/^\d{9,18}$/, "Bank account number must be between 9 and 18 numeric digits"),
    bankIfsc: z
      .string({
        required_error: "Bank IFSC code is required",
        invalid_type_error: "Bank IFSC code must be a string",
      })
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please provide a valid Indian IFSC code (e.g. HDFC0001234)"),
    bankAccountHolder: z
      .string({
        required_error: "Account holder name is required",
        invalid_type_error: "Account holder name must be a string",
      })
      .trim()
      .min(2, "Account holder name must be at least 2 characters long")
      .max(100, "Account holder name cannot exceed 100 characters"),
  })
  .strict({
    message: "Unexpected fields were included in seller onboarding request",
  });

export type SellerOnboardingInput = z.infer<typeof sellerOnboardingSchema>;

export const adminRejectSellerSchema = z
  .object({
    rejectionReason: z
      .string({
        required_error: "Rejection reason is required",
        invalid_type_error: "Rejection reason must be a string",
      })
      .trim()
      .min(3, "Rejection reason must be at least 3 characters long")
      .max(500, "Rejection reason cannot exceed 500 characters"),
  })
  .strict({
    message: "Unexpected fields were included in seller rejection request",
  });

export type AdminRejectSellerInput = z.infer<typeof adminRejectSellerSchema>;
