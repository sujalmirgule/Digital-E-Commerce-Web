/**
 * S3StorageProvider — Production-grade AWS S3 / Cloudflare R2 private storage provider.
 *
 * Implements the StorageProvider interface using AWS Signature Version 4.
 * Compatible with:
 *   - Cloudflare R2 (S3-compatible API)
 *   - AWS S3
 *   - MinIO / self-hosted S3-compatible object stores
 *
 * SECURITY:
 *   - All objects are strictly PRIVATE in the bucket (no public access).
 *   - Presigned upload PUT URLs expire in 15 minutes (900 seconds).
 *   - Presigned download GET URLs expire in 15 minutes (900 seconds) and inject
 *     Content-Disposition: attachment for safe file downloads.
 *   - Credentials (access keys, secret keys) are NEVER returned to clients or logged.
 */

import crypto from "crypto";
import type {
  StorageProvider,
  UploadAuthorization,
  ObjectMetadata,
} from "./storage-provider";

export interface S3StorageConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

export class S3StorageProvider implements StorageProvider {
  private endpoint: string;
  private bucket: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

  constructor(config?: Partial<S3StorageConfig>) {
    // Read from config or standard environment variables
    this.endpoint = (
      config?.endpoint ||
      process.env.STORAGE_ENDPOINT ||
      process.env.R2_BUCKET_ENDPOINT ||
      "https://example-account-id.r2.cloudflarestorage.com"
    ).replace(/\/+$/, "");

    this.bucket =
      config?.bucket ||
      process.env.STORAGE_BUCKET ||
      process.env.R2_BUCKET_NAME ||
      "marketplace-private-assets";

    this.accessKeyId =
      config?.accessKeyId ||
      process.env.STORAGE_ACCESS_KEY ||
      process.env.R2_ACCESS_KEY_ID ||
      process.env.AWS_ACCESS_KEY_ID ||
      "";

    this.secretAccessKey =
      config?.secretAccessKey ||
      process.env.STORAGE_SECRET_KEY ||
      process.env.R2_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      "";

    this.region =
      config?.region ||
      process.env.STORAGE_REGION ||
      (this.endpoint.includes("r2.cloudflarestorage.com") ? "auto" : "us-east-1");
  }

  /**
   * Generates AWS SigV4 signing key.
   */
  private getSignatureKey(dateStamp: string): Buffer {
    const kDate = crypto
      .createHmac("sha256", "AWS4" + this.secretAccessKey)
      .update(dateStamp)
      .digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(this.region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    return kSigning;
  }

  /**
   * Generates a presigned URL using AWS Signature Version 4 query parameters.
   */
  public generatePresignedUrl(params: {
    method: "PUT" | "GET";
    objectKey: string;
    expiresInSeconds?: number;
    extraQueryParams?: Record<string, string>;
  }): { url: string; expiresAt: string } {
    const { method, objectKey, expiresInSeconds = 900, extraQueryParams = {} } = params;

    const normalizedKey = objectKey.replace(/\\/g, "/").replace(/^\/+/, "");
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000).toISOString();

    const host = new URL(this.endpoint).host;
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${this.accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expiresInSeconds),
      "X-Amz-SignedHeaders": "host",
      ...extraQueryParams,
    };

    // Sort query parameters alphabetically for canonical query string
    const sortedKeys = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedKeys
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`
      )
      .join("&");

    const canonicalUri = `/${this.bucket}/${normalizedKey}`;
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = this.getSignatureKey(dateStamp);
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const finalUrl = `${this.endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    return { url: finalUrl, expiresAt };
  }

  /**
   * Authorize a client upload by returning a short-lived presigned PUT URL.
   */
  async authorizeUpload(params: {
    objectKey: string;
    contentType: string;
    fileSizeBytes: number;
    expiresInSeconds?: number;
  }): Promise<UploadAuthorization> {
    const { objectKey, expiresInSeconds = 900 } = params;

    const { url, expiresAt } = this.generatePresignedUrl({
      method: "PUT",
      objectKey,
      expiresInSeconds,
    });

    return {
      objectKey,
      uploadUrl: url,
      expiresAt,
      provider: "s3",
    };
  }

  /**
   * Authorize a secure file download by returning a short-lived presigned GET URL.
   * Enforces attachment Content-Disposition to prevent browser execution of arbitrary files.
   */
  async authorizeDownload(params: {
    objectKey: string;
    originalFilename?: string;
    expiresInSeconds?: number;
  }): Promise<{
    downloadUrl: string;
    expiresAt: string;
    expiresInSeconds: number;
    provider: string;
  }> {
    const { objectKey, originalFilename, expiresInSeconds = 900 } = params;

    const extraQueryParams: Record<string, string> = {};
    if (originalFilename) {
      const sanitizedFilename = originalFilename.replace(/["\r\n]/g, "_");
      extraQueryParams["response-content-disposition"] = `attachment; filename="${sanitizedFilename}"`;
    }

    const { url, expiresAt } = this.generatePresignedUrl({
      method: "GET",
      objectKey,
      expiresInSeconds,
      extraQueryParams,
    });

    return {
      downloadUrl: url,
      expiresAt,
      expiresInSeconds,
      provider: "s3",
    };
  }

  /**
   * Direct write to storage.
   */
  async putObject(
    objectKey: string,
    data: Buffer,
    contentType = "application/octet-stream"
  ): Promise<void> {
    const normalizedKey = objectKey.replace(/\\/g, "/").replace(/^\/+/, "");
    const url = `${this.endpoint}/${this.bucket}/${normalizedKey}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const host = new URL(this.endpoint).host;
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const payloadHash = crypto.createHash("sha256").update(data).digest("hex");
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "PUT",
      `/${this.bucket}/${normalizedKey}`,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = this.getSignatureKey(dateStamp);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        Authorization: authHeader,
      },
      body: new Uint8Array(data),
    });


    if (!response.ok) {
      throw new Error(`[S3_PUT_FAILED] Failed to put object: HTTP ${response.status}`);
    }
  }

  /**
   * Check if object exists via HEAD request.
   */
  async objectExists(objectKey: string): Promise<boolean> {
    const metadata = await this.getObjectMetadata(objectKey);
    return metadata !== null;
  }

  /**
   * Get metadata for an object via HEAD request.
   */
  async getObjectMetadata(objectKey: string): Promise<ObjectMetadata | null> {
    const normalizedKey = objectKey.replace(/\\/g, "/").replace(/^\/+/, "");
    const url = `${this.endpoint}/${this.bucket}/${normalizedKey}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const host = new URL(this.endpoint).host;
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // SHA256 of empty string
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "HEAD",
      `/${this.bucket}/${normalizedKey}`,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = this.getSignatureKey(dateStamp);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          "x-amz-date": amzDate,
          "x-amz-content-sha256": payloadHash,
          Authorization: authHeader,
        },
      });

      if (response.status === 404) return null;
      if (!response.ok) return null;

      const sizeBytes = parseInt(response.headers.get("content-length") || "0", 10);
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const lastModified = response.headers.get("last-modified") || new Date().toISOString();

      return {
        sizeBytes,
        contentType,
        lastModified,
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete object.
   */
  async deleteObject(objectKey: string): Promise<void> {
    const normalizedKey = objectKey.replace(/\\/g, "/").replace(/^\/+/, "");
    const url = `${this.endpoint}/${this.bucket}/${normalizedKey}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const host = new URL(this.endpoint).host;
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "DELETE",
      `/${this.bucket}/${normalizedKey}`,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = this.getSignatureKey(dateStamp);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    await fetch(url, {
      method: "DELETE",
      headers: {
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        Authorization: authHeader,
      },
    }).catch(() => {
      // Best-effort deletion
    });
  }
}
