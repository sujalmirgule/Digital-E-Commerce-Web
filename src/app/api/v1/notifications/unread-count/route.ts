import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getUnreadCount } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications/unread-count
 *
 * Fast endpoint for polling unread notification badges.
 */
export async function GET(req: NextRequest) {
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

    const unreadCount = await getUnreadCount(auth.user.id);

    return apiSuccess({ unreadCount }, "Unread notification count retrieved", 200);
  } catch (error) {
    console.error("[NOTIFICATIONS_UNREAD_COUNT_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to retrieve unread notification count", 500);
  }
}
