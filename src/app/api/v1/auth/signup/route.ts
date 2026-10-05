import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signupSchema } from "@/lib/validations/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body in request", 400);
    }

    if (!body || typeof body !== "object") {
      return apiError("INVALID_PAYLOAD", "Request body must be a valid JSON object", 400);
    }

    // Strict validation using Zod
    const validatedData = signupSchema.parse(body);

    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // Duplicate email protection
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return apiError(
        "DUPLICATE_EMAIL",
        "An account with this email address already exists",
        409,
        [{ field: "email", message: "Email is already registered" }]
      );
    }

    // Secure password hashing
    const passwordHash = await hashPassword(validatedData.password);

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        fullName: validatedData.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "BUYER",
        isActive: true,
        isEmailVerified: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      { user: newUser },
      "Account created successfully",
      201
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return apiError(
        "VALIDATION_FAILED",
        details[0]?.message || "Validation failed for submitted data",
        400,
        details
      );
    }

    // Check Prisma unique constraint error code P2002 as a fallback safety
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return apiError(
        "DUPLICATE_EMAIL",
        "An account with this email address already exists",
        409,
        [{ field: "email", message: "Email is already registered" }]
      );
    }

    // Log internally but do not leak SQL/stack details to client
    console.error("[SIGNUP_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while creating your account. Please try again later.",
      500
    );
  }
}
