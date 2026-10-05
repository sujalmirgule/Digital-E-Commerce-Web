import { z } from "zod";
import { NotificationType } from "@prisma/client";

/**
 * Validation schema for listing user notifications.
 */
export const notificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isRead: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    type: z.nativeEnum(NotificationType).optional(),
  })
  .strict();

export type NotificationsQueryInput = z.infer<typeof notificationsQuerySchema>;

/**
 * Validation schema for manual/admin notification broadcast (if supported).
 */
export const createNotificationSchema = z
  .object({
    userId: z.string().min(1, "Recipient user ID is required"),
    type: z.nativeEnum(NotificationType),
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(2000),
    linkUrl: z.string().trim().max(500).optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
    dedupKey: z.string().trim().max(150).optional().nullable(),
  })
  .strict();

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
