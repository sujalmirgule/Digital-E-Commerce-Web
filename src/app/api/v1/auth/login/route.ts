import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";
import { signJwt } from "@/lib/jwt";
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

    // Strict input validation
    const validatedData = loginSchema.parse(body);

    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // Query user with seller profile snapshot
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        avatarUrl: true,
        createdAt: true,
        sellerProfile: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Uniform authentication failure response (prevents user enumeration)
    if (!user) {
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // Account status check
    if (!user.isActive) {
      return apiError(
        "ACCOUNT_INACTIVE",
        "Your account has been deactivated. Please contact support.",
        403
      );
    }

    // Secure password comparison
    const isPasswordValid = await comparePassword(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // Generate authenticated JWT
    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Return safe user identity without sensitive hashes
    return apiSuccess(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          hasSellerProfile: !!user.sellerProfile,
          sellerStatus: user.sellerProfile?.status ?? null,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
        token,
      },
      "Login successful",
      200
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

    console.error("[LOGIN_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred during login. Please try again later.",
      500
    );
  }
}
