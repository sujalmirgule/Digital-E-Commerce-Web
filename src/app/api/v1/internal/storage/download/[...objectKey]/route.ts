import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { LocalStorageProvider } from "@/lib/storage/local-storage-provider";
import { verifyDownloadSignature } from "@/lib/storage/download-signer";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/internal/storage/download/:objectKey
 *
 * Secure private file streaming handler for LocalStorageProvider.
 * Emulates the production AWS S3 / Cloudflare R2 presigned GET URL behavior.
 *
 * Security & Invariants:
 *   - Cryptographically verifies the HMAC-SHA256 signature in the query parameter.
 *   - Strictly validates the expiration timestamp (15-minute TTL).
 *   - Rejects tampered, expired, or malformed download URLs.
 *   - Protects against path traversal via LocalStorageProvider.
 *   - Files are served directly from outside the web root (storage/private/).
 *   - Never exposes server filesystem paths, storageKeys, or credentials.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { objectKey: string[] } }
) {
  try {
    const objectKey = params.objectKey.join("/");

    if (!objectKey || objectKey.trim() === "") {
      return apiError("INVALID_PARAM", "Object key is required", 400);
    }

    // Upfront security guard: reject path traversal and control characters
    if (
      objectKey.includes("..") ||
      objectKey.includes("\0") ||
      objectKey.includes("\r") ||
      objectKey.includes("\n")
    ) {
      return apiError(
        "INVALID_OBJECT_KEY",
        "The object key is invalid or unsafe",
        400
      );
    }

    const { searchParams } = new URL(req.url);
    const expiresParam = searchParams.get("expires");
    const sigParam = searchParams.get("sig");
    const filenameParam = searchParams.get("filename") || undefined;

    if (!expiresParam || !sigParam) {
      return apiError(
        "MALFORMED_URL",
        "Download link is missing required cryptographic signature or expiration",
        400
      );
    }

    const expiresUnix = parseInt(expiresParam, 10);
    if (isNaN(expiresUnix)) {
      return apiError("MALFORMED_URL", "Invalid expiration timestamp in download link", 400);
    }

    // Cryptographic HMAC-SHA256 signature and expiration verification
    const verification = verifyDownloadSignature(
      objectKey,
      expiresUnix,
      sigParam,
      filenameParam
    );

    if (!verification.valid) {
      if (verification.reason === "EXPIRED") {
        return apiError(
          "EXPIRED_URL",
          "This download link has expired. Please request a fresh download URL.",
          403
        );
      }
      return apiError(
        "INVALID_SIGNATURE",
        "The download link signature is invalid or tampered.",
        403
      );
    }

    // Verify object exists in private storage and read bytes
    const provider = new LocalStorageProvider();
    const exists = await provider.objectExists(objectKey);

    if (!exists) {
      return apiError("NOT_FOUND", "The requested file does not exist in storage", 404);
    }

    const buffer = await provider.readObject(objectKey);
    const downloadFilename = filenameParam || "download.bin";

    // Sanitize filename for Content-Disposition header
    const safeFilename = downloadFilename.replace(/["\r\n\\]/g, "_");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("STORAGE_TRAVERSAL_BLOCKED")) {
      return apiError(
        "INVALID_OBJECT_KEY",
        "The object key is invalid or unsafe",
        400
      );
    }

    console.error("[LOCAL_DOWNLOAD_HANDLER_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while streaming the file",
      500
    );
  }
}
