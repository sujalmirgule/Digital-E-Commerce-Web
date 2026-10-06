import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt, JwtPayload } from "@/lib/jwt";
import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  hasSellerProfile: boolean;
  sellerStatus: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export type AuthResult =
  | { user: AuthenticatedUser; error: null; status: 200 }
  | { user: null; error: { code: string; message: string }; status: 401 | 403 };

/**
 * Extracts and verifies Bearer token, distinguishing between authentication failures (401)
 * and inactive / suspended accounts (403).
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  let token: string | null = null;
  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
      return {
        user: null,
        error: { code: "UNAUTHORIZED", message: "Invalid authorization header format" },
        status: 401,
      };
    }
    token = parts[1].trim();
  } else {
    const queryToken = req.nextUrl?.searchParams?.get("token");
    const cookieToken = req.cookies?.get("auth_token")?.value;
    token = (queryToken && queryToken.trim()) || (cookieToken && cookieToken.trim()) || null;
  }

  if (!token) {
    return {
      user: null,
      error: { code: "UNAUTHORIZED", message: "Authentication is required" },
      status: 401,
    };
  }

  const payload = verifyJwt<JwtPayload>(token);
  if (!payload || !payload.sub) {
    return {
      user: null,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired authentication token" },
      status: 401,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        avatarUrl: true,
        createdAt: true,
        sellerProfile: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return {
        user: null,
        error: { code: "UNAUTHORIZED", message: "Authenticated user not found" },
        status: 401,
      };
    }

    if (!user.isActive) {
      return {
        user: null,
        error: { code: "FORBIDDEN", message: "Your account is inactive or suspended." },
        status: 403,
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        hasSellerProfile: !!user.sellerProfile,
        sellerStatus: user.sellerProfile?.status ?? null,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      error: null,
      status: 200,
    };
  } catch (error) {
    console.error("[AUTH_MIDDLEWARE_ERROR]", error);
    return {
      user: null,
      error: { code: "UNAUTHORIZED", message: "Authentication verification failed" },
      status: 401,
    };
  }
}

/**
 * Extracts and verifies the Bearer token from the request Authorization header.
 * Queries the database to guarantee the user exists and the account is active.
 * Returns the safe AuthenticatedUser or null if authentication fails.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const auth = await authenticateRequest(req);
  return auth.user;
}

/**
 * Verifies that the request is authenticated AND the user possesses the ADMIN role in PostgreSQL.
 * Returns AuthenticatedUser if admin, or null otherwise.
 */
export async function getAuthenticatedAdmin(req: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}

export interface AuthenticatedSeller {
  user: AuthenticatedUser;
  /** The SellerProfile.id (not the User.id) — use for product ownership checks. */
  sellerProfileId: string;
}

/**
 * Verifies that the request is authenticated, the user has an APPROVED SellerProfile,
 * and the account is active. Returns both the user and the SellerProfile id.
 * Returns null on any failure — caller must return 401/403 as appropriate.
 */
export async function getAuthenticatedSeller(
  req: NextRequest
): Promise<AuthenticatedSeller | null> {
  const user = await getAuthenticatedUser(req);
  if (!user || !user.isActive) return null;
  if (!user.hasSellerProfile || user.sellerStatus !== "APPROVED") return null;

  // Re-fetch sellerProfile.id directly — we only stored status in AuthenticatedUser.
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== "APPROVED") return null;
    return { user, sellerProfileId: profile.id };
  } catch {
    return null;
  }
}
