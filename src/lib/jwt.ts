import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev-only-digital-marketplace";

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
  const defaultOptions: SignOptions = {
    expiresIn: "7d",
    algorithm: "HS256",
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
