/**
 * LocalStorageProvider — Development-only private file storage implementation.
 *
 * Files are stored on the local filesystem under:
 *   <project_root>/storage/private/
 *
 * SECURITY:
 *   - This directory is OUTSIDE the Next.js public/ directory.
 *   - Files stored here are NOT served by Next.js static file serving.
 *   - The server-generated object key determines the file path.
 *   - Path traversal is prevented: the resolved path must remain inside STORAGE_ROOT.
 *   - The original filename is NEVER used as the filesystem path.
 *
 * Upload flow for local provider:
 *   1. Server generates objectKey → returns uploadUrl pointing to a local API endpoint.
 *   2. Client PUTs the raw file bytes to that endpoint.
 *   3. Server writes bytes to STORAGE_ROOT/<objectKey>.
 *   4. Completion endpoint verifies the file exists at the expected path.
 *
 * R2/S3 migration:
 *   Replace this file with R2StorageProvider implementing the same StorageProvider interface.
 *   No other code changes are required.
 */

import path from "path";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import type { StorageProvider, UploadAuthorization, ObjectMetadata } from "./storage-provider";

// Storage root: <project_root>/storage/private/
// This path is resolved at module load time so all methods use the same anchor.
const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "private");

// Ensure the storage root exists on startup.
// mkdirSync with recursive:true is idempotent — safe to call multiple times.
function ensureStorageRoot(): void {
  if (!existsSync(STORAGE_ROOT)) {
    mkdirSync(STORAGE_ROOT, { recursive: true });
  }
}

/**
 * Resolve the absolute filesystem path for a given objectKey.
 * Throws if the resolved path would escape the STORAGE_ROOT (path traversal guard).
 */
function resolveStoragePath(objectKey: string): string {
  // Reject null bytes and carriage returns
  if (objectKey.includes("\0") || objectKey.includes("\r") || objectKey.includes("\n")) {
    throw new Error(
      `[STORAGE_TRAVERSAL_BLOCKED] Object key contains illegal control characters`
    );
  }

  // Normalize the key: remove leading slashes, convert backslashes.
  const normalizedKey = objectKey.replace(/\\/g, "/").replace(/^\/+/, "");

  // Resolve to absolute path anchored at STORAGE_ROOT.
  const resolved = path.resolve(STORAGE_ROOT, normalizedKey);

  // SECURITY: Verify the resolved path starts with STORAGE_ROOT.
  // Case-insensitive comparison handles Windows drive letters and case variations safely.
  const resolvedLower = resolved.toLowerCase();
  const rootLower = STORAGE_ROOT.toLowerCase();
  const rootWithSepLower = (STORAGE_ROOT + path.sep).toLowerCase();

  if (!resolvedLower.startsWith(rootWithSepLower) && resolvedLower !== rootLower) {
    throw new Error(
      `[STORAGE_TRAVERSAL_BLOCKED] Object key '${objectKey}' resolves outside storage root`
    );
  }

  return resolved;
}

export class LocalStorageProvider implements StorageProvider {
  constructor() {
    ensureStorageRoot();
  }

  async authorizeUpload(params: {
    objectKey: string;
    contentType: string;
    fileSizeBytes: number;
    expiresInSeconds?: number;
  }): Promise<UploadAuthorization> {
    const { objectKey, expiresInSeconds = 900 } = params;

    // Validate the key resolves safely — throws on traversal attempt.
    resolveStoragePath(objectKey);

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return {
      objectKey,
      // Local upload endpoint — client PUTs file bytes here.
      uploadUrl: `${appUrl}/api/v1/internal/storage/upload/${encodeURIComponent(objectKey)}`,
      expiresAt,
      provider: "local",
    };
  }

  async objectExists(objectKey: string): Promise<boolean> {
    try {
      const filePath = resolveStoragePath(objectKey);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getObjectMetadata(objectKey: string): Promise<ObjectMetadata | null> {
    try {
      const filePath = resolveStoragePath(objectKey);
      const stat = await fs.stat(filePath);
      return {
        sizeBytes: stat.size,
        contentType: "application/octet-stream", // Local provider does not store content-type separately.
        lastModified: stat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    try {
      const filePath = resolveStoragePath(objectKey);
      await fs.unlink(filePath);
    } catch {
      // Idempotent — ignore if file doesn't exist.
    }
  }

  /**
   * Directly write raw bytes to the local store at the given objectKey.
   * Implements the StorageProvider.putObject interface method.
   */
  async putObject(objectKey: string, data: Buffer, _contentType?: string): Promise<void> {
    await this.writeObject(objectKey, data);
  }

  /**
   * Write raw bytes to the local store at the given objectKey.
   * Called by the internal upload handler — NOT part of the StorageProvider interface
   * because cloud providers handle bytes directly via presigned URLs.
   *
   * SECURITY:
   *   - resolveStoragePath enforces traversal protection.
   *   - Directories along the path are created safely inside STORAGE_ROOT.
   */
  async writeObject(objectKey: string, data: Buffer): Promise<void> {
    const filePath = resolveStoragePath(objectKey);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, data);
  }

  /**
   * Generate download authorization for local development.
   * Implements future compatibility for buyer downloads.
   */
  async authorizeDownload(params: {
    objectKey: string;
    originalFilename?: string;
    expiresInSeconds?: number;
  }): Promise<{ downloadUrl: string; expiresAt: string; provider: string }> {
    const { objectKey, expiresInSeconds = 900 } = params;
    resolveStoragePath(objectKey);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return {
      downloadUrl: `${appUrl}/api/v1/internal/storage/download/${encodeURIComponent(objectKey)}`,
      expiresAt,
      provider: "local",
    };
  }
}

// ---------------------------------------------------------------------------
// Future R2 provider slot
// ---------------------------------------------------------------------------
// export class R2StorageProvider implements StorageProvider {
//   async authorizeUpload(params) { /* generate presigned R2 PUT URL */ }
//   async objectExists(objectKey) { /* HeadObject R2 */ }
//   async getObjectMetadata(objectKey) { /* HeadObject R2 */ }
//   async deleteObject(objectKey) { /* DeleteObject R2 */ }
// }

// ---------------------------------------------------------------------------
// Provider factory — change STORAGE_PROVIDER env var to switch implementations.
// ---------------------------------------------------------------------------
let _providerInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_providerInstance) return _providerInstance;

  const providerName = process.env.STORAGE_PROVIDER || "local";

  switch (providerName) {
    case "local":
      _providerInstance = new LocalStorageProvider();
      break;
    // case "r2":
    //   _providerInstance = new R2StorageProvider();
    //   break;
    default:
      console.warn(
        `[STORAGE] Unknown provider '${providerName}', falling back to LocalStorageProvider`
      );
      _providerInstance = new LocalStorageProvider();
  }

  return _providerInstance;
}
