import { z } from "zod";

export const signupSchema = z
  .object({
    fullName: z
      .string({
        required_error: "Full name is required",
        invalid_type_error: "Full name must be a string",
      })
      .trim()
      .min(2, "Full name must be at least 2 characters long")
      .max(100, "Full name cannot exceed 100 characters"),
    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string",
      })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address")
      .max(255, "Email cannot exceed 255 characters"),
    password: z
      .string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
      })
      .min(8, "Password must be at least 8 characters long")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one digit")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    acceptTerms: z.boolean().optional().default(true),
  })
  .strict({
    message: "Unexpected fields were included in the request",
  });

export type SignupInput = z.infer<typeof signupSchema>;
