import crypto from "crypto";
import { sanitizeFilename } from "@/lib/validations/upload";

/**
 * Generate a secure, collision-resistant storage object key for a product asset.
 *
 * Structure:
 *   products/<productId>/<randomId>/<sanitized-filename>
 *
 * Properties:
 *   - productId comes from server-side ownership verification (never client-supplied).
 *   - randomId is 16 cryptographically random hex bytes (128-bit entropy).
 *   - The original filename is sanitized and used only to preserve the extension for
 *     future content-type negotiation. It does NOT control the storage namespace.
 *   - No client-provided values determine the storage path.
 *
 * @param productId  Server-verified product ID from the authenticated seller's profile.
 * @param originalFilename  Raw filename from client — sanitized before use.
 * @returns  A safe, server-generated object key.
 */
export function generateObjectKey(productId: string, originalFilename: string): string {
  const randomId = crypto.randomBytes(16).toString("hex");
  const safeFilename = sanitizeFilename(originalFilename);

  // Preserve extension for content negotiation, but sanitize everything else.
  const ext = safeFilename.split(".").pop()?.toLowerCase() ?? "bin";
  const baseName = `file.${ext}`;

  return `products/${productId}/${randomId}/${baseName}`;
}
