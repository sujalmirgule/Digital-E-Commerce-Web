/**
 * Structured Logger & Error Sanitizer for Production
 *
 * Requirements:
 *   - Structured JSON logs with timestamp, event, level, and requestId.
 *   - Automatic redaction of sensitive credentials (passwords, JWTs, keys, bank accounts, PAN).
 *   - Error message sanitization to prevent leaking SQL queries, Prisma internals, and local paths.
 */

// Keys to recursively redact from logs
const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "token",
  "jwt",
  "secret",
  "razorpaysecret",
  "razorpay_secret",
  "razorpaykeysecret",
  "razorpay_key_secret",
  "secretaccesskey",
  "accesskeyid",
  "storagesecret",
  "storage_secret",
  "downloadsigningsecret",
  "bankaccount",
  "bankaccountnumber",
  "accountnumber",
  "pannumber",
  "pan",
  "authorization",
  "cookie",
  "signature",
]);

/**
 * Redacts sensitive fields recursively from objects/arrays before logging.
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 5 || data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Redact JWT patterns
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(data)) {
      return "[REDACTED_JWT]";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("password") || lowerKey.includes("secret")) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeLogData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Sanitizes error messages for public client consumption in production.
 * Strips database schemas, file system paths, SQL statements, and stack traces.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  if (!rawMessage) return "An unexpected error occurred.";

  // If in non-production, return as is unless it's a raw secret
  if (process.env.NODE_ENV !== "production") {
    return rawMessage;
  }

  // Detect sensitive keywords that should never be in client error messages
  const isPrismaOrDb =
    rawMessage.includes("prisma") ||
    rawMessage.includes("SELECT") ||
    rawMessage.includes("INSERT") ||
    rawMessage.includes("UPDATE") ||
    rawMessage.includes("DELETE") ||
    rawMessage.includes("relation") ||
    rawMessage.includes("table") ||
    rawMessage.includes("column") ||
    rawMessage.includes("Unique constraint failed") ||
    rawMessage.includes("Foreign key constraint failed");

  const hasFileSystemPath =
    /([a-zA-Z]:\\[^\s]+|\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)/.test(rawMessage);

  if (isPrismaOrDb || hasFileSystemPath || rawMessage.includes("at ")) {
    return "A database or system error occurred. Please try again or contact support.";
  }

  return rawMessage;
}

export interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  event: string;
  requestId?: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

class StructuredLogger {
  private formatLog(
    level: "INFO" | "WARN" | "ERROR",
    event: string,
    context?: Record<string, unknown>,
    error?: unknown
  ): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      context: context ? (sanitizeLogData(context) as Record<string, unknown>) : undefined,
    };

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          // Only log stack trace server-side, never send to client
          stack: error.stack,
        };
      } else {
        entry.error = {
          message: String(error),
        };
      }
    }

    return JSON.stringify(entry);
  }

  info(event: string, context?: Record<string, unknown>): void {
    console.log(this.formatLog("INFO", event, context));
  }

  warn(event: string, context?: Record<string, unknown>): void {
    console.warn(this.formatLog("WARN", event, context));
  }

  error(event: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(this.formatLog("ERROR", event, context, error));
  }
}

export const logger = new StructuredLogger();
