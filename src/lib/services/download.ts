import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage/local-storage-provider";
import { EntitlementStatus } from "@prisma/client";

export interface DownloadAuthResult {
  success: boolean;
  status: number;
  code?: string;
  error?: string;
  data?: {
    downloadUrl: string;
    expiresInSeconds: number;
    expiresAt: string;
    fileName: string;
    contentType: string;
    remainingDownloads: number | "unlimited";
  };
}

/**
 * Authorizes a digital file download for an authenticated buyer.
 *
 * Flow & Invariants:
 *   1. Authenticates buyer and loads ProductFile from database.
 *   2. Authoritatively verifies that the authenticated buyer holds an ACTIVE Entitlement
 *      for the exact Product owning the ProductFile.
 *   3. Enforces download limits (abuse protection) and active status.
 *   4. Creates or updates the official Download record and records an audit DownloadLog.
 *   5. Generates an expiring (15-minute TTL) cryptographic signed download URL.
 *   6. Strictly omits storageKey, filesystem paths, and cloud credentials from responses.
 */
export async function authorizeProductFileDownload({
  userId,
  productFileId,
  ipAddress,
  userAgent,
}: {
  userId: string;
  productFileId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<DownloadAuthResult> {
  // 1. Load ProductFile and associated Product from PostgreSQL
  const productFile = await prisma.productFile.findUnique({
    where: { id: productFileId },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          status: true,
          sellerId: true,
        },
      },
    },
  });

  if (!productFile) {
    return {
      success: false,
      status: 404,
      code: "NOT_FOUND",
      error: `Product file '${productFileId}' not found`,
    };
  }

  // 2. Authoritative Entitlement Verification
  // The buyer must possess an ACTIVE entitlement for the file's parent product
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      buyerId: userId,
      productId: productFile.productId,
      status: EntitlementStatus.ACTIVE,
      isActive: true,
    },
    include: {
      order: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!entitlement) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      error: "You do not own an active entitlement to download this product file",
    };
  }

  // 3. Confirm Product/File relationship binding
  if (entitlement.productId !== productFile.productId) {
    return {
      success: false,
      status: 400,
      code: "PRODUCT_FILE_MISMATCH",
      error: "The requested file does not belong to the entitled product",
    };
  }

  // 4. Download Record Management & Limits
  let download = await prisma.download.findFirst({
    where: {
      orderId: entitlement.orderId,
      buyerId: userId,
      productFileId: productFile.id,
    },
  });

  if (download) {
    // Check if download record is active (e.g. not revoked by refund)
    if (!download.isActive) {
      return {
        success: false,
        status: 403,
        code: "DOWNLOAD_REVOKED",
        error: "Download access for this file has been revoked",
      };
    }

    // Check if download limit is exhausted
    if (
      download.maxDownloads !== null &&
      download.downloadCount >= download.maxDownloads
    ) {
      return {
        success: false,
        status: 403,
        code: "DOWNLOAD_LIMIT_EXCEEDED",
        error: `Download limit (${download.maxDownloads}) has been reached for this file`,
      };
    }

    // Increment download counter
    download = await prisma.download.update({
      where: { id: download.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date(),
      },
    });
  } else {
    // Create initial download record for this purchase
    download = await prisma.download.create({
      data: {
        orderId: entitlement.orderId,
        buyerId: userId,
        productFileId: productFile.id,
        downloadCount: 1,
        maxDownloads: productFile.downloadLimit,
        lastDownloadedAt: new Date(),
        isActive: true,
      },
    });
  }

  // 5. Record DownloadLog for audit tracking
  try {
    await prisma.downloadLog.create({
      data: {
        downloadId: download.id,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[DOWNLOAD_AUDIT_LOG_ERROR]", err);
  }

  // 6. Generate expiring signed download URL via Storage Provider abstraction
  const storageProvider = getStorageProvider();
  if (!storageProvider.authorizeDownload) {
    throw new Error("Storage provider does not implement authorizeDownload");
  }

  const signed = await storageProvider.authorizeDownload({
    objectKey: productFile.storageKey,
    originalFilename: productFile.originalFilename,
    expiresInSeconds: 900, // 15 minutes TTL as specified in API contract
  });

  const remainingDownloads =
    download.maxDownloads !== null
      ? Math.max(0, download.maxDownloads - download.downloadCount)
      : "unlimited";

  return {
    success: true,
    status: 200,
    data: {
      downloadUrl: signed.downloadUrl,
      expiresInSeconds: signed.expiresInSeconds,
      expiresAt: signed.expiresAt,
      fileName: productFile.originalFilename,
      contentType: productFile.mimeType,
      remainingDownloads,
    },
  };
}
