import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getStorageProvider } from "@/lib/storage/local-storage-provider";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/v1/admin/receipts/template/upload
 *
 * Upload a logo or background image for the receipt template.
 * Stores file in private storage outside public directories.
 *
 * Rules:
 *   - Admin only.
 *   - Strictly validates MIME type and file extension.
 *   - Rejects executable files, scripts, SVG (to prevent XSS).
 *   - Generates server-side storage object key (client cannot supply path).
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

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Only platform administrators may upload template assets",
        403
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetType = (formData.get("type") as string) || "logo";

    if (!file || !(file instanceof File)) {
      return apiError("VALIDATION_FAILED", "No file uploaded", 400);
    }

    // 1. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return apiError(
        "FILE_TOO_LARGE",
        `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
        400
      );
    }

    if (file.size === 0) {
      return apiError("VALIDATION_FAILED", "Uploaded file is empty", 400);
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return apiError(
        "UNSUPPORTED_MEDIA_TYPE",
        `File MIME type '${file.type}' is not supported. Must be PNG, JPEG, or WebP.`,
        400
      );
    }

    // 3. Validate file extension
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return apiError(
        "UNSUPPORTED_FILE_EXTENSION",
        `File extension '.${ext}' is not supported. Must be .png, .jpg, or .webp.`,
        400
      );
    }

    // 4. Read bytes and verify image magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Simple magic bytes verification
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isWebp = buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";

    if (!isPng && !isJpeg && !isWebp) {
      return apiError(
        "INVALID_IMAGE_DATA",
        "File signature does not match declared image type",
        400
      );
    }

    // 5. Generate secure server-controlled storage key
    const subfolder = assetType === "background" ? "backgrounds" : "logos";
    const randomHex = crypto.randomBytes(16).toString("hex");
    const objectKey = `templates/${subfolder}/${randomHex}.${ext}`;

    // 6. Save in private storage
    const storage = getStorageProvider();
    await storage.putObject(objectKey, buffer, file.type);

    // Audit log template asset upload
    await prisma.auditLog.create({
      data: {
        adminId: auth.user.id,
        action: assetType === "background" ? "RECEIPT_BACKGROUND_UPDATED" : "RECEIPT_LOGO_UPDATED",
        targetEntity: "ReceiptTemplate",
        targetId: objectKey,
        metadata: {
          assetType,
          objectKey,
          sizeBytes: buffer.length,
          contentType: file.type,
        },
      },
    }).catch((err: unknown) => console.error("[AUDIT_LOG_ERROR]", err));

    return apiSuccess(
      {
        objectKey,
        assetType,
        sizeBytes: buffer.length,
        contentType: file.type,
      },
      "Template asset uploaded successfully",
      201
    );
  } catch (error) {
    console.error("[RECEIPT_TEMPLATE_UPLOAD_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to upload template asset",
      500
    );
  }
}
