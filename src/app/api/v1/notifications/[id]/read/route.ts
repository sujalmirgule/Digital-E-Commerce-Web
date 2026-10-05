import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { markNotificationAsRead } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/v1/notifications/[id]/read
 *
 * Marks an individual notification as read.
 * Protected: Users can only mark their own notifications as read (IDOR guarded).
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
    if (!id) {
      return apiError("INVALID_ID", "Notification ID parameter is required", 400);
    }

    const result = await markNotificationAsRead(auth.user.id, id);

    if (!result.success) {
      return apiError(
        result.code || "OPERATION_FAILED",
        result.error || "Failed to mark notification as read",
        result.status || 400
      );
    }

    return apiSuccess(result.notification, "Notification marked as read", 200);
  } catch (error) {
    console.error("[NOTIFICATION_MARK_READ_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to mark notification as read", 500);
  }
}

export const POST = PATCH;
