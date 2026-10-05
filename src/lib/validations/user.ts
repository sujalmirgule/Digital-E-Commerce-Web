import { z } from "zod";

export const updateProfileSchema = z
  .object({
    fullName: z
      .string({
        required_error: "Full name is required",
        invalid_type_error: "Full name must be a string",
      })
      .trim()
      .min(2, "Full name must be at least 2 characters long")
      .max(100, "Full name cannot exceed 100 characters"),
  })
  .strict({
    message: "Unexpected or protected fields were included in the request",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
