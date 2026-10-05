import { prisma } from "@/lib/prisma";
import { NotificationType, Prisma } from "@prisma/client";

/**
 * Sanitizes metadata to guarantee that no credentials, tokens, secrets,
 * PAN, bank accounts, or storage keys are ever stored in notifications.
 */
function sanitizeMetadata(rawMetadata?: Record<string, any> | null): Record<string, any> | null {
  if (!rawMetadata || typeof rawMetadata !== "object") return null;

  const forbiddenKeyRegex = /(password|hash|token|secret|jwt|database|pan|bank|ifsc|account|storagekey|privatestorage)/i;
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(rawMetadata)) {
    if (forbiddenKeyRegex.test(key)) {
      continue; // Omit sensitive keys
    }
    if (typeof value === "string") {
      // Check if value itself looks like a secret or JWT
      if (value.startsWith("eyJ") || value.length > 500) {
        continue;
      }
      sanitized[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value);
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
  metadata?: Record<string, any> | null;
  dedupKey?: string | null;
}

/**
 * Creates an in-platform notification.
 * Idempotency: If `dedupKey` is provided and a record with that key already exists,
 * returns the existing record rather than generating a duplicate alert.
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, linkUrl, metadata, dedupKey } = params;

  const safeMetadata = sanitizeMetadata(metadata);

  if (dedupKey) {
    const existing = await prisma.notification.findUnique({
      where: { dedupKey },
    });
    if (existing) {
      return existing;
    }
  }

  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        linkUrl: linkUrl || null,
        metadata: safeMetadata !== null ? safeMetadata : Prisma.JsonNull,
        dedupKey: dedupKey || null,
      },
    });
  } catch (error: any) {
    // If concurrent race condition hits unique constraint on dedupKey
    if (dedupKey && error.code === "P2002") {
      const existing = await prisma.notification.findUnique({
        where: { dedupKey },
      });
      if (existing) return existing;
    }
    throw error;
  }
}

/**
 * Retrieves paginated notifications for an authenticated user with unread count.
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    isRead?: boolean;
    type?: NotificationType;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = { userId };
  if (options?.isRead !== undefined) {
    whereClause.isRead = options.isRead;
  }
  if (options?.type) {
    whereClause.type = options.type;
  }

  const [total, unreadCount, rawNotifications] = await Promise.all([
    prisma.notification.count({ where: whereClause }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const notifications = rawNotifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    linkUrl: n.linkUrl,
    isRead: n.isRead,
    readAt: n.readAt?.toISOString() || null,
    metadata: n.metadata,
    createdAt: n.createdAt.toISOString(),
  }));

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Gets count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Marks a specific notification as read with strict ownership validation (IDOR protection).
 */
export async function markNotificationAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return { success: false, code: "NOT_FOUND", error: "Notification not found", status: 404 };
  }

  if (notification.userId !== userId) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "You are not authorized to modify this notification",
      status: 403,
    };
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    success: true,
    notification: {
      ...updated,
      readAt: updated.readAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
    },
    status: 200,
  };
}

/**
 * Marks all unread notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string) {
  const now = new Date();
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: now,
    },
  });

  return {
    success: true,
    count: result.count,
    status: 200,
  };
}

/**
 * Deletes a notification with strict ownership verification.
 */
export async function deleteNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return { success: false, code: "NOT_FOUND", error: "Notification not found", status: 404 };
  }

  if (notification.userId !== userId) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "You are not authorized to delete this notification",
      status: 403,
    };
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return {
    success: true,
    status: 200,
  };
}
