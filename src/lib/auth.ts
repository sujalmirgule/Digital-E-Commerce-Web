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

/**
 * Extracts and verifies the Bearer token from the request Authorization header.
 * Queries the database to guarantee the user exists and the account is active.
 * Returns the safe AuthenticatedUser or null if authentication fails.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  // Must follow "Bearer <token>" format
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    return null;
  }

  const token = parts[1].trim();
  const payload = verifyJwt<JwtPayload>(token);
  if (!payload || !payload.sub) {
    return null;
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

    // Check account existence and active status
    if (!user || !user.isActive) {
      return null;
    }

    return {
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
    };
  } catch (error) {
    console.error("[AUTH_MIDDLEWARE_ERROR]", error);
    return null;
  }
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
