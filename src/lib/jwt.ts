import jwt, { SignOptions } from "jsonwebtoken";

const DEFAULT_DEV_SECRET = "fallback-secret-for-dev-only-digital-marketplace";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;

/**
 * Validates whether a JWT secret meets production entropy requirements.
 * Must be at least 32 characters long and not the development default.
 */
export function isStrongJwtSecret(secret?: string): boolean {
  const s = secret || JWT_SECRET;
  if (!s || s === DEFAULT_DEV_SECRET) return false;
  return s.length >= 32;
}

if (process.env.NODE_ENV === "production" && !isStrongJwtSecret()) {
  console.warn(
    "[SECURITY WARNING] JWT_SECRET in production is weak or using default placeholder! Please set a strong 32+ char secret in .env."
  );
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  [key: string]: unknown;
}


/**
 * Signs a JWT token with standard claims and default expiration of 7 days.
 */
export function signJwt(payload: JwtPayload, options?: SignOptions): string {
  const hasExp = "exp" in payload;
  const defaultOptions: SignOptions = {
    algorithm: "HS256",
    ...(hasExp ? {} : { expiresIn: "7d" }),
  };

  return jwt.sign(payload, JWT_SECRET, {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Verifies a JWT token and returns its decoded payload.
 * Returns null if token is expired, invalid, or signature is tampered.
 */
export function verifyJwt<T extends JwtPayload = JwtPayload>(token: string): T | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return decoded as T;
  } catch {
    return null;
  }
}
