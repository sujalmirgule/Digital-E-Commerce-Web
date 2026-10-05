import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { adminRejectSellerSchema } from "@/lib/validations/seller";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

async function handleReject(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication required to perform admin actions",
        401
      );
    }

    if (authUser.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to reject sellers",
        403
      );
    }

    const { id } = params;
    if (!id || typeof id !== "string") {
      return apiError("INVALID_ID", "Invalid seller ID parameter", 400);
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

    const validatedData = adminRejectSellerSchema.parse(body);

    const seller = await prisma.sellerProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        storeName: true,
      },
    });

    if (!seller) {
      return apiError("SELLER_NOT_FOUND", "Seller profile not found", 404);
    }

    if (seller.userId === authUser.id) {
      return apiError(
        "SELF_REJECTION_FORBIDDEN",
        "An administrator cannot reject their own seller application",
        403
      );
    }

    // State transition guards
    if (seller.status === "REJECTED") {
      return apiError(
        "ALREADY_REJECTED",
        "This seller application is already rejected",
        400
      );
    }

    if (seller.status !== "PENDING") {
      return apiError(
        "INVALID_STATUS_TRANSITION",
        `Cannot reject seller application with status '${seller.status}'. Only PENDING applications can be rejected.`,
        400
      );
    }

    // Atomic rejection update
    const updatedSeller = await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: {
        status: "REJECTED",
        rejectionReason: validatedData.rejectionReason.trim(),
      },
      select: {
        id: true,
        userId: true,
        storeName: true,
        storeSlug: true,
        status: true,
        rejectionReason: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      { seller: updatedSeller },
      `Seller application for '${updatedSeller.storeName}' has been rejected`,
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
        details[0]?.message || "Validation failed for rejection reason",
        400,
        details
      );
    }

    console.error("[ADMIN_REJECT_SELLER_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while rejecting the seller application",
      500
    );
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return handleReject(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return handleReject(req, ctx);
}
