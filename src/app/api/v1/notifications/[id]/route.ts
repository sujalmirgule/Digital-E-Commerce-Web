import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { deleteNotification } from "@/lib/services/notification";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/notifications/[id]
 *
 * Inspects a single notification.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    if (!auth.user.isActive) {
      return apiError("ACCOUNT_INACTIVE", "Your account has been deactivated", 403);
    }

    const { id } = params;
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return apiError("NOT_FOUND", "Notification not found", 404);
    }

    if (notification.userId !== auth.user.id && auth.user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "You are not authorized to view this notification", 403);
    }

    return apiSuccess({ notification }, "Notification retrieved successfully", 200);
  } catch (error) {
    console.error("[NOTIFICATION_GET_ONE_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to retrieve notification", 500);
  }
}

/**
 * DELETE /api/v1/notifications/[id]
 *
 * Deletes an individual notification.
 * Protected with IDOR checks.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }

    if (!auth.user.isActive) {
      return apiError("ACCOUNT_INACTIVE", "Your account has been deactivated", 403);
    }

    const { id } = params;
    const result = await deleteNotification(auth.user.id, id);

    if (!result.success) {
      return apiError(
        result.code || "OPERATION_FAILED",
        result.error || "Failed to delete notification",
        result.status || 400
      );
    }

    return apiSuccess({ deleted: true }, "Notification deleted successfully", 200);
  } catch (error) {
    console.error("[NOTIFICATION_DELETE_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to delete notification", 500);
  }
}
