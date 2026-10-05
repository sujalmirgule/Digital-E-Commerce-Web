import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { createNotification } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

async function handleApprove(
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
        "Administrative privileges are required to approve sellers",
        403
      );
    }

    const { id } = params;
    if (!id || typeof id !== "string") {
      return apiError("INVALID_ID", "Invalid seller ID parameter", 400);
    }

    // Find the target seller profile
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

    // Rule: Seller cannot approve themselves even if they possess admin role
    if (seller.userId === authUser.id) {
      return apiError(
        "SELF_APPROVAL_FORBIDDEN",
        "An administrator cannot approve their own seller application",
        403
      );
    }

    // State transition guards
    if (seller.status === "APPROVED") {
      return apiError(
        "ALREADY_APPROVED",
        "This seller application is already approved",
        400
      );
    }

    if (seller.status !== "PENDING") {
      return apiError(
        "INVALID_STATUS_TRANSITION",
        `Cannot approve seller application with status '${seller.status}'. Only PENDING applications can be approved.`,
        400
      );
    }

    // Atomic approval update
    const updatedSeller = await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: {
        status: "APPROVED",
        rejectionReason: null,
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

    // Record audit log
    await prisma.auditLog
      .create({
        data: {
          adminId: authUser.id,
          action: "APPROVE_SELLER",
          targetEntity: "SellerProfile",
          targetId: seller.id,
          metadata: {
            storeName: seller.storeName,
          },
        },
      })
      .catch((err) => console.error("[AUDIT_LOG_ERROR]", err));

    // Send server-side notification to seller (idempotent via dedupKey)
    createNotification({
      userId: seller.userId,
      type: "SELLER_APPROVED",
      title: "Seller Application Approved!",
      message: `Congratulations! Your store '${updatedSeller.storeName}' has been approved. You can now publish digital products.`,
      linkUrl: "/seller",
      dedupKey: `seller_approved_${seller.id}`,
    }).catch((err) => console.error("[SELLER_APPROVAL_NOTIFICATION_ERROR]", err));

    return apiSuccess(
      { seller: updatedSeller },
      `Seller '${updatedSeller.storeName}' has been successfully approved`,
      200
    );
  } catch (error) {
    console.error("[ADMIN_APPROVE_SELLER_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while approving the seller application",
      500
    );
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return handleApprove(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return handleApprove(req, ctx);
}
