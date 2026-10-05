import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication required to access this resource",
        401
      );
    }

    return apiSuccess(
      { user },
      "Authenticated user retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while fetching user profile",
      500
    );
  }
}
