import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validations/user";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/users/me
 * Retrieves the authenticated user's profile directly from PostgreSQL.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication required to access profile",
        401
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
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
        sellerProfile: {
          select: {
            id: true,
            status: true,
            storeName: true,
            storeSlug: true,
          },
        },
      },
    });

    if (!user) {
      return apiError("USER_NOT_FOUND", "User profile not found", 404);
    }

    return apiSuccess(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          avatarUrl: user.avatarUrl,
          hasSellerProfile: !!user.sellerProfile,
          sellerStatus: user.sellerProfile?.status ?? null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      "Profile retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[GET_PROFILE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while fetching your profile",
      500
    );
  }
}

/**
 * PATCH /api/v1/users/me
 * Updates only allowlisted profile fields for the authenticated user.
 * Protected against IDOR, role elevation, and credential manipulation.
 */
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication required to update profile",
        401
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body in request", 400);
    }

    if (!body || typeof body !== "object") {
      return apiError("INVALID_PAYLOAD", "Request body must be a valid JSON object", 400);
    }

    // Strict validation: rejects unknown or protected fields (id, role, passwordHash, email, etc.)
    const validatedData = updateProfileSchema.parse(body);

    // IDOR protection: strictly update using authUser.id derived from verified JWT
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        fullName: validatedData.fullName.trim(),
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
      { user: updatedUser },
      "Profile updated successfully",
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
        details[0]?.message || "Validation failed for profile update",
        400,
        details
      );
    }

    console.error("[UPDATE_PROFILE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while updating your profile",
      500
    );
  }
}
