import crypto from "crypto";

const SIGNING_SECRET =
  process.env.STORAGE_SIGNING_SECRET ||
  process.env.JWT_SECRET ||
  "secure-storage-signing-secret-default";

/**
 * Generates an HMAC-SHA256 signature for a private storage object download URL.
 * Binds the objectKey, expiration timestamp, and optional originalFilename.
 */
export function generateDownloadSignature(
  objectKey: string,
  expiresUnix: number,
  originalFilename?: string
): string {
  const normalizedKey = objectKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const payload = `${normalizedKey}|${expiresUnix}|${originalFilename || ""}`;
  return crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(payload)
    .digest("hex");
}

/**
 * Verifies the timing-safe cryptographic signature and expiration of a download URL.
 */
export function verifyDownloadSignature(
  objectKey: string,
  expiresUnix: number,
  signature: string,
  originalFilename?: string
): { valid: boolean; reason?: "EXPIRED" | "INVALID_SIGNATURE" | "MALFORMED" } {
  if (!signature || typeof signature !== "string" || signature.length < 10) {
    return { valid: false, reason: "MALFORMED" };
  }

  // 1. Check timestamp expiration
  const nowUnix = Math.floor(Date.now() / 1000);
  if (nowUnix > expiresUnix) {
    return { valid: false, reason: "EXPIRED" };
  }

  // 2. Compute expected HMAC
  const expectedSignature = generateDownloadSignature(
    objectKey,
    expiresUnix,
    originalFilename
  );

  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return { valid: false, reason: "INVALID_SIGNATURE" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }
}
