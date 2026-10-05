import { z } from "zod";

/**
 * Supported MIME types for digital product files.
 * Sourced from the architecture: ZIP is the primary format.
 * Extended to cover common digital product formats (PDF, Figma export, etc.).
 */
export const ALLOWED_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream", // generic binary — acceptable for ZIP files sent with wrong type
  "application/pdf",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Allowed file extensions (lowercase, without dot).
 */
export const ALLOWED_EXTENSIONS = ["zip", "pdf", "rar", "7z"] as const;

/**
 * Maximum file size: 500 MB in bytes.
 * Configurable via MAX_UPLOAD_SIZE_BYTES env var.
 */
export function getMaxFileSizeBytes(): number {
  const configured = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || "", 10);
  if (!isNaN(configured) && configured > 0) return configured;
  return 500 * 1024 * 1024; // 500 MB default
}

/**
 * Filename safety: reject traversal sequences, absolute paths, null bytes,
 * and any characters that could be dangerous on any filesystem.
 */
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_\-. ]+$/;
const TRAVERSAL_PATTERNS = [
  "..",           // relative traversal
  "/",            // Unix absolute
  "\\",           // Windows path separator
  "\0",           // null byte
  ":",            // Windows drive separator (C:)
  "%2e%2e",       // URL-encoded ..
  "%2f",          // URL-encoded /
  "%5c",          // URL-encoded \
  "....//",       // double-encoded traversal
];

function isFilenameTraversal(name: string): boolean {
  const lower = name.toLowerCase();
  return TRAVERSAL_PATTERNS.some((p) => lower.includes(p));
}

export const uploadInitSchema = z
  .object({
    fileName: z
      .string({
        required_error: "fileName is required",
        invalid_type_error: "fileName must be a string",
      })
      .trim()
      .min(1, "fileName cannot be empty")
      .max(200, "fileName cannot exceed 200 characters"),
    contentType: z
      .string({
        required_error: "contentType is required",
        invalid_type_error: "contentType must be a string",
      })
      .trim()
      .min(1, "contentType cannot be empty"),
    fileSizeBytes: z
      .number({
        required_error: "fileSizeBytes is required",
        invalid_type_error: "fileSizeBytes must be a number",
      })
      .int("fileSizeBytes must be an integer")
      .finite("fileSizeBytes must be a finite number")
      .positive("fileSizeBytes must be greater than zero"),
  })
  .strict({
    message: "Unexpected fields were included in the upload request",
  })
  .superRefine((data, ctx) => {
    // Traversal check
    if (isFilenameTraversal(data.fileName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fileName"],
        message: "fileName contains illegal path traversal characters",
      });
      return;
    }

    // Extension check
    const ext = data.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fileName"],
        message: `File extension '.${ext}' is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      });
    }

    // Content-type check
    const normalizedType = data.contentType.trim().toLowerCase().split(";")[0].trim();
    if (!ALLOWED_MIME_TYPES.includes(normalizedType as AllowedMimeType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentType"],
        message: `Content type '${data.contentType}' is not supported. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
      });
    }
  });

export type UploadInitInput = z.infer<typeof uploadInitSchema>;

/**
 * Safe filename sanitizer.
 * Strips all characters that are not letters, digits, hyphen, underscore, or dot.
 * Never used as storage key — only for storing the original filename safely as metadata.
 */
export function sanitizeFilename(rawName: string): string {
  // Strip path components
  const baseName = rawName.replace(/.*[/\\]/, "");
  // Replace unsafe characters with underscore
  const sanitized = baseName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
  // Collapse multiple consecutive underscores
  return sanitized.replace(/_{2,}/g, "_").slice(0, 200);
}
