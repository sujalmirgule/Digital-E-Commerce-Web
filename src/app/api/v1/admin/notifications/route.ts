import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/notifications
 *
 * Administrator notification monitoring register.
 * Provides live visibility into dispatched notifications across the platform.
 * Strict authorization: requires ADMIN role.
 * Sanitizes all output to prevent leakage of credentials or sensitive tokens.
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

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Administrative privileges are required to inspect platform notifications",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const typeParam = searchParams.get("type");
    const isReadParam = searchParams.get("isRead");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");

    const whereClause: any = {};

    if (typeParam && Object.values(NotificationType).includes(typeParam as NotificationType)) {
      whereClause.type = typeParam as NotificationType;
    }

    if (isReadParam !== null && isReadParam !== undefined && isReadParam !== "") {
      whereClause.isRead = isReadParam === "true";
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (search && search.trim()) {
      const s = search.trim();
      whereClause.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { message: { contains: s, mode: "insensitive" } },
        { user: { email: { contains: s, mode: "insensitive" } } },
        { user: { fullName: { contains: s, mode: "insensitive" } } },
      ];
    }

    const [total, rawNotifications] = await Promise.all([
      prisma.notification.count({ where: whereClause }),
      prisma.notification.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const notifications = rawNotifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      user: n.user,
      type: n.type,
      title: n.title,
      message: n.message,
      linkUrl: n.linkUrl,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));

    return apiSuccess(
      {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      "Notifications retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_NOTIFICATIONS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve notifications",
      500
    );
  }
}
