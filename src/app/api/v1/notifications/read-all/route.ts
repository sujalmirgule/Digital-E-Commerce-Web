import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { markAllNotificationsAsRead } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/notifications/read-all
 *
 * Marks all unread notifications for the authenticated user as read.
 */
export async function PATCH(req: NextRequest) {
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

    const result = await markAllNotificationsAsRead(auth.user.id);

    return apiSuccess({ count: result.count }, "All notifications marked as read", 200);
  } catch (error) {
    console.error("[NOTIFICATION_READ_ALL_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to mark all notifications as read", 500);
  }
}

export const POST = PATCH;
