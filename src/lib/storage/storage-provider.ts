/**
 * Storage Abstraction Layer for Digital Marketplace
 *
 * This interface defines the provider-agnostic contract for private object storage.
 * Business logic, authorization, and database layer must only depend on this interface,
 * never on provider-specific SDKs (Cloudflare R2, AWS S3, filesystem, etc.).
 *
 * Current implementations:
 *   - LocalStorageProvider  (development/testing — no cloud credentials required)
 *
 * Future implementations:
 *   - R2StorageProvider     (Cloudflare R2 — production)
 *   - S3StorageProvider     (AWS S3 — alternative production)
 *
 * To switch providers: change the factory in getStorageProvider() — zero business logic changes.
 */

export interface UploadAuthorization {
  /** The server-generated object key (never client-controlled) */
  objectKey: string;
  /**
   * For cloud providers: a presigned PUT URL valid for a short window.
   * For local provider: a backend upload endpoint URL.
   */
  uploadUrl: string;
  /** ISO timestamp when the authorization expires */
  expiresAt: string;
  /** Storage provider identifier e.g. "local", "r2", "s3" */
  provider: string;
}

export interface ObjectMetadata {
  /** Actual size in bytes confirmed by storage layer */
  sizeBytes: number;
  /** Content-Type as stored */
  contentType: string;
  /** ISO timestamp of last modification */
  lastModified: string;
}

export interface StorageProvider {
  /**
   * Generate upload authorization for a client to upload a file.
   * The server determines the objectKey — the client MUST NOT supply it.
   */
  authorizeUpload(params: {
    objectKey: string;
    contentType: string;
    fileSizeBytes: number;
    expiresInSeconds?: number;
  }): Promise<UploadAuthorization>;

  /**
   * Directly write/create an object in storage.
   * Useful for programmatic uploads, seed scripts, or internal handlers.
   */
  putObject(
    objectKey: string,
    data: Buffer,
    contentType?: string
  ): Promise<void>;

  /**
   * Verify that an object actually exists in storage.
   * MUST be called before marking an upload complete in the database.
   */
  objectExists(objectKey: string): Promise<boolean>;

  /**
   * Retrieve metadata for an existing object (size, content-type, etc.).
   * Returns null if the object does not exist.
   */
  getObjectMetadata(objectKey: string): Promise<ObjectMetadata | null>;

  /**
   * Delete an object from storage.
   * Used for cleanup of replaced/orphaned uploads.
   */
  deleteObject(objectKey: string): Promise<void>;

  /**
   * Generate download authorization for authorized consumers (e.g. buyers).
   * For cloud providers: returns a short-lived presigned GET URL with Content-Disposition.
   * For local provider: returns an internal secure streaming URL.
   */
  authorizeDownload?(params: {
    objectKey: string;
    originalFilename?: string;
    expiresInSeconds?: number;
  }): Promise<{
    downloadUrl: string;
    expiresAt: string;
    expiresInSeconds: number;
    provider: string;
  }>;
}
