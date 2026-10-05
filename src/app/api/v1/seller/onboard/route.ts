import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { sellerOnboardingSchema } from "@/lib/validations/seller";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/seller/onboard
 * Enables a base user account to apply to become a seller.
 * Sets status to PENDING awaiting Admin approval.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication required to submit seller application",
        401
      );
    }

    // Check if user already applied
    const existingSellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: authUser.id },
      select: { id: true, status: true, storeSlug: true },
    });

    if (existingSellerProfile) {
      if (existingSellerProfile.status === "APPROVED") {
        return apiError(
          "ALREADY_SELLER",
          "You already have an approved seller store",
          409
        );
      }
      if (existingSellerProfile.status === "PENDING") {
        return apiError(
          "APPLICATION_PENDING",
          "Your seller application is already pending review",
          409
        );
      }
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

    const validatedData = sellerOnboardingSchema.parse(body);

    const normalizedSlug = validatedData.storeSlug.toLowerCase().trim();

    // Check if slug is already taken
    const slugTaken = await prisma.sellerProfile.findUnique({
      where: { storeSlug: normalizedSlug },
      select: { id: true },
    });

    if (slugTaken) {
      return apiError(
        "SLUG_TAKEN",
        "This store slug is already registered. Please choose another.",
        409,
        [{ field: "storeSlug", message: "Store slug is already in use" }]
      );
    }

    // Mask sensitive KYC & banking credentials before storing
    const panNumberMasked =
      validatedData.panNumber.substring(0, 5) + "****" + validatedData.panNumber.substring(9);
    const bankAccountLast4 = "****" + validatedData.bankAccount.slice(-4);

    const newSellerProfile = await prisma.sellerProfile.create({
      data: {
        userId: authUser.id,
        storeName: validatedData.storeName.trim(),
        storeSlug: normalizedSlug,
        bio: validatedData.bio || null,
        description: validatedData.description || null,
        panNumberMasked,
        bankAccountLast4,
        bankIfsc: validatedData.bankIfsc.trim().toUpperCase(),
        bankAccountHolder: validatedData.bankAccountHolder.trim(),
        status: "PENDING",
      },
      select: {
        id: true,
        userId: true,
        storeName: true,
        storeSlug: true,
        bio: true,
        description: true,
        status: true,
        panNumberMasked: true,
        bankAccountLast4: true,
        bankIfsc: true,
        bankAccountHolder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      { sellerProfile: newSellerProfile },
      "Seller application submitted successfully and is pending admin review",
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
        details[0]?.message || "Validation failed for seller onboarding data",
        400,
        details
      );
    }

    console.error("[SELLER_ONBOARDING_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while submitting your seller application",
      500
    );
  }
}
