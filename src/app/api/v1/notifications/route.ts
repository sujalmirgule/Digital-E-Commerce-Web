import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getUserNotifications, createNotification } from "@/lib/services/notification";
import { notificationsQuerySchema, createNotificationSchema } from "@/lib/validations/notification";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications
 *
 * Retrieves notifications for the authenticated user.
 * Supports filtering by read state and notification type, plus pagination.
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

    const { searchParams } = new URL(req.url);
    const rawQuery = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      isRead: searchParams.get("isRead") || undefined,
      type: searchParams.get("type") || undefined,
    };

    const parsed = notificationsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid query parameters",
        400,
        parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const result = await getUserNotifications(auth.user.id, parsed.data);

    return apiSuccess(result, "Notifications retrieved successfully", 200);
  } catch (error) {
    console.error("[NOTIFICATIONS_GET_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to retrieve notifications", 500);
  }
}

/**
 * POST /api/v1/notifications
 *
 * Creates a notification. Admin can broadcast/target any user; regular users cannot trigger arbitrary alerts.
 */
export async function POST(req: NextRequest) {
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

    // Only administrators are allowed to create arbitrary notifications directly via REST API
    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Direct notification creation requires administrator privileges",
        403
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON body in request", 400);
    }

    const parsed = createNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid notification payload",
        400,
        parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const notification = await createNotification(parsed.data);

    return apiSuccess({ notification }, "Notification created successfully", 201);
  } catch (error) {
    console.error("[NOTIFICATION_CREATE_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to create notification", 500);
  }
}
