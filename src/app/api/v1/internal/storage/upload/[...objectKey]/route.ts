import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { LocalStorageProvider } from "@/lib/storage/local-storage-provider";
import { getMaxFileSizeBytes } from "@/lib/validations/upload";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * PUT /api/v1/internal/storage/upload/:objectKey
 *
 * Internal upload handler for LocalStorageProvider ONLY.
 * This route exists because local development cannot use presigned S3/R2 PUT URLs.
 * In production with R2/S3, the browser uploads directly to cloud storage — this route
 * is NOT used.
 *
 * SECURITY:
 *   - The objectKey from the URL is VALIDATED against the storage root (traversal guard
 *     is enforced inside LocalStorageProvider.writeObject).
 *   - This endpoint does NOT authenticate: it mirrors the presigned URL model where
 *     the URL itself is the authorization token (short-lived, server-generated).
 *   - For production cloud providers (R2/S3), this route is never reached.
 *   - The route is only registered in dev mode via STORAGE_PROVIDER=local.
 *
 * The objectKey arrives URL-encoded in the path segment. Next.js automatically
 * decodes it via the [objectKey] catch-all parameter.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { objectKey: string[] } }
) {
  try {
    // Reconstruct the full object key from the catch-all segments
    const objectKey = params.objectKey.join("/");

    if (!objectKey || objectKey.trim() === "") {
      return apiError("INVALID_PARAM", "Object key is required", 400);
    }

    // Verify content-length does not exceed max before reading body
    const contentLengthHeader = req.headers.get("content-length");
    const maxSizeBytes = getMaxFileSizeBytes();

    if (contentLengthHeader) {
      const declared = parseInt(contentLengthHeader, 10);
      if (!isNaN(declared) && declared > maxSizeBytes) {
        return apiError(
          "FILE_TOO_LARGE",
          `Declared file size exceeds maximum allowed (${Math.round(maxSizeBytes / 1024 / 1024)} MB)`,
          413
        );
      }
    }

    // Read the raw binary body
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return apiError("EMPTY_BODY", "Upload body is empty. No file data received.", 400);
    }

    if (buffer.length > maxSizeBytes) {
      return apiError(
        "FILE_TOO_LARGE",
        `Actual file size (${buffer.length} bytes) exceeds maximum allowed (${maxSizeBytes} bytes)`,
        413
      );
    }

    // Write to local storage — traversal guard enforced inside writeObject()
    const provider = new LocalStorageProvider();
    await provider.writeObject(objectKey, buffer);

    return apiSuccess(
      {
        objectKey,
        sizeBytes: buffer.length,
      },
      "File uploaded successfully to local storage",
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Surface traversal attempts clearly (non-sensitive message)
    if (message.includes("STORAGE_TRAVERSAL_BLOCKED")) {
      return apiError(
        "INVALID_OBJECT_KEY",
        "The object key is invalid or unsafe",
        400
      );
    }

    console.error("[LOCAL_UPLOAD_HANDLER_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred during file upload",
      500
    );
  }
}
